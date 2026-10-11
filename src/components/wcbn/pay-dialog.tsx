import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { chargeMobileMoney, checkPayment } from "@/lib/payments.functions";

type Stage = "starting" | "waiting" | "success" | "failed";
declare global { interface Window { FlutterwaveCheckout?: (o: Record<string, unknown>) => { close: () => void } } }

function loadInline() {
  return new Promise<void>((resolve, reject) => {
    if (window.FlutterwaveCheckout) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the card payment form."));
    document.body.appendChild(s);
  });
}

export function PayDialog({ invoiceId, method, phone, publicKey, customer, onClose }: {
  invoiceId: string | null; method: "mobile_money" | "card"; phone: string; publicKey: string | null;
  customer: { email: string; name: string; phone: string }; onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("starting");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    if (!invoiceId) return;
    alive.current = true;
    setStage("starting"); setError("");
    const poll = async (txRef?: string, transactionId?: string) => {
      const until = Date.now() + 4 * 60_000;
      while (alive.current && Date.now() < until) {
        try {
          const r = await checkPayment({ data: { invoiceId, txRef, transactionId } });
          if (r.status === "successful") { if (alive.current) setStage("success"); return; }
          if (r.status === "failed") throw new Error("The payment was declined or cancelled.");
        } catch (e) { if (alive.current) { setError((e as Error).message); setStage("failed"); } return; }
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (alive.current) { setError("We did not receive a confirmation in time. Please try again."); setStage("failed"); }
    };
    (async () => {
      try {
        if (method === "mobile_money") {
          const res = await chargeMobileMoney({ data: { invoiceId, phone } });
          if (res.redirect) window.open(res.redirect, "_blank", "noopener");
          setStage("waiting");
          await poll(res.txRef);
        } else {
          if (!publicKey) throw new Error("Card payments are not configured yet.");
          const { data: inv } = await supabase.from("wcbn_invoices").select("invoice_number, amount, currency_code").eq("id", invoiceId).single();
          if (!inv) throw new Error("Invoice not found.");
          await loadInline();
          setStage("waiting");
          const txRef = `${inv.invoice_number}-${Date.now()}`;
          let done = false;
          const modal = window.FlutterwaveCheckout!({
            public_key: publicKey, tx_ref: txRef, amount: Number(inv.amount), currency: inv.currency_code,
            payment_options: "card", customer: { email: customer.email, name: customer.name, phone_number: customer.phone },
            customizations: { title: "WCBN membership fee", description: `Invoice ${inv.invoice_number}` },
            meta: { invoice_id: invoiceId },
            callback: (r: { transaction_id?: number }) => { done = true; modal.close(); void poll(txRef, r.transaction_id ? String(r.transaction_id) : undefined); },
            onclose: () => { if (!done && alive.current) { setError("Card payment was closed before completion."); setStage("failed"); } },
          });
        }
      } catch (e) { if (alive.current) { setError((e as Error).message); setStage("failed"); } }
    })();
    return () => { alive.current = false; };
  }, [invoiceId, method, phone, publicKey, attempt]);

  return (
    <Dialog open={!!invoiceId} onOpenChange={(o) => { if (!o && stage !== "success") onClose(); }}>
      <DialogContent className="max-w-sm text-center" onInteractOutside={(e) => e.preventDefault()}>
        {stage === "success" ? (
          <>
            <CheckCircle2 className="mx-auto size-14 text-primary" />
            <DialogTitle>Payment successful</DialogTitle>
            <DialogDescription>Welcome to WCBN! Your membership is now active.</DialogDescription>
            <Button className="mt-2 w-full" onClick={() => window.location.assign("/portal")}>Go to my dashboard</Button>
          </>
        ) : stage === "failed" ? (
          <>
            <XCircle className="mx-auto size-14 text-destructive" />
            <DialogTitle>Payment not completed</DialogTitle>
            <DialogDescription>{error}</DialogDescription>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
              <Button className="flex-1" onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
            </div>
          </>
        ) : (
          <>
            {method === "mobile_money" ? <Smartphone className="mx-auto size-12 text-primary" /> : null}
            <Loader2 className="mx-auto size-10 animate-spin text-primary" />
            <DialogTitle>{stage === "starting" ? "Starting payment…" : method === "mobile_money" ? "Approve on your phone" : "Complete your card payment"}</DialogTitle>
            <DialogDescription>
              {method === "mobile_money" ? `A payment request was sent to ${phone}. Enter your PIN to confirm. Keep this window open.` : "Enter your card details in the secure form. Keep this window open."}
            </DialogDescription>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
