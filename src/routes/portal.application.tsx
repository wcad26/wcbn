import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, CheckCircle2, CreditCard, FileUp, Landmark, Loader2,
  Save, Send, Smartphone, Sparkles, UserRound, XCircle, ChevronRight, HelpCircle,
  Clock, Info
} from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  COUNTRIES, SDGS, SECTORS, type Track,
  ensureWcbnMember, stagesFor, useIdentity, useInvalidateIdentity,
  money, uploadDocument,
} from "@/lib/wcbn";
import {
  CYCLES, METHOD_LABELS, annualFee, fetchCategories, fetchExchangeRates, fetchPaymentSettings,
  instalment, getCategoryArchetype, archetypeToDbType,
  type BillingCycle, type PaymentMethod, type CategoryArchetype, type Category
} from "@/lib/fees";
import { createFlutterwavePaymentLink, startOnboardingPayment, verifyFlutterwavePayment } from "@/lib/payments.functions";
import { InvoiceCard, type InvoiceRow } from "@/components/wcbn/invoice-card";

export const Route = createFileRoute("/portal/application")({ component: ApplicationPage });

export const BUSINESS_STAGES = [
  "Idea / Early Prototype",
  "Startup (Operating < 1 year)",
  "Early Growth (Operating 1–3 years)",
  "Established Business (Operating 3–5 years)",
  "Mature Enterprise (Operating 5+ years)",
] as const;

export const GROWTH_PRIORITIES = [
  "Market Access & Client Acquisition",
  "Capital & Investment Funding",
  "Executive Mentorship & Strategy",
  "B2B Partnerships & Supply Chains",
  "Export & Cross-Border Trade",
  "Talent & Leadership Development",
] as const;

export const INVESTOR_ROLES = [
  "Angel Investor",
  "Venture Capital / Private Equity Partner",
  "Executive Mentor / Leadership Coach",
  "Strategic Board Advisor / Non-Exec Director",
  "Family Office / Wealth Steward",
  "Industry & Subject Matter Expert",
] as const;

export const ADVISORY_DOMAINS = [
  "Corporate Strategy & Governance",
  "Fundraising & Investment Readiness",
  "Sales, Marketing & Go-To-Market",
  "Financial Management & M&A",
  "Technology, AI & Digital Transformation",
  "Operations, Logistics & Scaling",
  "Legal, Regulatory & Risk Management",
] as const;

export const TICKET_SIZES = [
  "Advisory & Mentorship Only (Non-financial)",
  "Micro-Angel (Under $5,000 / 3M XAF)",
  "Seed Investment ($5,000 – $25,000 / 3M–15M XAF)",
  "Growth Investment ($25,000 – $100,000 / 15M–60M XAF)",
  "Scale / Institutional ($100,000+ / 60M+ XAF)",
] as const;

export const MENTORSHIP_AVAILABILITY = [
  "1–2 hours per month (Advisory clinics)",
  "3–5 hours per month (Active 1-on-1 coaching)",
  "Quarterly strategic reviews & board sessions",
  "Event pitch judging & masterclass teaching",
] as const;

// 4 streamlined onboarding steps
const STEPS = [
  "Membership Category",
  "Registration Details",
  "Billing & Payment Method",
  "Review & Confirm",
] as const;

type Answers = {
  // Shared
  country: string;
  city: string;
  sdgs: number[];

  // Entrepreneur fields
  business_name: string;
  sector: string;
  business_stage: string;
  business_summary: string;
  growth_priorities: string[];
  website_url: string;
  registration_number: string;
  impact_statement: string;

  // Investor / Mentor fields
  investor_role: string;
  organization: string;
  linkedin_url: string;
  advisory_areas: string[];
  preferred_sectors: string;
  ticket_size: string;
  mentorship_availability: string;
  experience_summary: string;
  kingdom_vision: string;
};

const EMPTY: Answers = {
  country: "",
  city: "",
  sdgs: [],

  business_name: "",
  sector: "",
  business_stage: "",
  business_summary: "",
  growth_priorities: [],
  website_url: "",
  registration_number: "",
  impact_statement: "",

  investor_role: "",
  organization: "",
  linkedin_url: "",
  advisory_areas: [],
  preferred_sectors: "",
  ticket_size: "",
  mentorship_availability: "",
  experience_summary: "",
  kingdom_vision: "",
};

const DRAFT_KEY_PREFIX = "wcbn_application_draft_";

function ApplicationPage() {
  const { data: identity, isLoading: identityLoading } = useIdentity();
  const refreshIdentity = useInvalidateIdentity();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const wcbnId = identity?.wcbnMember?.id;
  const [categoryId, setCategoryId] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [transferRef, setTransferRef] = useState("");
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [agreeCovenant, setAgreeCovenant] = useState(false);
  const currency = identity?.regionCurrency ?? "XAF";

  const draftKey = identity?.userId ? `${DRAFT_KEY_PREFIX}${identity.userId}` : null;
  const isInitializedRef = useRef(false);

  const { data: categories = [] } = useQuery({ queryKey: ["wcbn", "categories"], queryFn: () => fetchCategories() });
  const { data: exchangeRates = [] } = useQuery({ queryKey: ["wcbn", "exchange-rates"], queryFn: fetchExchangeRates });
  const { data: settings } = useQuery({ queryKey: ["wcbn", "payment-settings"], queryFn: fetchPaymentSettings });

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "application", wcbnId],
    enabled: !!wcbnId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: application } = await supabase.from("wcbn_applications").select("*").eq("wcbn_member_id", wcbnId!).maybeSingle();
      const stages = application
        ? await supabase.from("wcbn_application_stages").select("*").eq("application_id", application.id).order("created_at")
        : { data: [] };
      const invoices = application
        ? await supabase.from("wcbn_invoices").select("*, wcbn_membership_categories(name), wcbn_payments(id, status, reference, created_at)").eq("application_id", application.id).order("installment_number")
        : { data: [] };
      return { application, stages: stages.data ?? [], invoices: (invoices.data ?? []) as (InvoiceRow & { wcbn_payments: { id: string; status: string; reference: string | null }[] | null })[] };
    },
  });

  const application = data?.application;

  // Restore draft from localStorage or initial application data from server
  useEffect(() => {
    if (!identity?.userId || isInitializedRef.current) return;

    let restoredFromStorage = false;
    if (draftKey) {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            if (parsed.answers) setAnswers(parsed.answers);
            if (parsed.categoryId) setCategoryId(parsed.categoryId);
            if (parsed.cycle) setCycle(parsed.cycle);
            if (parsed.method) setMethod(parsed.method);
            if (typeof parsed.step === "number" && parsed.step >= 0 && parsed.step <= 3) {
              setStep(parsed.step);
            }
            restoredFromStorage = true;
          }
        }
      } catch {
        // ignore parse error
      }
    }

    if (!restoredFromStorage && application?.applicant_data) {
      const d = application.applicant_data as Partial<Answers> & {
        category_id?: string;
        billing_cycle?: BillingCycle;
        payment_method?: PaymentMethod;
      };
      setAnswers({ ...EMPTY, ...d });
      if (d.category_id) setCategoryId(d.category_id);
      if (d.billing_cycle) setCycle(d.billing_cycle);
      if (d.payment_method) setMethod(d.payment_method);
    }

    isInitializedRef.current = true;
  }, [identity?.userId, draftKey, application]);

  // Returning from Flutterwave checkout: verify the transaction, then activate.
  const verify = useMutation({
    mutationFn: (v: { transactionId: string; txRef: string }) => verifyFlutterwavePayment({ data: v }),
    onSuccess: () => {
      toast.success("Payment confirmed — welcome to WCBN!");
      refreshIdentity();
      queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const status = q.get("status");
    const txRef = q.get("tx_ref");
    const transactionId = q.get("transaction_id");
    if (!status) return;
    window.history.replaceState({}, "", window.location.pathname);
    if ((status === "successful" || status === "completed") && txRef && transactionId) {
      verify.mutate({ txRef, transactionId });
    } else {
      toast.error("The payment was cancelled. You can try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const archetype: CategoryArchetype = getCategoryArchetype(selectedCategory);
  const isInvestorMentor = archetype === "investor_mentor";
  const fee = selectedCategory ? annualFee(selectedCategory, currency, exchangeRates) : null;
  const onlineOn = !!settings?.flutterwave_enabled;

  const methods: { value: PaymentMethod; icon: typeof Smartphone; on: boolean; hint: string }[] = [
    { value: "mobile_money", icon: Smartphone, on: onlineOn && !!settings?.mobile_money_enabled, hint: "Instant member activation" },
    { value: "card", icon: CreditCard, on: onlineOn && !!settings?.card_enabled, hint: "Instant member activation" },
    { value: "bank_transfer", icon: Landmark, on: !!settings?.bank_transfer_enabled, hint: "Activated once finance confirms" },
  ];

  const eligible = !!identity?.member || !!identity?.userId;
  const dcgPending = !identity?.dcgActive;
  const firstInvoice = data?.invoices?.[0];
  const hasUnpaidInvoice = !!firstInvoice && Number(firstInvoice.paid_amount) < Number(firstInvoice.amount);
  const awaitingPayment = (application?.status === "awaiting_payment" || (hasUnpaidInvoice && application?.status !== "approved" && application?.status !== "inducted")) && !editingPlan;
  const submitted = !!application?.status && application.status !== "draft" && !awaitingPayment && !editingPlan;
  const dbTrack: Track = archetypeToDbType(archetype);
  const trackStages = stagesFor(dbTrack);
  const stageIndex = trackStages.findIndex((s) => s.code === application?.current_stage);

  // Auto-save progress into localStorage on any change
  useEffect(() => {
    if (!draftKey || !isInitializedRef.current || submitted || awaitingPayment) return;
    try {
      const draft = {
        step,
        categoryId,
        cycle,
        method,
        answers,
        updatedAt: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draftKey, step, categoryId, cycle, method, answers, submitted, awaitingPayment]);

  // Clear draft on successful payment or submission
  useEffect(() => {
    if ((submitted || awaitingPayment) && draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    }
  }, [submitted, awaitingPayment, draftKey]);

  // Form completion validation
  const entrepreneurRequired: (keyof Answers)[] = ["business_name", "sector", "country", "city", "business_summary", "impact_statement"];
  const investorRequired: (keyof Answers)[] = ["investor_role", "country", "city", "linkedin_url", "experience_summary", "kingdom_vision"];
  const currentRequired = isInvestorMentor ? investorRequired : entrepreneurRequired;

  const missingFormFields = currentRequired.filter((f) => {
    const val = answers[f];
    if (Array.isArray(val)) return val.length === 0;
    return !String(val ?? "").trim();
  });

  const completion = useMemo(() => {
    const fields = currentRequired;
    const done = fields.filter((f) => {
      const val = answers[f];
      if (Array.isArray(val)) return val.length > 0;
      return String(val ?? "").trim().length > 0;
    }).length;
    return Math.round((done / fields.length) * 100);
  }, [answers, currentRequired]);

  // Contextual category resolution (Diaspora vs. Local)
  const isDiasporaApplicant = useMemo(() => {
    const code = (identity?.regionCode ?? "").toUpperCase();
    const name = (identity?.regionName ?? "").toLowerCase();
    const curr = (identity?.regionCurrency ?? "XAF").toUpperCase();

    if (code.includes("EU") || code.includes("NA") || code.includes("US") || code.includes("UK")) return true;
    if (name.includes("europe") || name.includes("north america") || name.includes("diaspora") || name.includes("international")) return true;
    if (curr !== "XAF") return true;
    return false;
  }, [identity]);

  const visibleCategories = useMemo(() => {
    return categories.filter((c) => {
      const isInvestorOrMentor = getCategoryArchetype(c) === "investor_mentor" || c.code === "mentor";
      if (isInvestorOrMentor) return true; // Mentors & Investors always visible to both local and diaspora

      const isDiasporaCategory =
        c.code === "diaspora" ||
        (c.target_audience ?? "").toLowerCase().includes("diaspora") ||
        (c.target_audience ?? "").toLowerCase().includes("international");

      if (isDiasporaApplicant) {
        return isDiasporaCategory;
      } else {
        return !isDiasporaCategory;
      }
    });
  }, [categories, isDiasporaApplicant]);

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!identity) throw new Error("Not signed in");
      if (!categoryId) throw new Error("Please select a membership category first.");

      const memberId = await ensureWcbnMember(identity, dbTrack);
      await supabase.from("wcbn_members").update({ member_type: dbTrack }).eq("id", memberId);

      const { data: version } = await supabase
        .from("wcbn_criteria_versions")
        .select("id")
        .eq("is_active", true)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!version) throw new Error("No active criteria version has been configured yet.");

      const payload = {
        wcbn_member_id: memberId,
        criteria_version_id: version.id,
        applicant_type: dbTrack,
        applicant_data: {
          ...answers,
          category_id: categoryId,
          billing_cycle: cycle,
          payment_method: method,
          archetype,
        },
        wca_verified: !!identity.wcaActive,
        dcg_verified: !!identity.dcgActive,
      };

      let applicationId = application?.id;
      if (application) {
        const { error } = await supabase.from("wcbn_applications").update(payload).eq("id", application.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from("wcbn_applications").insert(payload).select("id").single();
        if (error) throw error;
        applicationId = created.id;
      }

      if (submit) {
        if (!method) throw new Error("Please choose a payment method.");
        const res = await startOnboardingPayment({
          data: {
            applicationId: applicationId!,
            categoryId,
            cycle,
            method,
            origin: window.location.origin,
          },
        });
        if (res.link) {
          window.location.href = res.link;
          return "redirect";
        }
        return "invoice";
      }
      return "saved";
    },
    onSuccess: (result) => {
      if (draftKey) {
        try { localStorage.removeItem(draftKey); } catch {}
      }
      if (result === "redirect") {
        toast.message("Redirecting to secure Flutterwave checkout…");
        return;
      }
      toast.success(result === "invoice" ? "Invoice generated! Complete your transfer to activate." : "Progress saved successfully");
      refreshIdentity();
      queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const declared = (firstInvoice?.wcbn_payments ?? []).some((p) => p.status === "pending" || p.status === "declared");

  const declareTransfer = useMutation({
    mutationFn: async () => {
      if (!identity || !firstInvoice) throw new Error("No invoice found");
      const proofPath = transferProof ? await uploadDocument(identity.userId, "payments", transferProof) : null;
      const { error } = await supabase.from("wcbn_payments").insert({
        invoice_id: firstInvoice.id,
        amount: Number(firstInvoice.amount),
        currency_code: firstInvoice.currency_code,
        method: "bank_transfer",
        provider: "bank",
        reference: transferRef || null,
        proof_url: proofPath,
        status: "pending",
        submitted_by: identity.userId,
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transfer details submitted! Leadership will verify and activate your membership.");
      queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payExistingInvoice = useMutation({
    mutationFn: async (m: "mobile_money" | "card") => {
      if (!firstInvoice) throw new Error("No invoice found");
      const res = await createFlutterwavePaymentLink({ data: { invoiceId: firstInvoice.id, method: m, origin: window.location.origin } });
      if (res.link) {
        window.location.href = res.link;
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  const toggleArrayItem = (key: "growth_priorities" | "advisory_areas", item: string) => {
    setAnswers((prev) => {
      const list = prev[key];
      const exists = list.includes(item);
      return {
        ...prev,
        [key]: exists ? list.filter((x) => x !== item) : [...list, item],
      };
    });
  };

  const busy = (identityLoading && !identity) || (isLoading && !data && !!wcbnId) || verify.isPending;

  if (busy) {
    return (
      <MemberPage title="My application" description="Loading your application details…">
        <div className="space-y-6">
          <div className="h-32 animate-pulse rounded-3xl border border-border bg-card shadow-card" />
          <div className="h-64 animate-pulse rounded-3xl border border-border bg-card shadow-card" />
        </div>
      </MemberPage>
    );
  }

  return (
    <MemberPage
      title="WCBN Membership Onboarding"
      description={
        verify.isPending
          ? "Confirming your payment…"
          : awaitingPayment
          ? "Review your invoice and complete your payment to activate membership."
          : submitted
          ? "Your application is being processed by leadership."
          : "Complete the streamlined onboarding steps and join World Changers Business Network."
      }
    >
      <div className="space-y-6">
        {/* Verification Status Header */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Verified Credentials from WCA
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your profile is verified via your World Changers Association account.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                {identity?.wcaActive ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5 text-amber-600" />}
                WCA Member ({identity?.member?.member_id ?? (identity?.wcaActive ? "Active" : "Registered")})
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                {identity?.dcgActive ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5 text-amber-600" />}
                DCG ({identity?.dcgName ?? (identity?.dcgActive ? "Active" : "In Review")})
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                Region: <strong className="text-foreground">{identity?.regionName ?? "WCA Region"}</strong> ({currency})
              </span>
            </div>
          </div>
          {dcgPending && (
            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Info className="size-4 shrink-0 mt-0.5" />
              <span>
                <strong>DCG Assignment in Progress:</strong> You can complete and submit your application now. Your Destiny Care Group (DCG) connection will be verified by regional leadership during onboarding review.
              </span>
            </div>
          )}
        </section>

        {/* INVOICE & PAYMENT VIEW (When invoice has already been generated) */}
        {awaitingPayment && firstInvoice && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Membership Fee Invoice</h2>
                <p className="text-xs text-muted-foreground">
                  Invoice #{firstInvoice.invoice_number} · Generated in your regional currency ({firstInvoice.currency_code})
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingPlan(true);
                  setStep(0);
                }}
              >
                Change Category or Plan
              </Button>
            </div>

            <InvoiceCard
              invoice={firstInvoice}
              memberName={identity?.fullName}
              bankAccounts={settings?.bank_accounts}
              note={settings?.invoice_note}
            />

            {(firstInvoice.installments_total ?? 1) > 1 && (data?.invoices?.length ?? 0) > 1 && (
              <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Instalment Schedule</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2">Instalment</th>
                        <th className="pb-2">Due Date</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data?.invoices?.map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-2.5 font-medium">
                            {inv.installment_number} of {inv.installments_total}
                          </td>
                          <td className="py-2.5 text-muted-foreground">{inv.due_date}</td>
                          <td className="py-2.5 font-semibold">{money(Number(inv.amount), inv.currency_code)}</td>
                          <td className="py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                                inv.status === "paid" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Complete Payment</h3>

              {onlineOn && (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-sm">Instant Online Payment (Flutterwave)</p>
                      <p className="text-xs text-muted-foreground">
                        Instant activation upon payment. Supports Orange Money, MTN MoMo, Moov, Visa, and Mastercard.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {settings?.mobile_money_enabled && (
                        <Button size="sm" disabled={payExistingInvoice.isPending} onClick={() => payExistingInvoice.mutate("mobile_money")}>
                          {payExistingInvoice.isPending ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
                          Pay with Mobile Money
                        </Button>
                      )}
                      {settings?.card_enabled && (
                        <Button size="sm" variant="outline" disabled={payExistingInvoice.isPending} onClick={() => payExistingInvoice.mutate("card")}>
                          {payExistingInvoice.isPending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                          Pay with Card
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-border pt-4">
                <p className="font-semibold text-sm">Pay by Bank Transfer</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Transfer to any of the official bank accounts listed on your invoice above, then submit your slip reference here.
                </p>

                {declared ? (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary font-medium">
                    <CheckCircle2 className="size-4" /> Transfer details received. Leadership will verify and activate your membership shortly.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <Field label="Bank transfer reference">
                      <Input value={transferRef} onChange={(e) => setTransferRef(e.target.value)} placeholder="Reference on your bank slip" />
                    </Field>
                    <Field label="Receipt / Slip (optional)">
                      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 text-sm hover:border-primary/50">
                        <FileUp className="size-4" />
                        <span className="truncate">{transferProof ? transferProof.name : "Attach receipt"}</span>
                        <input type="file" className="hidden" onChange={(e) => setTransferProof(e.target.files?.[0] ?? null)} />
                      </label>
                    </Field>
                    <Button disabled={declareTransfer.isPending || !transferRef} onClick={() => declareTransfer.mutate()}>
                      {declareTransfer.isPending ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
                      Submit transfer details
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* 4-STEP STREAMLINED WIZARD VIEW */}
        {!busy && !submitted && !awaitingPayment && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            {/* Step Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  Step {step + 1} of {STEPS.length}: {STEPS[step]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedCategory && (
                    <span className="font-semibold text-primary mr-2">
                      {isInvestorMentor ? "💎 Investor & Mentor Track" : "🚀 Entrepreneur Track"}
                    </span>
                  )}
                  {step === 1 && `Form ${completion}% completed`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full gradient-brand transition-all duration-300"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Mobile View: Active Step Pill Only */}
            <div className="sm:hidden mb-6 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full gradient-brand text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs">
                Step {step + 1} of {STEPS.length}: {STEPS[step]}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {step === 1 && `${completion}% done`}
              </span>
            </div>

            {/* Desktop View: Full Step Numbered Breadcrumb Pills */}
            <ol className="hidden sm:flex mb-8 flex-wrap gap-2">
              {STEPS.map((label, i) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (i > step) {
                        if (!categoryId && i > 0) {
                          toast.error("Please select a membership category first.");
                          return;
                        }
                        if (step === 1 && missingFormFields.length > 0 && i > 1) {
                          toast.error("Please complete the required registration fields first.");
                          return;
                        }
                        if (step === 2 && (!cycle || !method) && i > 2) {
                          toast.error("Please select a billing plan and payment method.");
                          return;
                        }
                      }
                      setStep(i);
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      step === i
                        ? "gradient-brand text-white shadow-sm"
                        : i < step
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {i + 1}. {label}
                  </button>
                </li>
              ))}
            </ol>

            <fieldset disabled={submitted} className="contents">
              {/* STEP 0: CATEGORY SELECTION (Contextual Local vs. Diaspora, No Filter Buttons) */}
              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Choose Your Membership Category</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isDiasporaApplicant
                        ? "Displaying international & diaspora categories configured for your region."
                        : "Displaying local categories configured for your region."}{" "}
                      Fees are displayed in your regional currency ({currency}).
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleCategories.map((c) => {
                      const on = c.id === categoryId;
                      const f = annualFee(c, currency, exchangeRates);
                      const isInv = getCategoryArchetype(c) === "investor_mentor";

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setCategoryId(c.id);
                            if (!c.allow_installments) setCycle("annual");
                          }}
                          className={`cursor-pointer rounded-2xl border p-5 text-left transition flex flex-col justify-between ${
                            on
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                              : "border-border hover:border-primary/40 bg-card hover:bg-muted/30"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                  isInv
                                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200/50"
                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200/50"
                                }`}
                              >
                                {isInv ? "💎 Investor & Mentor Track" : "🚀 Entrepreneur Track"}
                              </span>
                              <span className="text-base font-extrabold text-foreground">
                                {f != null ? `${money(f, currency)}/yr` : "Dynamic Fee"}
                              </span>
                            </div>

                            <h4 className="mt-2 text-base font-bold text-foreground">{c.name}</h4>
                            {c.description && <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>}
                            {c.target_audience && (
                              <p className="mt-1 text-[11px] text-muted-foreground font-medium">
                                Target audience: <span className="text-foreground">{c.target_audience}</span>
                              </p>
                            )}

                            {c.benefits && c.benefits.length > 0 && (
                              <div className="mt-3 border-t border-border/60 pt-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                                  Included Benefits
                                </p>
                                <ul className="space-y-1 text-xs text-muted-foreground">
                                  {c.benefits.slice(0, 3).map((b, idx) => (
                                    <li key={idx} className="flex items-center gap-1.5">
                                      <CheckCircle2 className="size-3 text-primary shrink-0" />
                                      <span className="truncate">{b}</span>
                                    </li>
                                  ))}
                                  {c.benefits.length > 3 && (
                                    <li className="text-[11px] text-primary font-medium pl-4">
                                      + {c.benefits.length - 3} more strategic benefits
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                            <span>
                              {c.allow_installments
                                ? "Flexible instalments (Annual, Semi-annual, Quarterly)"
                                : "Annual one-time fee"}
                            </span>
                            <span className={`font-semibold ${on ? "text-primary" : "text-muted-foreground"}`}>
                              {on ? "Selected ✓" : "Click to select"}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {visibleCategories.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">
                        No membership categories found for your regional profile.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 1: REGISTRATION DETAILS (Dynamic Form based on Archetype) */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Selected Track</p>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mt-0.5">
                        {isInvestorMentor ? "💎 Investor & Mentor Registration" : "🚀 Entrepreneur & Enterprise Registration"}
                        <span className="text-xs font-normal text-muted-foreground">({selectedCategory?.name})</span>
                      </h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="text-xs h-8">
                      Switch Category
                    </Button>
                  </div>

                  {/* FORM PATH A: ENTREPRENEUR */}
                  {!isInvestorMentor && (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Business or Trading Name *">
                          <Input
                            value={answers.business_name}
                            onChange={(e) => set("business_name", e.target.value)}
                            placeholder="e.g. Hope Agro Ventures"
                          />
                        </Field>

                        <Field label="Industry / Sector *">
                          <Select value={answers.sector} onValueChange={(v) => set("sector", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select primary sector" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {SECTORS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Country of Operation *">
                          <Select value={answers.country} onValueChange={(v) => set("country", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {COUNTRIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="City or Cities of Operation *">
                          <Input
                            value={answers.city}
                            onChange={(e) => set("city", e.target.value)}
                            placeholder="e.g. Douala, Yaoundé"
                          />
                        </Field>

                        <Field label="Business Stage">
                          <Select value={answers.business_stage} onValueChange={(v) => set("business_stage", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your current stage" />
                            </SelectTrigger>
                            <SelectContent>
                              {BUSINESS_STAGES.map((st) => (
                                <SelectItem key={st} value={st}>
                                  {st}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Website / LinkedIn / Social Profile (Optional)">
                          <Input
                            value={answers.website_url}
                            onChange={(e) => set("website_url", e.target.value)}
                            placeholder="https://..."
                          />
                        </Field>

                        <Field label="Registration / Tax ID (Optional)" className="md:col-span-2">
                          <Input
                            value={answers.registration_number}
                            onChange={(e) => set("registration_number", e.target.value)}
                            placeholder="RCCM, NIU, or business licence number"
                          />
                        </Field>

                        <Field label="What does your business do? (Executive Summary) *" className="md:col-span-2">
                          <Textarea
                            rows={4}
                            value={answers.business_summary}
                            onChange={(e) => set("business_summary", e.target.value)}
                            placeholder="Briefly describe your products, services, target market, and value proposition..."
                          />
                        </Field>
                      </div>

                      {/* Growth Priorities */}
                      <div>
                        <Label className="mb-2 block font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          Primary Growth Priorities in WCBN
                        </Label>
                        <p className="text-xs text-muted-foreground mb-3">Select the core areas where you seek network support:</p>
                        <div className="flex flex-wrap gap-2">
                          {GROWTH_PRIORITIES.map((p) => {
                            const on = answers.growth_priorities.includes(p);
                            return (
                              <button
                                type="button"
                                key={p}
                                onClick={() => toggleArrayItem("growth_priorities", p)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                  on ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* SDGs */}
                      <div>
                        <Label className="mb-2 block font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          Sustainable Development Goals (SDGs) You Advance
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {SDGS.map((label, i) => {
                            const n = i + 1;
                            const on = answers.sdgs.includes(n);
                            return (
                              <button
                                type="button"
                                key={n}
                                onClick={() =>
                                  set("sdgs", on ? answers.sdgs.filter((s) => s !== n) : [...answers.sdgs, n])
                                }
                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                  on ? "gradient-brand text-white shadow-xs" : "bg-muted text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {n}. {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <Field label="3–5 Year Kingdom Impact Commitment *">
                        <Textarea
                          rows={4}
                          value={answers.impact_statement}
                          onChange={(e) => set("impact_statement", e.target.value)}
                          placeholder="How does your enterprise create Kingdom impact, generate dignified employment, and serve your community?"
                        />
                      </Field>
                    </div>
                  )}

                  {/* FORM PATH B: INVESTOR & MENTOR */}
                  {isInvestorMentor && (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Primary Role / Profile *">
                          <Select value={answers.investor_role} onValueChange={(v) => set("investor_role", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your primary profile" />
                            </SelectTrigger>
                            <SelectContent>
                              {INVESTOR_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Firm / Fund / Organization (Optional)">
                          <Input
                            value={answers.organization}
                            onChange={(e) => set("organization", e.target.value)}
                            placeholder="e.g. Africa Kingdom Angels / Independent"
                          />
                        </Field>

                        <Field label="Country of Residence / Operation *">
                          <Select value={answers.country} onValueChange={(v) => set("country", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {COUNTRIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="City *">
                          <Input
                            value={answers.city}
                            onChange={(e) => set("city", e.target.value)}
                            placeholder="e.g. London, Douala, Paris, Houston"
                          />
                        </Field>

                        <Field label="LinkedIn / Professional Profile URL *">
                          <Input
                            value={answers.linkedin_url}
                            onChange={(e) => set("linkedin_url", e.target.value)}
                            placeholder="https://linkedin.com/in/..."
                          />
                        </Field>

                        <Field label="Typical Ticket Size / Capital Capacity">
                          <Select value={answers.ticket_size} onValueChange={(v) => set("ticket_size", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select capital capacity" />
                            </SelectTrigger>
                            <SelectContent>
                              {TICKET_SIZES.map((ts) => (
                                <SelectItem key={ts} value={ts}>
                                  {ts}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Mentorship & Advisory Availability">
                          <Select value={answers.mentorship_availability} onValueChange={(v) => set("mentorship_availability", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select advisory availability" />
                            </SelectTrigger>
                            <SelectContent>
                              {MENTORSHIP_AVAILABILITY.map((ma) => (
                                <SelectItem key={ma} value={ma}>
                                  {ma}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Preferred Sectors for Backing / Mentoring">
                          <Input
                            value={answers.preferred_sectors}
                            onChange={(e) => set("preferred_sectors", e.target.value)}
                            placeholder="e.g. AgriTech, FinTech, Logistics, Health"
                          />
                        </Field>

                        <Field label="Executive Experience & Track Record *" className="md:col-span-2">
                          <Textarea
                            rows={4}
                            value={answers.experience_summary}
                            onChange={(e) => set("experience_summary", e.target.value)}
                            placeholder="Briefly describe your executive leadership, entrepreneurship background, or investment experience..."
                          />
                        </Field>
                      </div>

                      {/* Advisory & Mentorship Domains */}
                      <div>
                        <Label className="mb-2 block font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          Domains of Mentorship & Strategic Expertise
                        </Label>
                        <p className="text-xs text-muted-foreground mb-3">Select the areas where you can best guide WCBN entrepreneurs:</p>
                        <div className="flex flex-wrap gap-2">
                          {ADVISORY_DOMAINS.map((ad) => {
                            const on = answers.advisory_areas.includes(ad);
                            return (
                              <button
                                type="button"
                                key={ad}
                                onClick={() => toggleArrayItem("advisory_areas", ad)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                  on ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {ad}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* SDGs */}
                      <div>
                        <Label className="mb-2 block font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          SDGs Aligned with Your Strategic Investments & Mentorship
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {SDGS.map((label, i) => {
                            const n = i + 1;
                            const on = answers.sdgs.includes(n);
                            return (
                              <button
                                type="button"
                                key={n}
                                onClick={() =>
                                  set("sdgs", on ? answers.sdgs.filter((s) => s !== n) : [...answers.sdgs, n])
                                }
                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                  on ? "gradient-brand text-white shadow-xs" : "bg-muted text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {n}. {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <Field label="Kingdom Vision & Contribution to African Businesses *">
                        <Textarea
                          rows={4}
                          value={answers.kingdom_vision}
                          onChange={(e) => set("kingdom_vision", e.target.value)}
                          placeholder="How do you desire to steward your capital, strategic networks, and wisdom to empower Kingdom businesses in Africa?"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: MERGED BILLING PLAN & PAYMENT METHOD */}
              {step === 2 && (
                <div className="space-y-8">
                  {/* Part 1: Payment Plan */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">1. Select Your Payment Plan</h3>
                      <p className="text-xs text-muted-foreground">
                        Membership tier: <strong className="text-foreground">{selectedCategory?.name}</strong> · Base fee:{" "}
                        <strong className="text-primary">{fee != null ? `${money(fee, currency)}/year` : "Calculated"}</strong>
                      </p>
                    </div>

                    {selectedCategory?.allow_installments ? (
                      <div className="grid gap-4 sm:grid-cols-3">
                        {CYCLES.map((c) => {
                          const on = cycle === c.value;
                          const partAmt = fee != null ? instalment(fee, c.value, currency) : null;

                          return (
                            <div
                              key={c.value}
                              onClick={() => setCycle(c.value)}
                              className={`cursor-pointer rounded-2xl border p-4 text-left transition flex flex-col justify-between ${
                                on
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                                  : "border-border hover:border-primary/40 bg-card hover:bg-muted/30"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-foreground">{c.label}</h4>
                                  <span className={`text-xs font-semibold ${on ? "text-primary" : "text-muted-foreground"}`}>
                                    {on ? "Selected ✓" : ""}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-border">
                                <p className="text-[11px] text-muted-foreground">Due today:</p>
                                <p className="text-base font-extrabold text-foreground">
                                  {partAmt != null ? money(partAmt, currency) : "—"}
                                </p>
                                {c.parts > 1 && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {c.parts} payments of {partAmt != null ? money(partAmt, currency) : "—"}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border bg-muted/20 p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="size-5 text-primary mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-foreground">Annual One-Time Fee</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              This strategic membership tier is billed on an annual one-time basis ({fee != null ? money(fee, currency) : ""}).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Installment breakdown preview */}
                    {selectedCategory?.allow_installments && cycle !== "annual" && fee != null && (
                      <div className="rounded-2xl border border-border bg-muted/10 p-3.5 text-xs">
                        <p className="font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 text-[11px]">
                          Projected Instalment Schedule
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border text-muted-foreground text-left">
                                <th className="pb-1">Instalment</th>
                                <th className="pb-1">Schedule</th>
                                <th className="pb-1">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {Array.from({ length: CYCLES.find((c) => c.value === cycle)?.parts ?? 1 }, (_, i) => (
                                <tr key={i}>
                                  <td className="py-1.5 font-medium">Instalment {i + 1}</td>
                                  <td className="py-1.5 text-muted-foreground">
                                    {i === 0
                                      ? "Due today at registration"
                                      : cycle === "semi_annual"
                                      ? "In 6 months"
                                      : `In ${i * 3} months`}
                                  </td>
                                  <td className="py-1.5 font-bold text-foreground">
                                    {money(instalment(fee, cycle, currency), currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Part 2: Payment Method */}
                  <div className="space-y-4 border-t border-border pt-6">
                    <div>
                      <h3 className="text-base font-bold text-foreground">2. Select Your Payment Method</h3>
                      <p className="text-xs text-muted-foreground">
                        An official WCBN invoice (WCBN-INV-2026-XXXX) is generated for all payment options.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      {methods.filter((m) => m.on).map((m) => {
                        const on = method === m.value;
                        const Icon = m.icon;

                        return (
                          <div
                            key={m.value}
                            onClick={() => setMethod(m.value)}
                            className={`cursor-pointer rounded-2xl border p-4 text-left transition flex flex-col justify-between ${
                              on
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                                : "border-border hover:border-primary/40 bg-card hover:bg-muted/30"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span
                                  className={`grid size-9 place-items-center rounded-xl ${
                                    on ? "gradient-brand text-white" : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <Icon className="size-4" />
                                </span>
                                <span className={`text-xs font-semibold ${on ? "text-primary" : "text-muted-foreground"}`}>
                                  {on ? "Selected ✓" : ""}
                                </span>
                              </div>
                              <h4 className="mt-2.5 text-sm font-bold text-foreground">{METHOD_LABELS[m.value]}</h4>
                              <p className="mt-0.5 text-xs text-muted-foreground">{m.hint}</p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-border text-[11px] text-muted-foreground">
                              {m.value === "bank_transfer"
                                ? "Official bank details displayed on generated invoice."
                                : "Instant digital checkout via Flutterwave."}
                            </div>
                          </div>
                        );
                      })}

                      {!methods.some((m) => m.on) && (
                        <p className="text-sm text-muted-foreground col-span-3 py-6 text-center">
                          Payment methods are currently being configured by administration. Please check back shortly.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & CONFIRM */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Review & Confirm Your Membership</h3>
                    <p className="text-xs text-muted-foreground">
                      Please verify your registration details below before generating your official invoice.
                    </p>
                  </div>

                  {missingFormFields.length > 0 && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <strong className="font-semibold">Required fields missing:</strong>{" "}
                        {missingFormFields.map((f) => f.replace(/_/g, " ")).join(", ")}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setStep(1)} className="shrink-0 text-xs h-7 self-start sm:self-auto">
                        Complete in Step 2
                      </Button>
                    </div>
                  )}

                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
                    <Row label="Applicant Name" value={identity?.fullName ?? "—"} />
                    <Row label="WCA Member ID" value={identity?.member?.member_id ?? "—"} />
                    <Row label="WCA Region" value={`${identity?.regionName ?? "—"} (${currency})`} />
                    <Row
                      label="Membership Category"
                      value={`${selectedCategory?.name ?? "—"} (${isInvestorMentor ? "Investor & Mentor Track" : "Entrepreneur Track"})`}
                    />

                    {!isInvestorMentor ? (
                      <>
                        <Row label="Business Name" value={answers.business_name || "—"} />
                        <Row label="Industry / Sector" value={answers.sector || "—"} />
                        <Row label="Operating Location" value={[answers.city, answers.country].filter(Boolean).join(", ") || "—"} />
                        <Row label="Business Stage" value={answers.business_stage || "—"} />
                        {answers.business_summary && (
                          <Row label="Business Summary" value={answers.business_summary} />
                        )}
                        {answers.impact_statement && (
                          <Row label="Kingdom Impact Commitment" value={answers.impact_statement} />
                        )}
                        {answers.website_url && <Row label="Website" value={answers.website_url} />}
                        {answers.registration_number && (
                          <Row label="Registration / Tax ID" value={answers.registration_number} />
                        )}
                        {answers.growth_priorities.length > 0 && (
                          <Row label="Growth Priorities" value={answers.growth_priorities.join(", ")} />
                        )}
                      </>
                    ) : (
                      <>
                        <Row label="Primary Role" value={answers.investor_role || "—"} />
                        {answers.organization && <Row label="Organization / Fund" value={answers.organization} />}
                        <Row label="Location" value={[answers.city, answers.country].filter(Boolean).join(", ") || "—"} />
                        <Row label="LinkedIn Profile" value={answers.linkedin_url || "—"} />
                        {answers.ticket_size && <Row label="Capital Capacity" value={answers.ticket_size} />}
                        {answers.mentorship_availability && (
                          <Row label="Mentorship Availability" value={answers.mentorship_availability} />
                        )}
                        {answers.preferred_sectors && (
                          <Row label="Preferred Sectors" value={answers.preferred_sectors} />
                        )}
                        {answers.experience_summary && (
                          <Row label="Executive Experience" value={answers.experience_summary} />
                        )}
                        {answers.kingdom_vision && (
                          <Row label="Kingdom Vision" value={answers.kingdom_vision} />
                        )}
                        {answers.advisory_areas.length > 0 && (
                          <Row label="Mentorship Domains" value={answers.advisory_areas.join(", ")} />
                        )}
                      </>
                    )}

                    {answers.sdgs.length > 0 && (
                      <Row label="Aligned SDGs" value={answers.sdgs.map((n) => `SDG ${n}`).join(", ")} />
                    )}

                    <Row
                      label="Payment Plan"
                      value={CYCLES.find((c) => c.value === cycle)?.label ?? "Annual"}
                    />
                    <Row
                      label="Selected Payment Method"
                      value={method ? METHOD_LABELS[method] : "—"}
                    />

                    <div className="flex justify-between items-center border-t border-border pt-3">
                      <div>
                        <span className="text-sm font-bold text-foreground">Amount Due Today</span>
                        <p className="text-xs text-muted-foreground">In your local regional currency</p>
                      </div>
                      <span className="text-xl font-extrabold text-primary">
                        {fee != null ? money(instalment(fee, cycle, currency), currency) : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="covenant"
                      checked={agreeCovenant}
                      onChange={(e) => setAgreeCovenant(e.target.checked)}
                      className="mt-1 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="covenant" className="text-xs text-muted-foreground cursor-pointer select-none">
                      <strong className="text-foreground">WCBN Covenant Agreement:</strong> By proceeding, I confirm that all submitted details are truthful, align with Biblical ethics in marketplace leadership, and agree to uphold the World Changers Business Network covenant.
                    </label>
                  </div>
                </div>
              )}
            </fieldset>

            {/* Navigation & Action Buttons (Single Row on Mobile) */}
            <div className="mt-8 flex items-center justify-between gap-2 border-t border-border pt-5">
              <div>
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="px-3">
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={save.isPending || submitted}
                  onClick={() => save.mutate(false)}
                  className="px-3"
                >
                  <Save className="size-4 sm:mr-1" />
                  <span className="hidden sm:inline">Save Progress</span>
                  <span className="sm:hidden">Save</span>
                </Button>

                {step < STEPS.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (step === 0) {
                        if (!categoryId) {
                          toast.error("Please select a membership category to proceed.");
                          return;
                        }
                      } else if (step === 1) {
                        if (missingFormFields.length > 0) {
                          toast.error(`Please fill in the required fields: ${missingFormFields.map((f) => f.replace(/_/g, " ")).join(", ")}`);
                          return;
                        }
                      } else if (step === 2) {
                        if (!cycle) {
                          toast.error("Please select a payment plan.");
                          return;
                        }
                        if (!method) {
                          toast.error("Please select a payment method.");
                          return;
                        }
                      }
                      setStep(step + 1);
                    }}
                    className="px-4"
                  >
                    <span>Next</span>
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={save.isPending || submitted}
                    onClick={() => {
                      if (missingFormFields.length > 0) {
                        toast.error(`Please complete all required fields: ${missingFormFields.map((f) => f.replace(/_/g, " ")).join(", ")}`);
                        setStep(1);
                        return;
                      }
                      if (!categoryId) {
                        toast.error("Please select a membership category in Step 1.");
                        setStep(0);
                        return;
                      }
                      if (!method) {
                        toast.error("Please select a payment method in Step 3.");
                        setStep(2);
                        return;
                      }
                      if (!agreeCovenant) {
                        toast.error("Please tick the WCBN Covenant Agreement box to validate and submit your application.");
                        return;
                      }
                      save.mutate(true);
                    }}
                    className={`px-5 font-semibold ${
                      !agreeCovenant || missingFormFields.length > 0 || !categoryId || !method ? "opacity-80" : ""
                    }`}
                  >
                    {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Submit
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBMITTED / UNDER REVIEW VIEW */}
        {submitted && application && (
          <>
            <Accordion type="single" collapsible defaultValue="tracker" className="rounded-3xl border border-border bg-card px-6 shadow-card">
              <AccordionItem value="tracker" className="border-0">
                <AccordionTrigger className="py-6 hover:no-underline">
                  <span>
                    <span className="block text-left text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review tracker</span>
                    <span className="mt-1 block text-left text-xs font-normal text-muted-foreground">Current stage: {trackStages[Math.max(stageIndex, 0)]?.label ?? "Applied"}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <ol className="space-y-2 text-sm">
                    {trackStages.map((s, i) => {
                      const record = data?.stages.find((r) => r.stage_code === s.code);
                      const done = stageIndex > i || record?.status === "completed";
                      const current = stageIndex === i;
                      return (
                        <li key={s.code} className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                              current ? "gradient-brand text-white" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span>
                            <span className={current ? "font-semibold" : done ? "" : "text-muted-foreground"}>{s.label}</span>
                            {record?.notes && <span className="block text-xs text-muted-foreground">{record.notes}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  {application.decision_reason && <p className="mt-4 rounded-xl bg-muted p-3 text-xs">Decision note: {application.decision_reason}</p>}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="rounded-3xl border border-border bg-card px-6 shadow-card">
              <AccordionItem value="summary" className="border-0">
                <AccordionTrigger className="py-6 hover:no-underline">
                  <span>
                    <span className="block text-left text-sm font-semibold uppercase tracking-wide text-muted-foreground">Application summary</span>
                    <span className="mt-1 block text-left text-xs font-normal text-muted-foreground">View the submitted onboarding details</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="text-sm">
                    <Row label="Applicant" value={identity?.fullName ?? "—"} />
                    <Row label="Track" value={isInvestorMentor ? "💎 Investor & Mentor" : "🚀 Entrepreneur"} />
                    <Row label="WCA member ID" value={identity?.member?.member_id ?? "—"} />
                    <Row label="Region" value={identity?.regionName ?? "—"} />
                    <Row label="DCG" value={identity?.dcgName ?? "—"} />

                    {!isInvestorMentor ? (
                      <>
                        <Row label="Business Name" value={answers.business_name || "—"} />
                        <Row label="Sector" value={answers.sector || "—"} />
                        <Row label="Country" value={answers.country || "—"} />
                        <Row label="City" value={answers.city || "—"} />
                        <Row label="Business Stage" value={answers.business_stage || "—"} />
                        <Row label="Business Summary" value={answers.business_summary || "—"} />
                        <Row label="Impact Commitment" value={answers.impact_statement || "—"} />
                      </>
                    ) : (
                      <>
                        <Row label="Investor / Mentor Role" value={answers.investor_role || "—"} />
                        <Row label="Organization" value={answers.organization || "—"} />
                        <Row label="Location" value={[answers.city, answers.country].filter(Boolean).join(", ") || "—"} />
                        <Row label="LinkedIn" value={answers.linkedin_url || "—"} />
                        <Row label="Ticket Size" value={answers.ticket_size || "—"} />
                        <Row label="Experience" value={answers.experience_summary || "—"} />
                        <Row label="Kingdom Vision" value={answers.kingdom_vision || "—"} />
                      </>
                    )}
                    <Row label="SDGs" value={answers.sdgs.length ? answers.sdgs.join(", ") : "—"} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </div>
    </MemberPage>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs font-semibold">{label}</Label>{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-xs text-right max-w-[65%] truncate">{value}</span>
    </div>
  );
}
