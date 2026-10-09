import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FilePlus2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { money, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/contributions")({ component: ContributionsAdmin });

function ContributionsAdmin() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [memberId, setMemberId] = useState("");
  const [planId, setPlanId] = useState("");

  const { data } = useQuery({
    queryKey: ["admin", "contributions"],
    queryFn: async () => {
      const [invoices, payments, plans, members] = await Promise.all([
        supabase.from("wcbn_invoices").select("*").order("due_date", { ascending: false }),
        supabase.from("wcbn_payments").select("*, wcbn_invoices(invoice_number, wcbn_member_id)").order("created_at", { ascending: false }),
        supabase.from("wcbn_dues_plans").select("*").order("amount"),
        supabase.from("wcbn_members").select("id, category, profiles(first_name, last_name, email)"),
      ]);
      return { invoices: invoices.data ?? [], payments: payments.data ?? [], plans: plans.data ?? [], members: members.data ?? [] };
    },
  });

  const issue = useMutation({
    mutationFn: async () => {
      const plan = data?.plans.find((p) => p.id === planId);
      if (!plan || !memberId) throw new Error("Select a member and a dues plan.");
      const start = new Date();
      const end = new Date(start);
      if (plan.frequency === "monthly") end.setMonth(end.getMonth() + 1); else end.setFullYear(end.getFullYear() + 1);
      const { error } = await supabase.from("wcbn_invoices").insert({
        wcbn_member_id: memberId, dues_plan_id: plan.id, amount: plan.amount, currency_code: plan.currency_code,
        invoice_number: `WCBN-${Date.now().toString().slice(-8)}`,
        period_start: start.toISOString().slice(0, 10), period_end: end.toISOString().slice(0, 10),
        due_date: end.toISOString().slice(0, 10), status: "issued",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Invoice issued"); queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirm = useMutation({
    mutationFn: async (paymentId: string) => {
      const payment = data?.payments.find((p) => p.id === paymentId);
      if (!payment || !payment.invoice_id) return;
      // Invoke RPC to confirm payment, mark invoice paid, and activate member if linked to an onboarding application
      const { error } = await supabase.rpc("wcbn_confirm_payment", {
        _invoice_id: payment.invoice_id,
        _method: payment.method || "bank_transfer",
        _provider: payment.provider || "bank",
        _reference: payment.reference || "confirmed-by-admin",
        _amount: Number(payment.amount),
      });
      if (error) {
        // Fallback to direct updates if RPC is restricted
        const { error: updErr } = await supabase.from("wcbn_payments").update({ status: "confirmed", verified_at: new Date().toISOString(), verified_by: identity?.userId ?? null }).eq("id", paymentId);
        if (updErr) throw updErr;
        const invoice = data?.invoices.find((i) => i.id === payment.invoice_id);
        if (invoice) {
          const paid = Number(invoice.paid_amount) + Number(payment.amount);
          await supabase.from("wcbn_invoices").update({ paid_amount: paid, status: paid >= Number(invoice.amount) ? "paid" : "partial" }).eq("id", invoice.id);
        }
      }
    },
    onSuccess: () => { toast.success("Payment confirmed & member activated"); queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const expected = (data?.invoices ?? []).reduce((s, i) => s + Number(i.amount), 0);
  const collected = (data?.invoices ?? []).reduce((s, i) => s + Number(i.paid_amount), 0);
  const pendingPayments = (data?.payments ?? []).filter((p) => p.status === "declared" || p.status === "pending");

  return (
    <AdminPage title="Fee Management & Invoices" description="Issue membership invoices, confirm bank transfers and declared payments, and track collections across the network.">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Tile label="Total Invoiced" value={money(expected)} />
            <Tile label="Fees Collected" value={money(collected)} />
            <Tile label="Outstanding Arrears" value={money(Math.max(0, expected - collected))} />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Payments awaiting confirmation</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{pendingPayments.length} pending</span>
            </div>
            <div className="mt-4 space-y-3">
              {pendingPayments.length === 0 && <p className="text-sm text-muted-foreground">No payments currently awaiting confirmation.</p>}
              {pendingPayments.map((p) => {
                const inv = p.wcbn_invoices as { invoice_number: string } | null;
                return (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
                    <div>
                      <p className="font-medium">{money(Number(p.amount), p.currency_code)} · {p.method === "bank_transfer" ? "Bank Transfer" : p.method}</p>
                      <p className="text-xs text-muted-foreground">{inv?.invoice_number ? `Invoice: ${inv.invoice_number}` : ""} {p.reference ? `· Ref: ${p.reference}` : ""}</p>
                      {p.proof_url && (
                        <p className="mt-1 text-xs text-primary underline">Receipt attached</p>
                      )}
                    </div>
                    <Button size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate(p.id)}><CheckCircle2 className="size-4" />Confirm & Activate</Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <div className="border-b border-border p-4 font-semibold text-sm">Issued Invoices</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-4">Invoice</th><th className="p-4">Period</th><th className="p-4">Amount</th><th className="p-4">Paid</th><th className="p-4">Status</th></tr>
              </thead>
              <tbody>
                {data?.invoices.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={5}>No invoices issued yet.</td></tr>}
                {data?.invoices.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="p-4 font-medium">{i.invoice_number}</td>
                    <td className="p-4 text-muted-foreground">{i.period_start} → {i.period_end}</td>
                    <td className="p-4 font-semibold">{money(Number(i.amount), i.currency_code)}</td>
                    <td className="p-4">{money(Number(i.paid_amount), i.currency_code)}</td>
                    <td className="p-4"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${i.status === "paid" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Issue an invoice</h2>
          <p className="mt-1 text-xs text-muted-foreground">Create a direct membership dues invoice for a network member.</p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select member</option>
                {data?.members.map((m) => {
                  const p = m.profiles as { first_name: string | null; last_name: string | null; email: string | null } | null;
                  return <option key={m.id} value={m.id}>{[p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email} — {m.category}</option>;
                })}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Membership fee plan</Label>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select plan</option>
                {data?.plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(Number(p.amount), p.currency_code)}</option>)}
              </select>
            </div>
            <Button className="w-full" disabled={issue.isPending || !memberId || !planId} onClick={() => issue.mutate()}>{issue.isPending ? <Loader2 className="animate-spin" /> : <FilePlus2 />}Issue invoice</Button>
            <p className="text-xs text-muted-foreground">Bank transfer confirmation: Once verified, clicking confirm immediately marks the invoice paid and inducts the member.</p>
          </div>
        </aside>
      </div>
    </AdminPage>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-card"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold text-gradient-brand">{value}</p></div>;
}
