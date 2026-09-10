import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, FileUp, Loader2, Receipt, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { money, uploadDocument, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal_/contributions")({ component: ContributionsPage });

function ContributionsPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const wcbnId = identity?.wcbnMember?.id;
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const { data } = useQuery({
    queryKey: ["portal", "contributions", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const [invoices, plans] = await Promise.all([
        supabase.from("wcbn_invoices").select("*, wcbn_payments(id, amount, status, reference, method, paid_at)").eq("wcbn_member_id", wcbnId!).order("due_date", { ascending: false }),
        supabase.from("wcbn_dues_plans").select("*").eq("is_active", true).order("amount"),
      ]);
      return { invoices: invoices.data ?? [], plans: plans.data ?? [] };
    },
  });

  const declare = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const { error } = await supabase.from("wcbn_payments").insert({
        invoice_id: invoiceId, amount: Number(amount), currency_code: "XAF", method,
        reference: reference || null, notes: notes || null, status: "declared", submitted_by: identity.userId, paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payment declared. Finance will confirm it shortly."); setAmount(""); setReference(""); setNotes("");
      queryClient.invalidateQueries({ queryKey: ["portal", "contributions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberPage title="Contributions" description="Your dues schedule, invoices and payment history. Declare a payment you have already made and finance will confirm it.">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Invoices</h2>
            {!data?.invoices.length && <p className="mt-4 text-sm text-muted-foreground">No invoices have been issued to you yet.</p>}
            <div className="mt-4 space-y-3">
              {data?.invoices.map((inv) => (
                <div key={inv.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.period_start} → {inv.period_end} · due {inv.due_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{money(Number(inv.amount), inv.currency_code)}</p>
                      <span className="text-xs capitalize text-muted-foreground">{inv.status} · paid {money(Number(inv.paid_amount), inv.currency_code)}</span>
                    </div>
                  </div>
                  {(inv.wcbn_payments as { id: string; amount: number; status: string; reference: string | null }[] | null)?.map((p) => (
                    <p key={p.id} className="mt-2 text-xs text-muted-foreground">Payment {money(Number(p.amount), inv.currency_code)} · {p.status}{p.reference ? ` · ref ${p.reference}` : ""}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Dues plans</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data?.plans.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border p-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.category} · {p.frequency}</p>
                  <p className="mt-2 text-xl font-bold text-gradient-brand">{money(Number(p.amount), p.currency_code)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Declare a payment</h2>
          <p className="mt-1 text-sm text-muted-foreground">Already paid by transfer or mobile money? Tell us and finance will confirm.</p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label>Invoice</Label>
              <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select an invoice</option>
                {data?.invoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number} — {money(Number(i.amount), i.currency_code)}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Amount paid</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Method</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="mobile_money">Mobile money</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction reference" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <Button className="w-full" disabled={!invoiceId || !amount || declare.isPending} onClick={() => declare.mutate()}>
              {declare.isPending ? <Loader2 className="animate-spin" /> : <Send />}Submit for confirmation
            </Button>
          </div>
        </aside>
      </div>
    </MemberPage>
  );
}
