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

    // Ensure application is marked awaiting_payment for all payment options
    await supabase.from("wcbn_applications").update({ status: "awaiting_payment" }).eq("id", data.applicationId);

    if (data.method === "bank_transfer") {
      return { invoiceId: invoiceId as string, link: null as string | null };
    }

    const secret = process.env['FLUTTERWAVE_SECRET_KEY'];
    const { data: settings } = await supabase.from("wcbn_payment_settings").select("flutterwave_enabled, mobile_money_enabled, card_enabled").eq("id", 1).maybeSingle();

    if (!secret || !settings?.flutterwave_enabled) {
      return {
        invoiceId: invoiceId as string,
        link: null as string | null,
        notice: "Invoice generated successfully. Online checkout is pending configuration; you can pay via bank transfer below.",
      };
    }

    const { data: invoice } = await supabase.from("wcbn_invoices").select("invoice_number, amount, currency_code").eq("id", invoiceId as string).single();
    const { data: profile } = await supabase.from("profiles").select("first_name, last_name, email, phone").eq("id", userId).maybeSingle();
    if (!invoice) return { invoiceId: invoiceId as string, link: null as string | null };

    const options = data.method === "card" ? "card"
      : invoice.currency_code === "XAF" ? "mobilemoneyfranco" : invoice.currency_code === "GHS" ? "mobilemoneyghana" : "mobilemoney";
    try {
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
      return { invoiceId: invoiceId as string, link: body?.data?.link ?? null };
    } catch {
      return { invoiceId: invoiceId as string, link: null as string | null };
    }
  });

/** Creates a Flutterwave checkout link for an existing invoice. */
export const createFlutterwavePaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    invoiceId: z.string().uuid(),
    method: z.enum(["mobile_money", "card"]),
    origin: z.string().url(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const secret = process.env['FLUTTERWAVE_SECRET_KEY'];
    if (!secret) throw new Error("Online payment gateway is not configured yet. Please choose bank transfer or contact support.");
    const { data: settings } = await supabase.from("wcbn_payment_settings").select("flutterwave_enabled, mobile_money_enabled, card_enabled").eq("id", 1).maybeSingle();
    if (!settings?.flutterwave_enabled) throw new Error("Online payments are currently disabled.");

    const { data: invoice } = await supabase.from("wcbn_invoices").select("id, invoice_number, amount, currency_code, status").eq("id", data.invoiceId).single();
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "paid") throw new Error("This invoice is already paid.");

    const { data: profile } = await supabase.from("profiles").select("first_name, last_name, email, phone").eq("id", userId).maybeSingle();
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
        meta: { invoice_id: data.invoiceId },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string; data?: { link?: string } };
    if (!res.ok || body.status !== "success" || !body.data?.link) throw new Error(body.message ?? "Could not generate payment link.");
    return { link: body.data.link };
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
    const method = tx.payment_type === "card" ? "card" : "mobile_money";
    const ref = `${data.transactionId}${tx.flw_ref ? `/${tx.flw_ref}` : ""}`;
    let confirmError: { message: string } | null = null;
    if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.rpc("wcbn_confirm_payment", {
        _invoice_id: invoice.id, _method: method, _provider: "flutterwave", _reference: ref, _amount: Number(tx.amount),
      });
      confirmError = error;
    } else {
      const { error } = await context.supabase.rpc("wcbn_confirm_payment", {
        _invoice_id: invoice.id, _method: method, _provider: "flutterwave", _reference: ref, _amount: Number(tx.amount),
      });
      confirmError = error;
    }
    if (confirmError) throw new Error(confirmError.message);
    return { ok: true };
  });

/** Tells leadership whether payment gateway and backend service keys are configured. */
export const flutterwaveKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const key = process.env['FLUTTERWAVE_SECRET_KEY'];
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    return {
      configured: !!key,
      masked: key ? `${key.slice(0, 7)}...${key.slice(-4)}` : null,
      serviceRoleConfigured: !!serviceRoleKey,
      serviceRoleMasked: serviceRoleKey ? `${serviceRoleKey.slice(0, 8)}...${serviceRoleKey.slice(-4)}` : null,
    };
  });

/** Updates Payment Settings and optionally configures server keys. */
export const updatePaymentGatewaySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    flutterwave_enabled: z.boolean(),
    flutterwave_mode: z.enum(["test", "live"]),
    flutterwave_public_key: z.string().nullable().optional(),
    flutterwave_secret_key: z.string().nullable().optional(),
    supabase_service_role_key: z.string().nullable().optional(),
    mobile_money_enabled: z.boolean(),
    card_enabled: z.boolean(),
    bank_transfer_enabled: z.boolean(),
    bank_accounts: z.array(z.any()),
    invoice_note: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { flutterwave_secret_key, supabase_service_role_key, ...dbFields } = data;

    let updateError: { message: string } | null = null;
    const { error: userError } = await supabase.from("wcbn_payment_settings").update(dbFields).eq("id", 1);
    if (userError) {
      if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: adminError } = await supabaseAdmin.from("wcbn_payment_settings").update(dbFields).eq("id", 1);
        updateError = adminError;
      } else {
        updateError = userError;
      }
    }
    if (updateError) throw new Error(updateError.message);

    const envUpdates: Record<string, string> = {};
    if (flutterwave_secret_key && flutterwave_secret_key.trim().length > 0) {
      const cleanFlw = flutterwave_secret_key.trim();
      process.env['FLUTTERWAVE_SECRET_KEY'] = cleanFlw;
      envUpdates['FLUTTERWAVE_SECRET_KEY'] = cleanFlw;
    }
    if (supabase_service_role_key && supabase_service_role_key.trim().length > 0) {
      const cleanService = supabase_service_role_key.trim();
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = cleanService;
      envUpdates['SUPABASE_SERVICE_ROLE_KEY'] = cleanService;
    }

    if (Object.keys(envUpdates).length > 0) {
      try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const envPath = path.resolve(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          let content = fs.readFileSync(envPath, "utf-8");
          for (const [k, v] of Object.entries(envUpdates)) {
            const regex = new RegExp(`^${k}=.*$`, "m");
            if (regex.test(content)) {
              content = content.replace(regex, `${k}="${v}"`);
            } else {
              content += `\n${k}="${v}"\n`;
            }
          }
          fs.writeFileSync(envPath, content, "utf-8");
        }
      } catch (err) {
        console.error("Failed writing to .env", err);
      }
    }
    return { ok: true };
  });

/** Unregisters one or all WCBN members (cascades to applications, invoices, etc.) for testing purposes. */
export const unregisterWcbnMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    memberId: z.string().uuid().optional(),
    all: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isSuper } = await supabase.rpc("is_super_admin_user", { _user_id: userId });
    const { data: roles } = await supabase.from("wcbn_user_roles").select("id").eq("user_id", userId).eq("is_active", true).limit(1);
    if (!isSuper && !roles?.length) {
      throw new Error("Only WCBN leadership can unregister members.");
    }

    let client = supabase;
    if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin as any;
    }

    let deletedCount = 0;
    if (data.all) {
      // Clean up applications, invoices, and businesses first to guarantee clean slate
      await client.from("wcbn_invoices").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await client.from("wcbn_applications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { data: deleted, error } = await client
        .from("wcbn_members")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
        .select("id");
      if (error) throw new Error(error.message);
      deletedCount = deleted?.length ?? 0;
    } else if (data.memberId) {
      await client.from("wcbn_invoices").delete().eq("wcbn_member_id", data.memberId);
      await client.from("wcbn_applications").delete().eq("wcbn_member_id", data.memberId);
      const { data: deleted, error } = await client
        .from("wcbn_members")
        .delete()
        .eq("id", data.memberId)
        .select("id");
      if (error) throw new Error(error.message);
      deletedCount = deleted?.length ?? 0;
    }

    if (deletedCount === 0) {
      throw new Error(
        "Supabase RLS policy blocked member deletion. To allow unregistering from the portal, please add the DELETE policy in Supabase SQL editor or add your SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    return { ok: true, deletedCount };
  });
