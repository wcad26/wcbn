import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FLW = "https://api.flutterwave.com/v3";

/** Creates the onboarding invoice(s) and, for mobile money / card, returns a Flutterwave checkout link. */
export const startOnboardingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    applicationId: z.string().uuid(), categoryId: z.string().uuid(),
    cycle: z.enum(["annual", "semi_annual", "quarterly"]), method: z.enum(["mobile_money", "card", "bank_transfer"]),
    origin: z.string().url(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: invoiceId, error } = await supabase.rpc("wcbn_create_onboarding_invoices", {
      _application_id: data.applicationId, _category_id: data.categoryId, _cycle: data.cycle, _method: data.method,
    });
    if (error) throw new Error(error.message);
    if (data.method === "bank_transfer") return { invoiceId: invoiceId as string, link: null as string | null };

    const secret = process.env['FLUTTERWAVE_SECRET_KEY'];
    if (!secret) throw new Error("Online payments are not configured yet. Please choose bank transfer or try later.");
    const { data: settings } = await supabase.from("wcbn_payment_settings").select("flutterwave_enabled, mobile_money_enabled, card_enabled").eq("id", 1).maybeSingle();
    if (!settings?.flutterwave_enabled) throw new Error("Online payments are currently disabled.");

    const { data: invoice } = await supabase.from("wcbn_invoices").select("invoice_number, amount, currency_code").eq("id", invoiceId as string).single();
    const { data: profile } = await supabase.from("profiles").select("first_name, last_name, email, phone").eq("id", userId).maybeSingle();
    if (!invoice) throw new Error("Invoice could not be created.");

    const options = data.method === "card" ? "card"
      : invoice.currency_code === "XAF" ? "mobilemoneyfranco" : invoice.currency_code === "GHS" ? "mobilemoneyghana" : "mobilemoney";
    const res = await fetch(`${FLW}/payments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: invoice.invoice_number,
        amount: Number(invoice.amount),
        currency: invoice.currency_code,
        redirect_url: `${data.origin}/portal/application`,
        payment_options: options,
        customer: {
          email: profile?.email ?? "member@wcbn.org",
          name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "WCBN member",
          phonenumber: profile?.phone ?? undefined,
        },
        customizations: { title: "WCBN membership fee", description: `Invoice ${invoice.invoice_number}` },
        meta: { invoice_id: invoiceId },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string; data?: { link?: string } };
    if (!res.ok || body.status !== "success" || !body.data?.link) throw new Error(body.message ?? "Could not start the payment.");
    return { invoiceId: invoiceId as string, link: body.data.link };
  });

/** Verifies a Flutterwave transaction with Flutterwave, then activates the membership. */
export const verifyFlutterwavePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ transactionId: z.string().min(1).max(40), txRef: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env['FLUTTERWAVE_SECRET_KEY'];
    if (!secret) throw new Error("Online payments are not configured.");
    // Invoice must belong to the caller (RLS applies to this read).
    const { data: invoice } = await context.supabase.from("wcbn_invoices").select("id, amount, currency_code, status, payment_method").eq("invoice_number", data.txRef).maybeSingle();
    if (!invoice) throw new Error("Invoice not found for this account.");
    if (invoice.status === "paid") return { ok: true };

    const res = await fetch(`${FLW}/transactions/${encodeURIComponent(data.transactionId)}/verify`, { headers: { Authorization: `Bearer ${secret}` } });
    const body = (await res.json().catch(() => ({}))) as { status?: string; data?: { status?: string; tx_ref?: string; amount?: number; currency?: string; flw_ref?: string; payment_type?: string } };
    const tx = body.data;
    if (!res.ok || body.status !== "success" || !tx) throw new Error("Could not verify the payment.");
    if (tx.status !== "successful" || tx.tx_ref !== data.txRef || tx.currency !== invoice.currency_code || Number(tx.amount) < Number(invoice.amount)) {
      throw new Error("The payment was not completed. No charge was confirmed.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const method = tx.payment_type === "card" ? "card" : "mobile_money";
    const { error } = await supabaseAdmin.rpc("wcbn_confirm_payment", {
      _invoice_id: invoice.id, _method: method, _provider: "flutterwave", _reference: `${data.transactionId}${tx.flw_ref ? `/${tx.flw_ref}` : ""}`, _amount: Number(tx.amount),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Tells leadership whether the Flutterwave secret key is configured (never returns the key). */
export const flutterwaveKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ configured: !!process.env['FLUTTERWAVE_SECRET_KEY'] }));
