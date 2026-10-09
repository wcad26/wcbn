import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckCircle2, Edit2, Layers, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories, getCategoryArchetype, archetypeToDbType, type Category, type CategoryArchetype } from "@/lib/fees";
import { money } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategoriesPage });

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

const DEFAULT_FORM: CategoryForm = {
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

function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(DEFAULT_FORM);
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
      // transform fees array to record
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
      toast.success("Membership category saved.");
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
      ...DEFAULT_FORM,
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

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    setForm((f) => ({ ...f, benefits: [...f.benefits, newBenefit.trim()] }));
    setNewBenefit("");
  };

  const handleRemoveBenefit = (index: number) => {
    setForm((f) => ({ ...f, benefits: f.benefits.filter((_, i) => i !== index) }));
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

  return (
    <AdminPage
      title="Membership Categories"
      description="Manage network membership tiers, regional fee structures, installment permissions, and member benefit packages."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={filterArchetype === "all" ? "default" : "outline"}
              onClick={() => setFilterArchetype("all")}
              className="rounded-full"
            >
              All Categories ({categories.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterArchetype === "entrepreneur" ? "default" : "outline"}
              onClick={() => setFilterArchetype("entrepreneur")}
              className="rounded-full"
            >
              🚀 Entrepreneurs ({entrepreneurCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterArchetype === "investor_mentor" ? "default" : "outline"}
              onClick={() => setFilterArchetype("investor_mentor")}
              className="rounded-full"
            >
              💎 Investors & Mentors ({investorCount})
            </Button>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="size-4" />
            Add New Category
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {visibleCategories.map((c) => (
              <div
                key={c.id}
                className={`flex flex-col justify-between rounded-3xl border p-6 shadow-card transition bg-card ${
                  c.is_active ? "border-border" : "border-dashed border-border opacity-70"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {getCategoryArchetype(c) === "investor_mentor" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200/50">
                          <span>💎</span> Investor & Mentor Track
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/50">
                          <span>🚀</span> Entrepreneur Track
                        </span>
                      )}
                      <h3 className="mt-2 text-xl font-bold text-foreground">{c.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">Code: {c.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: c.id, is_active: checked })}
                        aria-label="Toggle active status"
                      />
                      <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(c)}>
                        <Edit2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {c.description && <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>}
                  {c.target_audience && (
                    <p className="mt-1 text-xs text-muted-foreground font-medium">
                      Audience: <span className="text-foreground">{c.target_audience}</span>
                    </p>
                  )}

                  {/* Multi-Currency Fees */}
                  <div className="mt-4 rounded-2xl bg-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configured Fees</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(c.fees || {}).map(([currency, amt]) => (
                        <span key={currency} className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold">
                          {money(Number(amt), currency)}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Installments: {c.allow_installments ? "Allowed (Annual, Semi-annual, Quarterly)" : "One-time annual only"}
                    </p>
                  </div>

                  {/* Benefits */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Benefits ({c.benefits?.length ?? 0})</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {(c.benefits || []).slice(0, 4).map((b, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-primary shrink-0" />
                          <span className="truncate">{b}</span>
                        </li>
                      ))}
                      {(c.benefits?.length ?? 0) > 4 && (
                        <li className="text-[11px] italic text-muted-foreground pl-4">
                          + {c.benefits.length - 4} more benefits
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>Display order: {c.display_order}</span>
                  <span className={c.is_active ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                    {c.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Category Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Category Tier" : "Add Membership Category"}</DialogTitle>
              <DialogDescription>
                Configure category details, regional fee amounts, installment options, and member benefits.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Category Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Business Member"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Category Code (Unique Key)</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. business"
                    className="mt-1 font-mono text-xs"
                    disabled={!!form.id}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="font-semibold">Category Archetype</Label>
                  <select
                    value={getCategoryArchetype({ applicant_type: form.applicant_type, code: form.code })}
                    onChange={(e) => {
                      const arch = e.target.value as CategoryArchetype;
                      setForm({ ...form, applicant_type: archetypeToDbType(arch) });
                    }}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium"
                  >
                    <option value="entrepreneur">🚀 Entrepreneur / Business Owner (Commercial & Enterprise Form)</option>
                    <option value="investor_mentor">💎 Investor / Mentor / Strategic Partner (Investment & Advisory Form)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Determines whether applicants complete the Entrepreneur form or the Investor / Mentor form.
                  </p>
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Input
                    value={form.target_audience}
                    onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                    placeholder="e.g. Established businesses"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description of this membership category..."
                  className="mt-1 text-xs h-16"
                />
              </div>

              {/* Multi-Currency Fee Matrix */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Configured Regional Fees</Label>
                    <p className="text-[11px] text-muted-foreground">Specify the annual fee amount per regional currency.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddFeeRow}>
                    <Plus className="size-3.5" /> Add Currency
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {form.fees.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={f.currency}
                        onChange={(e) => handleFeeChange(i, "currency", e.target.value.toUpperCase())}
                        placeholder="Currency (e.g. XAF)"
                        className="w-28 font-mono text-xs uppercase"
                      />
                      <Input
                        type="number"
                        value={f.amount}
                        onChange={(e) => handleFeeChange(i, "amount", Number(e.target.value))}
                        placeholder="Amount"
                        className="flex-1 font-semibold text-xs"
                      />
                      {form.fees.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => handleRemoveFeeRow(i)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Installments & Display Order */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Allow Instalment Cycles</Label>
                    <p className="text-[11px] text-muted-foreground">Annual, Semi-annual (50%), Quarterly (25%)</p>
                  </div>
                  <Switch
                    checked={form.allow_installments}
                    onCheckedChange={(checked) => setForm({ ...form, allow_installments: checked })}
                  />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Benefits Editor */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <Label className="text-sm font-semibold">Category Benefits List</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddBenefit(); } }}
                    placeholder="e.g. Full directory listing, mentorship sessions..."
                    className="text-xs"
                  />
                  <Button type="button" size="sm" onClick={handleAddBenefit}>
                    Add
                  </Button>
                </div>

                <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {form.benefits.map((b, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
                      <span>{b}</span>
                      <button type="button" onClick={() => handleRemoveBenefit(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={saveMutation.isPending || !form.name || !form.code} onClick={() => saveMutation.mutate(form)}>
                  {saveMutation.isPending ? <Loader2 className="animate-spin" /> : <Save className="size-4" />}
                  Save Category
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPage>
  );
}
