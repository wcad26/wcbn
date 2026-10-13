import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleDollarSign,
  FileUp,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Send,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { money, uploadDocument, useIdentity } from "@/lib/wcbn";
import { InvoiceCard, type InvoiceRow } from "@/components/wcbn/invoice-card";
import { fetchPaymentSettings } from "@/lib/fees";

export const Route = createFileRoute("/portal/contributions")({ component: ContributionsPage });

function ContributionsPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const wcbnId = identity?.wcbnMember?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<InvoiceRow | null>(null);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["wcbn", "payment-settings"],
    queryFn: fetchPaymentSettings,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "contributions", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const invoices = await supabase
        .from("wcbn_invoices")
        .select("*, wcbn_membership_categories(name), wcbn_payments(id, amount, status, reference, method, paid_at)")
        .eq("wcbn_member_id", wcbnId!)
        .order("due_date", { ascending: false });

      return {
        invoices: (invoices.data ?? []) as (InvoiceRow & {
          wcbn_payments: { id: string; amount: number; status: string; reference: string | null; method: string | null }[] | null;
        })[],
      };
    },
  });

  const invoices = data?.invoices ?? [];
  const selected = invoices.find((i) => i.id === invoiceId);
  const currency = selected?.currency_code ?? invoices[0]?.currency_code ?? identity?.regionCurrency ?? "XAF";
  const outstanding = invoices.reduce((sum, i) => sum + Math.max(0, Number(i.amount) - Number(i.paid_amount)), 0);
  const paidTotal = invoices.reduce((sum, i) => sum + Number(i.paid_amount), 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = invoices.filter((i) => i.due_date < today && Number(i.paid_amount) < Number(i.amount));
  const nextDue = invoices.filter((i) => Number(i.paid_amount) < Number(i.amount) && i.due_date >= today).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const declare = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      let proofPath: string | null = null;
      if (proof) proofPath = await uploadDocument(identity.userId, "payments", proof);
      const { error } = await supabase.from("wcbn_payments").insert({
        invoice_id: invoiceId,
        amount: Number(amount),
        currency_code: currency,
        method,
        reference: reference || null,
        notes: notes || null,
        proof_url: proofPath,
        status: "declared",
        submitted_by: identity.userId,
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment declared. Finance will verify and update your invoice balance shortly.");
      setAmount("");
      setReference("");
      setNotes("");
      setProof(null);
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["portal", "contributions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Member Portal</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Membership Fees & Invoices
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
            Your personal dues schedule, issued invoices, and payment receipts. Review formal invoices and declare offline wire or mobile money payments.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl shrink-0 gap-1.5 shadow-xs">
              <Plus className="size-4" />
              <span>Declare Offline Payment</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Declare Offline Payment</DialogTitle>
              <DialogDescription className="text-xs">
                Already transferred funds via bank wire or mobile money? Submit your transaction proof and finance will audit.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Invoice</Label>
                <select
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                >
                  <option value="">Select an invoice to pay</option>
                  {invoices.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.invoice_number} — {money(Number(i.amount) - Number(i.paid_amount), i.currency_code)} due
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Amount Paid</Label>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Channel</Label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                >
                  <option value="bank_transfer">Direct Bank Transfer / Wire</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash Deposit</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Transaction Reference / ID</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Bank reference or MoMo TxID"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes (Optional)</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or notes"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Receipt / Proof Document (Optional)</Label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-xs font-medium hover:border-primary/50 text-muted-foreground hover:text-foreground">
                  <FileUp className="size-4 text-primary" />
                  <span className="truncate">{proof ? proof.name : "Attach transaction screenshot / PDF"}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <Button
                className="w-full rounded-xl mt-2"
                disabled={!invoiceId || !amount || declare.isPending}
                onClick={() => declare.mutate()}
              >
                {declare.isPending ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
                <span>Submit for Finance Audit</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Stats (3 cards) */}
      <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <MetricCard
          label="Outstanding Balance"
          value={money(outstanding, currency)}
          detail={outstanding === 0 ? "All fees settled" : `${overdue.length} invoice(s) overdue`}
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Total Fees Paid"
          value={money(paidTotal, currency)}
          detail="Confirmed by WCBN Finance"
          icon={Receipt}
        />
        <MetricCard
          label={overdue.length ? "Overdue Balance" : "Next Due Date"}
          value={
            overdue.length
              ? money(overdue.reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount)), 0), currency)
              : nextDue
              ? new Date(nextDue.due_date).toLocaleDateString()
              : "All Settled"
          }
          detail={overdue.length ? `${overdue.length} invoice(s) past due` : nextDue ? `Invoice ${nextDue.invoice_number}` : "No pending dues"}
          icon={overdue.length ? TriangleAlert : CheckCircle2}
        />
      </section>

      {/* Invoices Ledger */}
      <section className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Issued Invoices & Receipts</h2>
            <p className="text-xs text-muted-foreground">Detailed statement of membership fee obligations and recorded payments.</p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
          </span>
        </div>

        {!invoices.length ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            <Receipt className="mx-auto size-8 text-muted-foreground/60 mb-2" />
            <p className="font-semibold text-foreground">No invoices issued to date.</p>
            <p>Membership fee schedules will appear here once invoiced by WCBN administration.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const isPaid = inv.status === "paid";
              const isPastDue = !isPaid && inv.due_date < today;
              const remaining = Math.max(0, Number(inv.amount) - Number(inv.paid_amount));

              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 transition hover:border-primary/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm sm:text-base font-bold text-foreground">{inv.invoice_number}</strong>
                        <Badge
                          variant="outline"
                          className={`text-[10px] rounded-full capitalize ${
                            isPaid
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
                              : isPastDue
                              ? "bg-destructive/15 text-destructive border-destructive/30 font-semibold"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                          }`}
                        >
                          {isPaid ? "Paid in Full" : isPastDue ? "Overdue" : inv.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Billing Period: {inv.period_start} → {inv.period_end} · Due: {new Date(inv.due_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                      <div className="sm:text-right">
                        <p className="text-base sm:text-lg font-bold text-foreground">
                          {money(Number(inv.amount), inv.currency_code)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {isPaid ? "Paid in full" : `Remaining: ${money(remaining, inv.currency_code)}`}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-8 gap-1.5"
                        onClick={() => setSelectedInvoiceForView(inv)}
                      >
                        <Printer className="size-3.5" />
                        <span>View / Print</span>
                      </Button>
                    </div>
                  </div>

                  {/* Payment Logs */}
                  {inv.wcbn_payments && inv.wcbn_payments.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-1 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Payment Receipts on Record
                      </p>
                      {inv.wcbn_payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {money(Number(p.amount), inv.currency_code)} via {(p.method || "transfer").replace("_", " ")}
                            {p.reference ? ` (Ref: ${p.reference})` : ""}
                          </span>
                          <span className="capitalize font-semibold text-foreground">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Invoice View / Print Modal */}
      <Dialog
        open={!!selectedInvoiceForView}
        onOpenChange={(open) => !open && setSelectedInvoiceForView(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Official Membership Invoice</DialogTitle>
          </DialogHeader>
          {selectedInvoiceForView && (
            <div className="mt-2">
              <InvoiceCard
                invoice={selectedInvoiceForView}
                memberName={identity?.fullName}
                bankAccounts={settings?.bank_accounts}
                note={settings?.invoice_note}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
