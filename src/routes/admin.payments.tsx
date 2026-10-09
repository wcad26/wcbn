import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, CreditCard, Landmark, Loader2, Plus, Save, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchPaymentSettings, type BankAccount } from "@/lib/fees";
import { flutterwaveKeyStatus, updatePaymentGatewaySettings } from "@/lib/payments.functions";

export const Route = createFileRoute("/admin/payments")({ component: AdminPaymentSettingsPage });

function AdminPaymentSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "payment-settings"],
    queryFn: fetchPaymentSettings,
  });

  const { data: keyStatus } = useQuery({
    queryKey: ["admin", "flutterwave-key-status"],
    queryFn: () => flutterwaveKeyStatus(),
  });

  // Flutterwave Settings Form State
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

  // Bank Account Dialog State
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
      toast.success("Payment settings saved successfully.");
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
      <AdminPage title="Payment Gateway Settings" description="Loading payment settings...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Payment Gateway & Bank Settings"
      description="Configure Flutterwave online processing (Mobile Money & Card) and manage official bank accounts for bank transfer invoices."
    >
      <div className="space-y-8">
        {/* Top Action Bar */}
        <div className="flex justify-end">
          <Button disabled={saveSettings.isPending} onClick={() => saveSettings.mutate()}>
            {saveSettings.isPending ? <Loader2 className="animate-spin" /> : <Save className="size-4" />}
            Save All Changes
          </Button>
        </div>

        {/* Section 1: Flutterwave Gateway */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                Flutterwave Online Checkout
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Collect membership fees automatically via Mobile Money (Orange, MTN, Moov) and Credit/Debit cards.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {flutterwaveEnabled ? "Gateway Active" : "Gateway Disabled"}
              </span>
              <Switch checked={flutterwaveEnabled} onCheckedChange={setFlutterwaveEnabled} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label>Gateway Mode</Label>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="flutterwave_mode"
                      value="test"
                      checked={flutterwaveMode === "test"}
                      onChange={() => setFlutterwaveMode("test")}
                    />
                    Test Mode (Sandbox)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="flutterwave_mode"
                      value="live"
                      checked={flutterwaveMode === "live"}
                      onChange={() => setFlutterwaveMode("live")}
                    />
                    Live Production Mode
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="flw-public-key">Flutterwave Public Key</Label>
                <Input
                  id="flw-public-key"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="FLWPUBK_TEST-..."
                  className="mt-1.5 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Found in your Flutterwave dashboard under Settings → API Keys.
                </p>
              </div>

              <div>
                <Label htmlFor="flw-secret-key">Flutterwave Secret Key</Label>
                <Input
                  id="flw-secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={keyStatus?.configured ? "•••••••••••••••••••• (Leave blank to keep existing)" : "FLWSECK_TEST-..."}
                  className="mt-1.5 font-mono text-xs"
                />
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  {keyStatus?.configured ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <ShieldCheck className="size-3.5" />
                      Configured on server ({keyStatus.masked})
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      Secret key not yet configured
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="supabase-service-key">Supabase Service Role Key (Optional / Dev Server)</Label>
                <Input
                  id="supabase-service-key"
                  type="password"
                  value={serviceRoleKey}
                  onChange={(e) => setServiceRoleKey(e.target.value)}
                  placeholder={keyStatus?.serviceRoleConfigured ? `•••••••••••••••••••• (Leave blank to keep existing)` : "eyJhbGciOiJIUzI1NiIsInR5cCI6..."}
                  className="mt-1.5 font-mono text-xs"
                />
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  {keyStatus?.serviceRoleConfigured ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <ShieldCheck className="size-3.5" />
                      Configured on server ({keyStatus.serviceRoleMasked})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Optional: Bypasses RLS for backend tasks like instant payment verification
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-border bg-muted/30 p-5">
              <h3 className="text-sm font-semibold">Payment Channels Enabled</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="size-4 text-primary" />
                    <span>Mobile Money (Orange, MTN, Moov)</span>
                  </div>
                  <Switch checked={mobileMoneyEnabled} onCheckedChange={setMobileMoneyEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="size-4 text-primary" />
                    <span>Credit & Debit Cards (Visa, Mastercard)</span>
                  </div>
                  <Switch checked={cardEnabled} onCheckedChange={setCardEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Landmark className="size-4 text-primary" />
                    <span>Bank Transfer Invoicing</span>
                  </div>
                  <Switch checked={bankTransferEnabled} onCheckedChange={setBankTransferEnabled} />
                </div>
              </div>

              <div className="pt-2">
                <Label htmlFor="invoice-note">Invoice Footer Note</Label>
                <Textarea
                  id="invoice-note"
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                  placeholder="World Changers Business Network · Formal Membership Invoice"
                  className="mt-1.5 text-xs h-16"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Organization Bank Accounts */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                Organization Bank Accounts
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                These bank details automatically appear on all generated bank transfer invoices.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenAddBank}>
              <Plus className="size-4" />
              Add Bank Account
            </Button>
          </div>

          <div className="mt-6">
            {bankAccounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No bank accounts configured yet. Click "Add Bank Account" to configure one for bank transfer invoices.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {bankAccounts.map((b, i) => (
                  <div key={i} className="flex flex-col justify-between rounded-2xl border border-border bg-muted/20 p-5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-bold text-foreground">{b.bank_name}</p>
                          <p className="text-xs font-semibold text-primary">{b.currency || "XAF"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEditBank(i)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBank(i)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-xs">
                        <p><span className="text-muted-foreground">Account Name:</span> <span className="font-medium">{b.account_name}</span></p>
                        <p><span className="text-muted-foreground">Account Number / IBAN:</span> <span className="font-mono font-medium">{b.account_number}</span></p>
                        {b.swift && <p><span className="text-muted-foreground">SWIFT / BIC:</span> <span className="font-mono">{b.swift}</span></p>}
                        {b.branch && <p><span className="text-muted-foreground">Branch:</span> <span>{b.branch}</span></p>}
                        {b.instructions && <p className="mt-2 text-[11px] text-muted-foreground italic">"{b.instructions}"</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Bank Account Modal Dialog */}
        <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>{editingBankIndex !== null ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
              <DialogDescription>
                Details to display on membership fee invoices for direct bank deposit.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-3.5 text-sm">
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  placeholder="e.g. Afriland First Bank"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={bankForm.currency ?? "XAF"}
                    onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value.toUpperCase() })}
                    placeholder="XAF, USD, EUR..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input
                    value={bankForm.branch ?? ""}
                    onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                    placeholder="e.g. Douala Central"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Account Name</Label>
                <Input
                  value={bankForm.account_name}
                  onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                  placeholder="e.g. World Changers Business Network"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Account Number / IBAN</Label>
                <Input
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  placeholder="e.g. 10005 00012 01234567890 12"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label>SWIFT / BIC (Optional)</Label>
                <Input
                  value={bankForm.swift ?? ""}
                  onChange={(e) => setBankForm({ ...bankForm, swift: e.target.value })}
                  placeholder="e.g. AFRIXXXX"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label>Transfer Instructions (Optional)</Label>
                <Textarea
                  value={bankForm.instructions ?? ""}
                  onChange={(e) => setBankForm({ ...bankForm, instructions: e.target.value })}
                  placeholder="e.g. Mention your invoice number as the payment reference."
                  className="mt-1 text-xs h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setBankDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveBank}>
                  {editingBankIndex !== null ? "Update Account" : "Add Account"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPage>
  );
}
