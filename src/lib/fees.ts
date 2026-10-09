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

export type CategoryArchetype = "entrepreneur" | "investor_mentor";

export const ARCHETYPES: { value: CategoryArchetype; label: string; blurb: string; badge: string; dbType: "business" | "professional" }[] = [
  { value: "entrepreneur", label: "Entrepreneur / Business Owner", blurb: "For founders, startup owners, and enterprise leaders building commercial businesses", badge: "Entrepreneur Track", dbType: "business" },
  { value: "investor_mentor", label: "Investor / Mentor / Strategic Partner", blurb: "For angel investors, executives, strategic mentors, and board advisors", badge: "Investor & Mentor Track", dbType: "professional" },
];

export function getCategoryArchetype(category?: { applicant_type?: string | null; code?: string | null } | null): CategoryArchetype {
  if (!category) return "entrepreneur";
  if (category.applicant_type === "professional" || category.applicant_type === "investor_mentor" || category.code === "mentor") {
    return "investor_mentor";
  }
  return "entrepreneur";
}

export function archetypeLabel(archetype?: string | null): string {
  return archetype === "investor_mentor" || archetype === "professional" ? "Investor / Mentor" : "Entrepreneur";
}

export function archetypeToDbType(archetype: CategoryArchetype): "business" | "professional" {
  return archetype === "investor_mentor" ? "professional" : "business";
}

export function dbTypeToArchetype(dbType?: string | null): CategoryArchetype {
  return dbType === "professional" || dbType === "investor_mentor" ? "investor_mentor" : "entrepreneur";
}

export type Category = {
  id: string; code: string; name: string; description: string | null; target_audience: string | null;
  applicant_type: "business" | "professional" | "any" | "entrepreneur" | "investor_mentor"; fees: Record<string, number>; benefits: string[];
  allow_installments: boolean; display_order: number; is_active: boolean;
};

export type BankAccount = { bank_name: string; account_name: string; account_number: string; swift?: string; branch?: string; currency?: string; instructions?: string };

export type PaymentSettings = {
  flutterwave_enabled: boolean; flutterwave_mode: "test" | "live"; flutterwave_public_key: string | null;
  mobile_money_enabled: boolean; card_enabled: boolean; bank_transfer_enabled: boolean;
  bank_accounts: BankAccount[]; invoice_note: string | null;
};

export type ExchangeRate = {
  id: string;
  base_code: string;
  quote_code: string;
  ask: number;
  bid: number;
  mid: number | null;
  is_active: boolean;
};

/** Annual fee for a currency; mirrors the database rule (direct fee first, then exchange-rate conversion happens server side). */
export function annualFee(category: Category, currency: string, rates: ExchangeRate[] = []) {
  if (!category || !category.fees) return null;
  const v = category.fees[currency];
  if (typeof v === "number" && v > 0) return v;
  if (v && Number(v) > 0) return Number(v);

  // If no direct fee configured for this currency, convert using active exchange rates
  if (rates && rates.length > 0) {
    // 1. Direct rate: base in category fees -> quote = applicant's currency
    for (const r of rates) {
      if (r.quote_code === currency && category.fees[r.base_code]) {
        const baseFee = Number(category.fees[r.base_code]);
        const rate = r.mid ?? r.ask;
        if (baseFee > 0 && rate > 0) {
          const converted = baseFee * rate;
          return currency === "XAF" ? Math.round(converted) : Math.round(converted * 100) / 100;
        }
      }
    }
    // 2. Inverse rate: base = applicant's currency -> quote in category fees
    for (const r of rates) {
      if (r.base_code === currency && category.fees[r.quote_code]) {
        const quoteFee = Number(category.fees[r.quote_code]);
        const rate = r.mid ?? r.ask;
        if (quoteFee > 0 && rate > 0) {
          const converted = quoteFee / rate;
          return currency === "XAF" ? Math.round(converted) : Math.round(converted * 100) / 100;
        }
      }
    }
  }

  // Fallback to primary configured fee (XAF, then USD, then EUR, then first available)
  const fallbackKey = ["XAF", "USD", "EUR"].find((k) => category.fees[k]) ?? Object.keys(category.fees)[0];
  if (fallbackKey && category.fees[fallbackKey]) {
    return Number(category.fees[fallbackKey]);
  }
  return null;
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

export async function fetchExchangeRates() {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("id, base_code, quote_code, ask, bid, mid, is_active")
    .eq("is_active", true);
  if (error) return [];
  return (data ?? []) as ExchangeRate[];
}

export async function fetchPaymentSettings() {
  const { data, error } = await supabase.from("wcbn_payment_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return (data ?? { flutterwave_enabled: false, flutterwave_mode: "test", flutterwave_public_key: null, mobile_money_enabled: true, card_enabled: true, bank_transfer_enabled: true, bank_accounts: [], invoice_note: null }) as unknown as PaymentSettings;
}
