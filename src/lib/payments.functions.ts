import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesUpdate } from "@/integrations/supabase/types";

const FLW = "https://api.flutterwave.com/v3";

type FlwCreds = { mode: "test" | "live"; publicKey: string | null; secretKey: string | null; encryptionKey: string | null };

/** Loads the Flutterwave credentials for the environment currently selected by leadership (sandbox or live). */
export async function getActiveFlutterwaveCreds(): Promise<FlwCreds> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("wcbn_payment_settings").select("flutterwave_mode").eq("id", 1).maybeSingle();
  const mode = (settings?.flutterwave_mode === "live" ? "live" : "test") as "test" | "live";
  const { data: row } = await (supabaseAdmin as any).from("wcbn_payment_credentials").select("public_key, secret_key, encryption_key").eq("mode", mode).maybeSingle();
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  let secretKey = clean(row?.secret_key);
  let encryptionKey = clean(row?.encryption_key);
  // Live mode falls back to the secure server secrets configured outside the database.
  if (mode === "live") {
    secretKey = secretKey ?? clean(process.env['FLUTTERWAVE_SECRET_KEY']);
    encryptionKey = encryptionKey ?? clean(process.env['FLUTTERWAVE_ENCRYPTION_KEY']);
  }
  return { mode, publicKey: clean(row?.public_key), secretKey, encryptionKey };
}

export async function getFlutterwaveSecretKey(_supabaseClient?: any): Promise<string | null> {
  return (await getActiveFlutterwaveCreds()).secretKey;
}

export async function getFlutterwaveEncryptionKey(_supabaseClient?: any): Promise<string | null> {
  return (await getActiveFlutterwaveCreds()).encryptionKey;
}

export async function getServiceRoleKey(_supabaseClient?: any): Promise<string | null> {
  const k = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  return k && k.trim() ? k.trim() : null;
}

/** Flutterwave 3DES payload encryption for direct card charge */
export function encryptCardPayload(encryptionKey: string, payload: Record<string, any>): string {
  try {
    const crypto = require("node:crypto");
    const text = JSON.stringify(payload);
    const cipher = crypto.createCipheriv("des-ede3", Buffer.from(encryptionKey, "utf8"), "");
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  } catch (err) {
    throw new Error(`Encryption failed: ${(err as Error).message}`);
  }
}

/** Normalizes mobile money phone numbers and intelligently detects carrier (e.g. MTN vs Orange for Cameroon/XAF) */
export function sanitizeMobileMoneyPhone(rawPhone: string, currency: string = "XAF"): {
  formattedPhone: string;
  detectedNetwork: "MTN" | "ORANGE" | undefined;
  country: string;
} {
  const digits = rawPhone.replace(/\D/g, "");
  if (currency === "XAF") {
    // Strip international dialing prefixes (e.g. 00237, 237) or trunk zero
    let localDigits = digits;
    if (localDigits.startsWith("00237")) {
      localDigits = localDigits.slice(5);
    } else if (localDigits.startsWith("237") && localDigits.length >= 12) {
      localDigits = localDigits.slice(3);
    } else if (localDigits.startsWith("0") && localDigits.length === 10) {
      localDigits = localDigits.slice(1);
    }

    const clean12 = localDigits.length === 9 ? `237${localDigits}` : (localDigits.length === 12 && localDigits.startsWith("237") ? localDigits : digits);

    let detected: "MTN" | "ORANGE" | undefined;
    if (localDigits.startsWith("6")) {
      const p2 = localDigits.slice(0, 2);
      const p3 = localDigits.slice(0, 3);
      // MTN Cameroon: 67x (670-679), 68x (680-689), 650-654
      if (p2 === "67" || p2 === "68" || ["650", "651", "652", "653", "654"].includes(p3)) {
        detected = "MTN";
      // Orange Cameroon: 69x (690-699), 655-659
      } else if (p2 === "69" || ["655", "656", "657", "658", "659"].includes(p3)) {
        detected = "ORANGE";
      }
    }
    return {
      formattedPhone: clean12,
      detectedNetwork: detected,
      country: "CM",
    };
  }
  return {
    formattedPhone: digits,
    detectedNetwork: undefined,
    country: currency === "XOF" ? "CI" : "CM",
  };
}

/** Creates the onboarding invoice(s) and, for mobile money / card, returns a Flutterwave checkout link. */
export const startOnboardingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    applicationId: z.string().uuid(), categoryId: z.string().uuid(),
    cycle: z.enum(["annual", "semi_annual", "quarterly"]), method: z.enum(["mobile_money", "card", "bank_transfer"]),
    origin: z.string().url(),
    momoPhone: z.string().optional(),
    momoNetwork: z.string().optional(),
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

    const secret = await getFlutterwaveSecretKey(supabase);
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
            phonenumber: (data.momoPhone || profile?.phone) ?? undefined,
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
    const secret = await getFlutterwaveSecretKey(supabase);
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
    const secret = await getFlutterwaveSecretKey(context.supabase);
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
    const serviceKey = await getServiceRoleKey(context.supabase);
    if (serviceKey) {
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

async function assertFinanceLeader(supabase: any, userId: string) {
  const { data: allowed } = await supabase.rpc("wcbn_has_permission", { _user_id: userId, _permission: "finance.manage" });
  if (!allowed) throw new Error("Only WCBN finance leadership can manage payment credentials.");
}

/** Returns sandbox and live credentials for the admin settings page (finance leaders only). */
export const getPaymentCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertFinanceLeader(context.supabase, context.userId);
    const { data } = await (context.supabase as any).from("wcbn_payment_credentials").select("mode, public_key, secret_key, encryption_key");
    const rows = (data ?? []) as { mode: string; public_key: string | null; secret_key: string | null; encryption_key: string | null }[];
    const pick = (m: string) => rows.find((r) => r.mode === m) ?? { mode: m, public_key: null, secret_key: null, encryption_key: null };
    const live = pick("live");
    return {
      test: pick("test"),
      live,
      liveServerSecretConfigured: !live.secret_key && !!process.env['FLUTTERWAVE_SECRET_KEY'],
    };
  });

/** Kept for compatibility: reports whether the active environment has a secret key. */
export const flutterwaveKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const c = await getActiveFlutterwaveCreds();
    return { configured: !!c.secretKey, encryptionConfigured: !!c.encryptionKey, serviceRoleConfigured: !!process.env['SUPABASE_SERVICE_ROLE_KEY'], mode: c.mode };
  });

const credSchema = z.object({
  public_key: z.string().max(200).nullable(),
  secret_key: z.string().max(200).nullable(),
  encryption_key: z.string().max(200).nullable(),
});

/** Saves payment settings plus separate sandbox and live credentials. */
export const updatePaymentGatewaySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    flutterwave_enabled: z.boolean(),
    flutterwave_mode: z.enum(["test", "live"]),
    mobile_money_enabled: z.boolean(),
    card_enabled: z.boolean(),
    bank_transfer_enabled: z.boolean(),
    bank_accounts: z.array(z.any()),
    invoice_note: z.string().nullable().optional(),
    test: credSchema,
    live: credSchema,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertFinanceLeader(supabase, userId);
    const t = (v: string | null) => (v && v.trim() ? v.trim() : null);

    for (const mode of ["test", "live"] as const) {
      const c = data[mode];
      const row: Record<string, unknown> = { mode, public_key: t(c.public_key), encryption_key: t(c.encryption_key) };
      // An empty live secret keeps whatever is stored; sandbox saves exactly what is shown.
      if (mode === "test" || t(c.secret_key)) row["secret_key"] = t(c.secret_key);
      const { error } = await (supabase as any).from("wcbn_payment_credentials").upsert(row, { onConflict: "mode" });
      if (error) throw new Error(error.message);
    }

    const activePublic = t(data[data.flutterwave_mode].public_key);
    const { error } = await supabase.from("wcbn_payment_settings").update({
      flutterwave_enabled: data.flutterwave_enabled,
      flutterwave_mode: data.flutterwave_mode,
      flutterwave_public_key: activePublic,
      mobile_money_enabled: data.mobile_money_enabled,
      card_enabled: data.card_enabled,
      bank_transfer_enabled: data.bank_transfer_enabled,
      bank_accounts: data.bank_accounts.filter((b: any) => !b || b._type !== "vault_secret"),
      invoice_note: data.invoice_note ?? null,
    } as never).eq("id", 1);
    if (error) throw new Error(error.message);
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
    const serviceKey = await getServiceRoleKey(supabase);
    if (serviceKey) {
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

async function confirmIfPaid(context: { supabase: any }, invoiceId: string, secret: string, q: { transactionId?: string | undefined; txRef?: string | undefined }) {
  const { data: invoice } = await context.supabase.from("wcbn_invoices").select("id, invoice_number, amount, currency_code, status").eq("id", invoiceId).maybeSingle();
  if (!invoice) throw new Error("Invoice not found for this account.");
  if (invoice.status === "paid") return "successful" as const;
  const url = q.transactionId
    ? `${FLW}/transactions/${encodeURIComponent(q.transactionId)}/verify`
    : `${FLW}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(q.txRef ?? "")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
  const body = (await res.json().catch(() => ({}))) as { data?: { id?: number; status?: string; tx_ref?: string; amount?: number; currency?: string; flw_ref?: string; payment_type?: string } };
  const tx = body.data;
  if (!tx || !tx.status) return "pending" as const;
  if (tx.status === "failed" || tx.status === "cancelled") return "failed" as const;
  if (tx.status !== "successful") return "pending" as const;
  if (!String(tx.tx_ref ?? "").startsWith(invoice.invoice_number) || tx.currency !== invoice.currency_code || Number(tx.amount) < Number(invoice.amount)) return "failed" as const;
  const args = { _invoice_id: invoice.id, _method: tx.payment_type === "card" ? "card" : "mobile_money", _provider: "flutterwave", _reference: `${tx.id}${tx.flw_ref ? `/${tx.flw_ref}` : ""}`, _amount: Number(tx.amount) };
  let client = context.supabase;
  const serviceKey = await getServiceRoleKey(context.supabase);
  if (serviceKey) client = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const { error } = await client.rpc("wcbn_confirm_payment", args);
  if (error) throw new Error(error.message);
  return "successful" as const;
}

/** Triggers an in-app mobile money push (customer approves on their phone). */
export const chargeMobileMoney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    invoiceId: z.string().uuid(),
    phone: z.string().min(8).max(25),
    network: z.string().max(25).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = await getFlutterwaveSecretKey(context.supabase);
    if (!secret) throw new Error("Online payments are not configured. Please contact administration or pay via bank transfer.");
    const { data: invoice } = await context.supabase.from("wcbn_invoices").select("invoice_number, amount, currency_code, status").eq("id", data.invoiceId).single();
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "paid") return { txRef: invoice.invoice_number, redirect: null as string | null };
    const { data: profile } = await context.supabase.from("profiles").select("first_name, last_name, email").eq("id", context.userId).maybeSingle();
    const cur = invoice.currency_code;
    const type = cur === "GHS" ? "mobile_money_ghana" : cur === "UGX" ? "mobile_money_uganda" : cur === "RWF" ? "mobile_money_rwanda" : cur === "ZMW" ? "mobile_money_zambia" : cur === "KES" ? "mpesa" : "mobile_money_franco";
    const txRef = `${invoice.invoice_number}-${Date.now()}`;

    const { formattedPhone, detectedNetwork, country } = sanitizeMobileMoneyPhone(data.phone, cur);
    // Intelligent auto-detection has highest priority, ensuring correct operator is always used
    const chosenNetwork = detectedNetwork || (data.network && data.network.trim().length > 0 ? data.network.trim().toUpperCase() : "MTN");

    const payload: Record<string, any> = {
      tx_ref: txRef,
      amount: Number(invoice.amount),
      currency: cur,
      phone_number: formattedPhone,
      email: profile?.email ?? "member@wcbn.org",
      fullname: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "WCBN member",
      country: cur === "XAF" ? "CM" : cur === "XOF" ? "CI" : country,
      meta: { invoice_id: data.invoiceId },
    };

    if (cur === "XAF" || cur === "XOF") {
      // Franco Mobile Money requires explicit network (MTN or ORANGE)
      payload["network"] = chosenNetwork;
    } else if (data.network) {
      payload["network"] = data.network;
    }

    const res = await fetch(`${FLW}/charges?type=${type}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string; meta?: { authorization?: { mode?: string; redirect?: string; instruction?: string } } };
    if (!res.ok || body.status !== "success") {
      throw new Error(body.message ?? "Could not start mobile money payment. Please verify the phone number and network.");
    }
    const auth = body.meta?.authorization;
    return {
      txRef,
      redirect: auth?.mode === "redirect" ? auth.redirect ?? null : null,
      instruction: auth?.instruction ?? null,
    };
  });

/** Checks a pending in-app payment and activates membership once successful. */
export const checkPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ invoiceId: z.string().uuid(), txRef: z.string().max(120).optional(), transactionId: z.string().max(40).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = await getFlutterwaveSecretKey(context.supabase);
    if (!secret) throw new Error("Online payments are not configured.");
    const status = await confirmIfPaid(context, data.invoiceId, secret, { txRef: data.txRef, transactionId: data.transactionId });
    return { status };
  });

/** Initiates in-app card charge using Flutterwave direct API with 3DES encryption */
export const chargeCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    invoiceId: z.string().uuid(),
    cardNumber: z.string().min(12).max(24),
    cvv: z.string().min(3).max(4),
    expiryMonth: z.string().min(1).max(2),
    expiryYear: z.string().min(2).max(4),
    cardholderName: z.string().min(2).max(100).optional(),
    origin: z.string().url().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const secret = await getFlutterwaveSecretKey(supabase);
    if (!secret) throw new Error("Online card payments are not configured. Please choose bank transfer or contact support.");

    const { data: invoice } = await supabase.from("wcbn_invoices").select("invoice_number, amount, currency_code, status").eq("id", data.invoiceId).single();
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "paid") return { txRef: invoice.invoice_number, redirect: null as string | null };

    const { data: profile } = await supabase.from("profiles").select("first_name, last_name, email, phone").eq("id", userId).maybeSingle();
    const encKey = await getFlutterwaveEncryptionKey(supabase);

    const txRef = `${invoice.invoice_number}-${Date.now()}`;
    const cleanCard = data.cardNumber.replace(/\s+/g, "");
    const cleanYear = data.expiryYear.length === 2 ? `20${data.expiryYear}` : data.expiryYear;
    const cleanMonth = data.expiryMonth.padStart(2, "0");

    const cardPayload: Record<string, any> = {
      card_number: cleanCard,
      cvv: data.cvv,
      expiry_month: cleanMonth,
      expiry_year: cleanYear,
      currency: invoice.currency_code,
      amount: Number(invoice.amount),
      email: profile?.email ?? "member@wcbn.org",
      fullname: data.cardholderName || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "WCBN member",
      tx_ref: txRef,
      redirect_url: data.origin ? `${data.origin}/portal/application` : undefined,
      meta: { invoice_id: data.invoiceId },
    };

    let requestBody: Record<string, any>;
    if (encKey) {
      const encrypted = encryptCardPayload(encKey, cardPayload);
      requestBody = { client: encrypted };
    } else {
      requestBody = cardPayload;
    }

    const res = await fetch(`${FLW}/charges?type=card`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const body = (await res.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
      meta?: { authorization?: { mode?: string; redirect?: string; instruction?: string; validate_instructions?: string } };
      data?: { id?: number; tx_ref?: string; status?: string; auth_url?: string };
    };

    if (!res.ok || body.status !== "success") {
      throw new Error(body.message ?? "Could not process card payment. Please verify card number, expiration, and CVV.");
    }

    const auth = body.meta?.authorization;
    const redirectUrl = auth?.redirect ?? body.data?.auth_url ?? null;
    return {
      txRef,
      redirect: redirectUrl,
      mode: auth?.mode ?? null,
      instruction: auth?.instruction ?? auth?.validate_instructions ?? null,
    };
  });
