import { Landmark, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/wcbn";
import { CYCLES, METHOD_LABELS, type BankAccount, type PaymentMethod } from "@/lib/fees";

export type InvoiceRow = {
  id: string; invoice_number: string; amount: number; paid_amount: number; currency_code: string; status: string;
  due_date: string; period_start: string; period_end: string; billing_cycle?: string | null;
  installment_number?: number | null; installments_total?: number | null; payment_method?: string | null;
  wcbn_membership_categories?: { name: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-primary/15 text-primary",
  issued: "bg-accent/20 text-accent-foreground",
  scheduled: "bg-muted text-muted-foreground",
  partial: "bg-accent/20 text-accent-foreground",
};

export function InvoiceCard({ invoice, memberName, bankAccounts, note, showBank = true }: {
  invoice: InvoiceRow; memberName?: string | undefined; bankAccounts?: BankAccount[] | undefined; note?: string | null | undefined; showBank?: boolean;
}) {
  const cycle = CYCLES.find((c) => c.value === invoice.billing_cycle);
  const unpaid = Number(invoice.paid_amount) < Number(invoice.amount);
  const bank = showBank && unpaid && invoice.payment_method === "bank_transfer" && (bankAccounts?.length ?? 0) > 0;
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-card print:shadow-none">
      <header className="gradient-brand flex flex-wrap items-start justify-between gap-4 p-6 text-primary-foreground">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">WCBN invoice</p>
          <p className="mt-1 text-xl font-bold">{invoice.invoice_number}</p>
          {memberName && <p className="mt-1 text-sm opacity-90">Billed to {memberName}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{money(Number(invoice.amount), invoice.currency_code)}</p>
          <span className={`mt-2 inline-block rounded-full bg-background px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[invoice.status] ?? "text-foreground"}`}>{invoice.status}</span>
        </div>
      </header>
      <dl className="grid gap-x-6 gap-y-3 p-6 text-sm sm:grid-cols-2">
        <Item label="Membership category" value={invoice.wcbn_membership_categories?.name ?? "—"} />
        <Item label="Payment plan" value={`${cycle?.label ?? "Annual"}${(invoice.installments_total ?? 1) > 1 ? ` · instalment ${invoice.installment_number}/${invoice.installments_total}` : ""}`} />
        <Item label="Period" value={`${invoice.period_start} → ${invoice.period_end}`} />
        <Item label="Due date" value={invoice.due_date} />
        <Item label="Payment method" value={invoice.payment_method ? METHOD_LABELS[invoice.payment_method as PaymentMethod] ?? invoice.payment_method : "—"} />
        <Item label="Paid" value={money(Number(invoice.paid_amount), invoice.currency_code)} />
      </dl>
      {bank && (
        <div className="border-t border-border p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Landmark className="size-4 text-primary" />Pay by bank transfer</h3>
          <p className="mt-1 text-xs text-muted-foreground">Use <span className="font-semibold text-foreground">{invoice.invoice_number}</span> as the payment reference.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {bankAccounts!.map((b, i) => (
              <div key={i} className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
                <p className="font-semibold">{b.bank_name}{b.currency ? ` · ${b.currency}` : ""}</p>
                <p className="mt-1">{b.account_name}</p>
                <p className="font-mono text-xs">{b.account_number}</p>
                {b.swift && <p className="text-xs text-muted-foreground">SWIFT/BIC: {b.swift}</p>}
                {b.branch && <p className="text-xs text-muted-foreground">Branch: {b.branch}</p>}
                {b.instructions && <p className="mt-2 text-xs text-muted-foreground">{b.instructions}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 print:hidden">
        <p className="text-xs text-muted-foreground">{note ?? "World Changers Business Network"}</p>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
      </footer>
    </article>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
