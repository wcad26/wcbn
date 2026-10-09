import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit2,
  Key,
  Landmark,
  Layers,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/wcbn";
import {
  fetchCategories,
  fetchPaymentSettings,
  getCategoryArchetype,
  archetypeLabel,
  type BankAccount,
  type Category,
  type CategoryArchetype,
} from "@/lib/fees";
import {
  flutterwaveKeyStatus,
  updatePaymentGatewaySettings,
} from "@/lib/payments.functions";

type SettingsTab = "categories" | "payments" | "roles";

export const Route = createFileRoute("/admin/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => {
    const tab = search.tab as SettingsTab | undefined;
    if (tab === "categories" || tab === "payments" || tab === "roles") {
      return { tab };
    }
    return { tab: "categories" };
  },
  component: AdminSettingsPage,
});

/* -------------------------------------------------------------------------- */
/*                                CATEGORIES TYPES                            */
/* -------------------------------------------------------------------------- */

type CategoryForm = {
  id?: string;
  code: string;
  name: string;
  description: string;
  target_audience: string;
  applicant_type: "business" | "professional" | "investor_mentor" | "entrepreneur" | "any";
  fees: { currency: string; amount: number }[];
  benefits: string[];
  allow_installments: boolean;
  display_order: number;
  is_active: boolean;
};

const DEFAULT_CATEGORY_FORM: CategoryForm = {
  code: "",
  name: "",
  description: "",
  target_audience: "",
  applicant_type: "any",
  fees: [
    { currency: "XAF", amount: 25000 },
    { currency: "USD", amount: 50 },
    { currency: "EUR", amount: 45 },
  ],
  benefits: [],
  allow_installments: true,
  display_order: 1,
  is_active: true,
};

/* -------------------------------------------------------------------------- */
/*                               MAIN SETTINGS PAGE                           */
/* -------------------------------------------------------------------------- */

function AdminSettingsPage() {
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState<SettingsTab>(search.tab || "categories");

  return (
    <AdminPage
      title="Admin Portal Settings"
      description="Manage membership tiers, fee schedules, Flutterwave gateway credentials, official bank transfer accounts, and leadership portal permissions."
    >
      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "categories"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Layers className="size-4" />
            <span>Membership Categories & Dues</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "payments"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <CreditCard className="size-4" />
            <span>Payment Gateways & Accounts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "roles"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>Roles & Access Permissions</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "categories" && <CategoriesTabContent />}
        {activeTab === "payments" && <PaymentsTabContent />}
        {activeTab === "roles" && <RolesTabContent />}
      </div>
    </AdminPage>
  );
}

/* -------------------------------------------------------------------------- */
/*                          1. CATEGORIES TAB CONTENT                         */
/* -------------------------------------------------------------------------- */

function CategoriesTabContent() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(DEFAULT_CATEGORY_FORM);
  const [newBenefit, setNewBenefit] = useState("");
  const [filterArchetype, setFilterArchetype] = useState<"all" | CategoryArchetype>("all");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => fetchCategories(true),
  });

  const entrepreneurCount = categories.filter((c) => getCategoryArchetype(c) === "entrepreneur").length;
  const investorCount = categories.filter((c) => getCategoryArchetype(c) === "investor_mentor").length;

  const visibleCategories = categories.filter((c) => {
    if (filterArchetype === "all") return true;
    return getCategoryArchetype(c) === filterArchetype;
  });

  const saveMutation = useMutation({
    mutationFn: async (cat: CategoryForm) => {
      const feesRecord: Record<string, number> = {};
      cat.fees.forEach((f) => {
        if (f.currency && f.amount > 0) {
          feesRecord[f.currency.toUpperCase()] = Number(f.amount);
        }
      });

      const payload = {
        code: cat.code.trim().toLowerCase(),
        name: cat.name.trim(),
        description: cat.description.trim() || null,
        target_audience: cat.target_audience.trim() || null,
        applicant_type: cat.applicant_type,
        fees: feesRecord,
        benefits: cat.benefits.filter((b) => b.trim().length > 0),
        allow_installments: cat.allow_installments,
        display_order: cat.display_order,
        is_active: cat.is_active,
      };

      if (cat.id) {
        const { error } = await supabase.from("wcbn_membership_categories").update(payload).eq("id", cat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_membership_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Membership category saved successfully.");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["wcbn", "categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("wcbn_membership_categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["wcbn", "categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpenAdd = () => {
    setForm({
      ...DEFAULT_CATEGORY_FORM,
      display_order: categories.length + 1,
    });
    setNewBenefit("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    const feesArray = Object.entries(c.fees || {}).map(([currency, amount]) => ({
      currency,
      amount: Number(amount),
    }));

    setForm({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description || "",
      target_audience: c.target_audience || "",
      applicant_type: c.applicant_type,
      fees: feesArray.length > 0 ? feesArray : [{ currency: "XAF", amount: 0 }],
      benefits: Array.isArray(c.benefits) ? [...c.benefits] : [],
      allow_installments: c.allow_installments,
      display_order: c.display_order,
      is_active: c.is_active,
    });
    setNewBenefit("");
    setDialogOpen(true);
  };

  const handleAddFeeRow = () => {
    setForm((f) => ({
      ...f,
      fees: [...f.fees, { currency: "USD", amount: 0 }],
    }));
  };

  const handleRemoveFeeRow = (index: number) => {
    setForm((f) => ({
      ...f,
      fees: f.fees.filter((_, i) => i !== index),
    }));
  };

  const handleFeeChange = (index: number, field: "currency" | "amount", val: string | number) => {
    setForm((f) => {
      const updated = [...f.fees];
      const current = updated[index] ?? { currency: "USD", amount: 0 };
      updated[index] = {
        currency: field === "currency" ? String(val) : current.currency,
        amount: field === "amount" ? Number(val) : current.amount,
      };
      return { ...f, fees: updated };
    });
  };

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    setForm((f) => ({ ...f, benefits: [...f.benefits, newBenefit.trim()] }));
    setNewBenefit("");
  };

  const handleRemoveBenefit = (index: number) => {
    setForm((f) => ({ ...f, benefits: f.benefits.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-6">
      {/* Subheader and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Configured Membership Categories</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure dynamic tracks, multi-currency fee schedules, installment allowances, and perks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Archetype Filter */}
          <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border text-xs">
            <button
              type="button"
              onClick={() => setFilterArchetype("all")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                filterArchetype === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterArchetype("entrepreneur")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                filterArchetype === "entrepreneur" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🚀 Entrepreneurs ({entrepreneurCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterArchetype("investor_mentor")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                filterArchetype === "investor_mentor" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💎 Investors ({investorCount})
            </button>
          </div>

          <Button size="sm" onClick={handleOpenAdd} className="h-8 text-xs gap-1.5 font-semibold">
            <Plus className="size-3.5" /> Add Category
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No categories found matching filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase tracking-wider text-[11px] text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3.5 font-semibold">Order</th>
                  <th className="p-3.5 font-semibold">Category & Code</th>
                  <th className="p-3.5 font-semibold">Track Archetype</th>
                  <th className="p-3.5 font-semibold">Fee Structure</th>
                  <th className="p-3.5 font-semibold text-center">Installments</th>
                  <th className="p-3.5 font-semibold text-center">Status</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleCategories.map((cat) => {
                  const archetype = getCategoryArchetype(cat);
                  const feeEntries = Object.entries(cat.fees || {});
                  return (
                    <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 font-mono text-muted-foreground font-semibold">
                        #{cat.display_order}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-foreground text-xs">{cat.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{cat.code}</div>
                        {cat.target_audience && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 italic">
                            {cat.target_audience}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={
                            archetype === "investor_mentor"
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                              : "bg-primary/10 text-primary border-primary/20"
                          }
                        >
                          {archetypeLabel(archetype)}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {feeEntries.map(([currency, amt]) => (
                            <span
                              key={currency}
                              className="font-mono text-[10px] font-semibold bg-muted px-1.5 py-0.5 rounded border border-border"
                            >
                              {currency} {Number(amt).toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant={cat.allow_installments ? "secondary" : "outline"} className="text-[10px]">
                          {cat.allow_installments ? "Allowed" : "Annual Only"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center">
                        <Switch
                          checked={cat.is_active}
                          onCheckedChange={(checked) => toggleActive.mutate({ id: cat.id, is_active: checked })}
                        />
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(cat)}
                          className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                        >
                          <Edit2 className="size-3" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4 text-primary" />
              {form.id ? "Edit Membership Category" : "Add Membership Category"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure code, target archetype, annual fee schedule across currencies, and included member benefits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Established Corporate"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">System Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. established_corporate"
                  className="h-8 text-xs font-mono"
                  disabled={Boolean(form.id)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Leadership Track / Archetype</Label>
                <select
                  value={form.applicant_type}
                  onChange={(e) => setForm({ ...form, applicant_type: e.target.value as any })}
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="business">🚀 Entrepreneur Track (Commercial ventures)</option>
                  <option value="professional">💎 Investor & Mentor Track</option>
                  <option value="any">Open / Both</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description & Scope</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="High-level summary of who fits this category..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Target Audience / Criteria Note</Label>
              <Input
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                placeholder="e.g. Annual turnover > $100k or 10+ employees"
                className="h-8 text-xs"
              />
            </div>

            {/* Fee Schedule */}
            <div className="rounded-xl border border-border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Annual Fee Schedule</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddFeeRow} className="h-6 text-[10px] gap-1">
                  <Plus className="size-2.5" /> Add Currency
                </Button>
              </div>

              <div className="space-y-2">
                {form.fees.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={f.currency}
                      onChange={(e) => handleFeeChange(i, "currency", e.target.value)}
                      placeholder="Currency (e.g. USD)"
                      className="h-7 w-28 text-xs uppercase font-mono font-bold"
                    />
                    <Input
                      type="number"
                      value={f.amount}
                      onChange={(e) => handleFeeChange(i, "amount", e.target.value)}
                      placeholder="Amount"
                      className="h-7 text-xs font-mono"
                    />
                    {form.fees.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFeeRow(i)}
                        className="h-7 size-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Installments & Active Toggles */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="installments"
                  checked={form.allow_installments}
                  onCheckedChange={(checked) => setForm({ ...form, allow_installments: checked })}
                />
                <Label htmlFor="installments" className="text-xs cursor-pointer">
                  Allow semi-annual / quarterly installments
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label htmlFor="active" className="text-xs cursor-pointer">
                  Active for Onboarding
                </Label>
              </div>
            </div>

            {/* Member Benefits */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold">Included Member Benefits</Label>
              <div className="flex gap-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Add a perk or benefit..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBenefit();
                    }
                  }}
                />
                <Button type="button" size="sm" onClick={handleAddBenefit} className="h-8 text-xs">
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.benefits.map((b, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[11px] gap-1 pr-1 font-normal">
                    {b}
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(idx)}
                      className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(form)}
              className="text-xs gap-1"
            >
              {saveMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           2. PAYMENTS TAB CONTENT                          */
/* -------------------------------------------------------------------------- */

function PaymentsTabContent() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "payment-settings"],
    queryFn: fetchPaymentSettings,
  });

  const { data: keyStatus } = useQuery({
    queryKey: ["admin", "flutterwave-key-status"],
    queryFn: () => flutterwaveKeyStatus(),
  });

  const [flutterwaveEnabled, setFlutterwaveEnabled] = useState(false);
  const [flutterwaveMode, setFlutterwaveMode] = useState<"test" | "live">("test");
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [mobileMoneyEnabled, setMobileMoneyEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [bankTransferEnabled, setBankTransferEnabled] = useState(true);
  const [invoiceNote, setInvoiceNote] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Bank Dialog
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [bankForm, setBankForm] = useState<BankAccount>({
    bank_name: "",
    account_name: "",
    account_number: "",
    currency: "XAF",
    swift: "",
    branch: "",
    instructions: "",
  });

  useEffect(() => {
    if (settings) {
      setFlutterwaveEnabled(settings.flutterwave_enabled ?? false);
      setFlutterwaveMode(settings.flutterwave_mode ?? "test");
      setPublicKey(settings.flutterwave_public_key ?? "");
      setMobileMoneyEnabled(settings.mobile_money_enabled ?? true);
      setCardEnabled(settings.card_enabled ?? true);
      setBankTransferEnabled(settings.bank_transfer_enabled ?? true);
      setInvoiceNote(settings.invoice_note ?? "");
      setBankAccounts(Array.isArray(settings.bank_accounts) ? settings.bank_accounts : []);
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      await updatePaymentGatewaySettings({
        data: {
          flutterwave_enabled: flutterwaveEnabled,
          flutterwave_mode: flutterwaveMode,
          flutterwave_public_key: publicKey.trim() || null,
          flutterwave_secret_key: secretKey.trim() || null,
          supabase_service_role_key: serviceRoleKey.trim() || null,
          mobile_money_enabled: mobileMoneyEnabled,
          card_enabled: cardEnabled,
          bank_transfer_enabled: bankTransferEnabled,
          bank_accounts: bankAccounts,
          invoice_note: invoiceNote.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Payment gateway & bank settings updated.");
      setSecretKey("");
      setServiceRoleKey("");
      queryClient.invalidateQueries({ queryKey: ["admin", "payment-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "flutterwave-key-status"] });
      queryClient.invalidateQueries({ queryKey: ["wcbn", "payment-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpenAddBank = () => {
    setEditingBankIndex(null);
    setBankForm({
      bank_name: "",
      account_name: "",
      account_number: "",
      currency: "XAF",
      swift: "",
      branch: "",
      instructions: "",
    });
    setBankDialogOpen(true);
  };

  const handleOpenEditBank = (index: number) => {
    setEditingBankIndex(index);
    const acc = bankAccounts[index];
    if (acc) {
      setBankForm({
        bank_name: acc.bank_name || "",
        account_name: acc.account_name || "",
        account_number: acc.account_number || "",
        swift: acc.swift || "",
        branch: acc.branch || "",
        currency: acc.currency || "XAF",
        instructions: acc.instructions || "",
      });
    }
    setBankDialogOpen(true);
  };

  const handleSaveBank = () => {
    if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name) {
      toast.error("Please enter bank name, account name, and account number.");
      return;
    }
    const updated = [...bankAccounts];
    if (editingBankIndex !== null) {
      updated[editingBankIndex] = bankForm;
    } else {
      updated.push(bankForm);
    }
    setBankAccounts(updated);
    setBankDialogOpen(false);
  };

  const handleDeleteBank = (index: number) => {
    setBankAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Payment Gateways & Direct Invoices</h2>
          <p className="text-xs text-muted-foreground">
            Configure Flutterwave online processing and define official banking accounts for manual wire transfers.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
          className="h-8 text-xs gap-1.5 font-semibold"
        >
          {saveSettings.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save Payment Settings
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Flutterwave Gateway Settings */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              <div>
                <h3 className="font-bold text-sm text-foreground">Flutterwave Gateway</h3>
                <p className="text-[11px] text-muted-foreground">Automated card and mobile money collections</p>
              </div>
            </div>
            <Switch checked={flutterwaveEnabled} onCheckedChange={setFlutterwaveEnabled} />
          </div>

          <div className="space-y-4 text-xs">
            {/* Mode selection */}
            <div className="space-y-1.5">
              <Label className="text-xs">Processing Environment</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={flutterwaveMode === "test" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFlutterwaveMode("test")}
                  className="h-8 text-xs flex-1"
                >
                  🧪 Sandbox (Test Mode)
                </Button>
                <Button
                  type="button"
                  variant={flutterwaveMode === "live" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFlutterwaveMode("live")}
                  className="h-8 text-xs flex-1"
                >
                  🟢 Live Production
                </Button>
              </div>
            </div>

            {/* Public Key */}
            <div className="space-y-1.5">
              <Label className="text-xs">Public Key (Client side)</Label>
              <Input
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="FLWPUBK_TEST-... or FLWPUBK-..."
                className="h-8 font-mono text-xs"
              />
            </div>

            {/* Secret Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Secret Key (Encrypted server vault)</Label>
                {keyStatus?.has_secret_key && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1">
                    <CheckCircle2 className="size-2.5" /> Vault Key Saved
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={keyStatus?.has_secret_key ? "Leave blank to keep existing vault key" : "FLWSECK_TEST-... or FLWSECK-..."}
                className="h-8 font-mono text-xs"
              />
            </div>

            {/* Accepted Methods */}
            <div className="rounded-xl border border-border p-3.5 bg-muted/20 space-y-3">
              <span className="font-semibold text-foreground block">Accepted Payment Methods</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Smartphone className="size-3.5 text-emerald-600" /> Mobile Money (MTN, Orange, Airtel, M-Pesa)
                  </span>
                  <Switch checked={mobileMoneyEnabled} onCheckedChange={setMobileMoneyEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="size-3.5 text-blue-600" /> Debit & Credit Cards (Visa, Mastercard)
                  </span>
                  <Switch checked={cardEnabled} onCheckedChange={setCardEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Landmark className="size-3.5 text-amber-600" /> Direct Bank Wire Transfer
                  </span>
                  <Switch checked={bankTransferEnabled} onCheckedChange={setBankTransferEnabled} />
                </div>
              </div>
            </div>

            {/* Default Invoice Note */}
            <div className="space-y-1.5">
              <Label className="text-xs">Default Invoice Instructions Note</Label>
              <Textarea
                rows={2}
                value={invoiceNote}
                onChange={(e) => setInvoiceNote(e.target.value)}
                placeholder="Instructions displayed on generated invoices for wire transfers..."
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Bank Accounts for Direct Transfer */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Landmark className="size-5 text-amber-600" />
              <div>
                <h3 className="font-bold text-sm text-foreground">Official Bank Accounts</h3>
                <p className="text-[11px] text-muted-foreground">Account numbers displayed on member dues invoices</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleOpenAddBank} className="h-7 text-xs gap-1">
              <Plus className="size-3" /> Add Bank
            </Button>
          </div>

          <div className="space-y-3">
            {bankAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No bank accounts added yet. Click &ldquo;Add Bank&rdquo; to configure wire transfer instructions.
              </div>
            ) : (
              bankAccounts.map((acc, index) => (
                <div key={index} className="rounded-xl border border-border bg-muted/20 p-3.5 text-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-foreground text-xs">{acc.bank_name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        A/C: {acc.account_number} ({acc.currency || "XAF"})
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditBank(index)}
                        className="h-7 text-xs text-primary hover:bg-primary/10"
                      >
                        <Edit2 className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBank(index)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/60">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Beneficiary Name:</span>
                      <span className="font-medium text-foreground">{acc.account_name}</span>
                    </div>
                    {acc.swift && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">SWIFT / BIC:</span>
                        <span className="font-mono text-foreground">{acc.swift}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bank Account Modal */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="sm:max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Landmark className="size-4 text-primary" />
              {editingBankIndex !== null ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              This account information is automatically printed on official dues invoices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Bank Name</Label>
              <Input
                value={bankForm.bank_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                placeholder="e.g. United Bank for Africa (UBA)"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Account Beneficiary Name</Label>
              <Input
                value={bankForm.account_name}
                onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                placeholder="e.g. World Changers Business Network"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Account Number</Label>
                <Input
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  placeholder="0123456789"
                  className="h-8 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Account Currency</Label>
                <Input
                  value={bankForm.currency || "XAF"}
                  onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value.toUpperCase() })}
                  placeholder="XAF, USD, EUR..."
                  className="h-8 font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">SWIFT / BIC Code</Label>
                <Input
                  value={bankForm.swift || ""}
                  onChange={(e) => setBankForm({ ...bankForm, swift: e.target.value })}
                  placeholder="Optional"
                  className="h-8 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Branch / City</Label>
                <Input
                  value={bankForm.branch || ""}
                  onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  placeholder="Optional"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBankDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveBank} className="text-xs">
              Save Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            3. ROLES TAB CONTENT                            */
/* -------------------------------------------------------------------------- */

function RolesTabContent() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const [roles, assignments] = await Promise.all([
        supabase.from("wcbn_roles").select("*").order("name"),
        supabase
          .from("wcbn_user_roles")
          .select("*, wcbn_roles(name), profiles:user_id(first_name, last_name, email)")
          .order("assigned_at", { ascending: false }),
      ]);
      return { roles: roles.data ?? [], assignments: assignments.data ?? [] };
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !roleId) {
        throw new Error("Please specify both an email address and a leadership role.");
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", email.trim())
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error("No World Changers Association account was found with that email address.");

      const { error } = await supabase.from("wcbn_user_roles").insert({
        user_id: profile.id,
        role_id: roleId,
        assigned_by: identity?.userId ?? null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Leadership access granted successfully.");
      setEmail("");
      setRoleId("");
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("wcbn_user_roles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "roles"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-foreground">Leadership Roles & Portal Access Control</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Delegate administrative permissions, review granted access assignments, and inspect system role privileges.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column: Active Assignments & Role Directory */}
        <div className="space-y-6">
          {/* Active Assignments Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
                Assigned Leadership Accounts
              </h3>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 uppercase tracking-wider text-[11px] text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3.5 font-semibold">Leader</th>
                  <th className="p-3.5 font-semibold">Assigned Role</th>
                  <th className="p-3.5 font-semibold text-center">Active Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.assignments.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={3}>
                      No explicit leadership role assignments yet. WCA Super Administrators always retain global access.
                    </td>
                  </tr>
                )}
                {data?.assignments.map((a) => {
                  const p = a.profiles as {
                    first_name: string | null;
                    last_name: string | null;
                    email: string | null;
                  } | null;
                  return (
                    <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-foreground">
                          {[p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Leader"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{p?.email}</span>
                      </td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="font-semibold text-[10px]">
                          {(a.wcbn_roles as { name: string } | null)?.name || "Role"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center">
                        <Switch
                          checked={a.is_active}
                          onCheckedChange={(v) => toggle.mutate({ id: a.id, is_active: v })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* System Role Definitions Cards */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              System Roles & Capability Scopes
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {data?.roles.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground">{r.name}</h4>
                    <ShieldCheck className="size-4 text-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{r.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(Array.isArray(r.permissions) ? (r.permissions as string[]) : []).map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-muted font-mono px-2 py-0.5 text-[10px] text-muted-foreground border border-border"
                      >
                        {p === "*" ? "Global Administrator (*)" : p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Grant Access Form Card */}
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Grant Leadership Role</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Enter the email address of a registered World Changers Association account to grant them leadership permissions.
          </p>

          <div className="space-y-3 text-xs pt-1">
            <div className="space-y-1">
              <Label className="text-xs">Account Email Address</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="leader@wcaglobal.org"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Assign Role</Label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">Select a leadership role...</option>
                {data?.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              disabled={assign.isPending || !email.trim() || !roleId}
              onClick={() => assign.mutate()}
              className="w-full h-8 text-xs gap-1.5 font-semibold mt-2"
            >
              {assign.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              Grant Access
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
