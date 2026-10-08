import { supabase } from "@/integrations/supabase/client";

export type BillingCycle = "annual" | "semi_annual" | "quarterly";
export type PaymentMethod = "mobile_money" | "card" | "bank_transfer";

export const CYCLES: { value: BillingCycle; label: string; parts: number; blurb: string }[] = [
  { value: "annual", label: "One-time (annual)", parts: 1, blurb: "Pay the full year now" },
  { value: "semi_annual", label: "Semi-annual", parts: 2, blurb: "2 instalments, every 6 months" },
  { value: "quarterly", label: "Quarterly", parts: 4, blurb: "4 instalments, every 3 months" },
];

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  mobile_money: "Mobile money",
  card: "Bank card",
  bank_transfer: "Bank transfer",
};

export type Category = {
  id: string; code: string; name: string; description: string | null; target_audience: string | null;
  applicant_type: "business" | "professional" | "any"; fees: Record<string, number>; benefits: string[];
  allow_installments: boolean; display_order: number; is_active: boolean;
};

export type BankAccount = { bank_name: string; account_name: string; account_number: string; swift?: string; branch?: string; currency?: string; instructions?: string };

export type PaymentSettings = {
  flutterwave_enabled: boolean; flutterwave_mode: "test" | "live"; flutterwave_public_key: string | null;
  mobile_money_enabled: boolean; card_enabled: boolean; bank_transfer_enabled: boolean;
  bank_accounts: BankAccount[]; invoice_note: string | null;
};

/** Annual fee for a currency; mirrors the database rule (direct fee first, then exchange-rate conversion happens server side). */
export function annualFee(category: Category, currency: string) {
  const v = category.fees?.[currency];
  return typeof v === "number" ? v : v ? Number(v) : null;
}

export function instalment(annual: number, cycle: BillingCycle, currency: string) {
  const parts = CYCLES.find((c) => c.value === cycle)!.parts;
  const raw = annual / parts;
  return currency === "XAF" ? Math.round(raw) : Math.round(raw * 100) / 100;
}

export async function fetchCategories(includeInactive = false) {
  let q = supabase.from("wcbn_membership_categories").select("*").order("display_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Category[];
}

export async function fetchPaymentSettings() {
  const { data, error } = await supabase.from("wcbn_payment_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return (data ?? { flutterwave_enabled: false, flutterwave_mode: "test", flutterwave_public_key: null, mobile_money_enabled: true, card_enabled: true, bank_transfer_enabled: true, bank_accounts: [], invoice_note: null }) as unknown as PaymentSettings;
}
