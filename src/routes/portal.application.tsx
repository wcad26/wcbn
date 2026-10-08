import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, CreditCard, FileUp, Landmark, Loader2, Save, Send, Smartphone, UserRound, XCircle } from "lucide-react";
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
  COUNTRIES, EXPERIENCE_BANDS, PRACTICE_FIELDS, PRACTICE_TYPES, SDGS, SECTORS, TRACKS, type Track,
  ensureWcbnMember, stagesFor, useIdentity, useInvalidateIdentity,
  money, uploadDocument,
} from "@/lib/wcbn";
import { CYCLES, METHOD_LABELS, annualFee, fetchCategories, fetchPaymentSettings, instalment, type BillingCycle, type PaymentMethod } from "@/lib/fees";
import { startOnboardingPayment, verifyFlutterwavePayment } from "@/lib/payments.functions";
import { InvoiceCard, type InvoiceRow } from "@/components/wcbn/invoice-card";

export const Route = createFileRoute("/portal/application")({ component: ApplicationPage });

type Answers = {
  // Business track
  business_name: string; sector: string; cities: string; founding_year: string; employees: string;
  business_phone: string; business_email: string; business_summary: string; documents: string;
  // Professional track
  profession: string; practice_field: string; practice_type: string; employer: string;
  experience: string; qualifications: string; licence_reference: string; work_phone: string; work_email: string;
  practice_summary: string; service_values: string; career_goals: string; portfolio_url: string;
  // Shared
  country: string; city: string; impact_statement: string; sdgs: number[];
};

const EMPTY: Answers = {
  business_name: "", sector: "", cities: "", founding_year: "", employees: "", business_phone: "", business_email: "",
  business_summary: "", documents: "",
  profession: "", practice_field: "", practice_type: "", employer: "", experience: "", qualifications: "",
  licence_reference: "", work_phone: "", work_email: "", practice_summary: "", service_values: "", career_goals: "", portfolio_url: "",
  country: "", city: "", impact_statement: "", sdgs: [],
};

const CURRENT_YEAR = new Date().getFullYear();
const FOUNDING_YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => String(CURRENT_YEAR - i));

const STEP_LABELS: Record<Track, readonly string[]> = {
  business: ["Business", "Impact & SDGs", "Membership & fee", "Review & pay"],
  professional: ["Practice", "Service & SDGs", "Membership & fee", "Review & pay"],
};

const REQUIRED: Record<Track, Record<number, (keyof Answers)[]>> = {
  business: { 0: ["business_name", "sector", "country", "cities", "business_summary"], 1: ["impact_statement"], 2: [], 3: [] },
  professional: { 0: ["profession", "practice_field", "practice_type", "country", "city", "practice_summary"], 1: ["service_values", "impact_statement"], 2: [], 3: [] },
};

function ApplicationPage() {
  const { data: identity, isLoading: identityLoading } = useIdentity();
  const refreshIdentity = useInvalidateIdentity();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [track, setTrack] = useState<Track>("business");
  const wcbnId = identity?.wcbnMember?.id;
  const [categoryId, setCategoryId] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [transferRef, setTransferRef] = useState("");
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const currency = identity?.regionCurrency ?? "XAF";

  const { data: categories = [] } = useQuery({ queryKey: ["wcbn", "categories"], queryFn: () => fetchCategories() });
  const { data: settings } = useQuery({ queryKey: ["wcbn", "payment-settings"], queryFn: fetchPaymentSettings });

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "application", wcbnId],
    enabled: !!wcbnId,
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

  useEffect(() => {
    if (application?.applicant_data) setAnswers({ ...EMPTY, ...(application.applicant_data as Partial<Answers>) });
    if (application?.applicant_type) setTrack(application.applicant_type as Track);
    const d = (application?.applicant_data ?? {}) as { category_id?: string; billing_cycle?: BillingCycle; payment_method?: PaymentMethod };
    if (d.category_id) setCategoryId(d.category_id);
    if (d.billing_cycle) setCycle(d.billing_cycle);
    if (d.payment_method) setMethod(d.payment_method);
  }, [application]);

  // Returning from Flutterwave checkout: verify the transaction, then activate.
  const verify = useMutation({
    mutationFn: (v: { transactionId: string; txRef: string }) => verifyFlutterwavePayment({ data: v }),
    onSuccess: () => { toast.success("Payment confirmed — welcome to WCBN!"); refreshIdentity(); queryClient.invalidateQueries({ queryKey: ["portal"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const status = q.get("status"); const txRef = q.get("tx_ref"); const transactionId = q.get("transaction_id");
    if (!status) return;
    window.history.replaceState({}, "", window.location.pathname);
    if ((status === "successful" || status === "completed") && txRef && transactionId) verify.mutate({ txRef, transactionId });
    else toast.error("The payment was cancelled. You can try again.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackCategories = categories.filter((c) => c.applicant_type === "any" || c.applicant_type === track);
  const category = trackCategories.find((c) => c.id === categoryId);
  const fee = category ? annualFee(category, currency) : null;
  const onlineOn = !!settings?.flutterwave_enabled;
  const methods: { value: PaymentMethod; icon: typeof Smartphone; on: boolean; hint: string }[] = [
    { value: "mobile_money", icon: Smartphone, on: onlineOn && !!settings?.mobile_money_enabled, hint: "Instant activation" },
    { value: "card", icon: CreditCard, on: onlineOn && !!settings?.card_enabled, hint: "Instant activation" },
    { value: "bank_transfer", icon: Landmark, on: !!settings?.bank_transfer_enabled, hint: "Activated once finance confirms" },
  ];
  const paymentReady = !!category && !!method && (cycle === "annual" || category.allow_installments);

  const eligible = !!identity?.wcaActive && !!identity?.dcgActive;
  const awaitingPayment = application?.status === "awaiting_payment";
  const submitted = !!application?.status && application.status !== "draft" && !awaitingPayment;
  const trackStages = stagesFor(track);
  const stageIndex = trackStages.findIndex((s) => s.code === application?.current_stage);
  const steps = STEP_LABELS[track];
  const last = steps.length - 1;
  const required = REQUIRED[track];

  const completion = useMemo(() => {
    const fields = [...required[0]!, ...required[1]!];
    const done = fields.filter((f) => String(answers[f] ?? "").trim().length > 0).length;
    return Math.round((done / fields.length) * 100);
  }, [answers, required]);

  const missing = (i: number) => required[i]!.filter((f) => !String(answers[f] ?? "").trim());

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity, track);
      await supabase.from("wcbn_members").update({ member_type: track }).eq("id", memberId);
      const { data: version } = await supabase.from("wcbn_criteria_versions").select("id").eq("is_active", true).order("version_number", { ascending: false }).limit(1).maybeSingle();
      if (!version) throw new Error("No active criteria version has been configured yet.");
      const payload = {
        wcbn_member_id: memberId,
        criteria_version_id: version.id,
        applicant_type: track,
        applicant_data: answers,
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
        if (!categoryId || !method) throw new Error("Choose a membership category and payment method.");
        const res = await startOnboardingPayment({ data: { applicationId: applicationId!, categoryId, cycle, method, origin: window.location.origin } });
        if (res.link) { window.location.href = res.link; return "redirect"; }
        return "invoice";
      }
      return "saved";
    },
    onSuccess: (result) => {
      if (result === "redirect") { toast.message("Redirecting to secure payment…"); return; }
      toast.success(result === "invoice" ? "Invoice generated. Complete your bank transfer to activate." : "Progress saved");
      refreshIdentity();
      queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const firstInvoice = data?.invoices?.[0];
  const declared = (firstInvoice?.wcbn_payments ?? []).some((p) => p.status === "pending");
  const declareTransfer = useMutation({
    mutationFn: async () => {
      if (!identity || !firstInvoice) throw new Error("No invoice found");
      const proofPath = transferProof ? await uploadDocument(identity.userId, "payments", transferProof) : null;
      const { error } = await supabase.from("wcbn_payments").insert({
        invoice_id: firstInvoice.id, amount: Number(firstInvoice.amount), currency_code: firstInvoice.currency_code, method: "bank_transfer",
        provider: "bank", reference: transferRef || null, proof_url: proofPath, status: "pending", submitted_by: identity.userId, paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Transfer details sent. You'll be activated once finance confirms."); queryClient.invalidateQueries({ queryKey: ["portal"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const payOnline = useMutation({
    mutationFn: async (m: PaymentMethod) => {
      const res = await startOnboardingPayment({ data: { applicationId: application!.id, categoryId, cycle, method: m, origin: window.location.origin } });
      if (res.link) window.location.href = res.link;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  const busy = identityLoading || isLoading || verify.isPending;

  if (busy) {
    return (
      <MemberPage title="My application" description="Loading your application…">
        <div className="space-y-6">
          <div className="h-32 animate-pulse rounded-3xl border border-border bg-card shadow-card" />
          <div className="h-64 animate-pulse rounded-3xl border border-border bg-card shadow-card" />
        </div>
      </MemberPage>
    );
  }

  return (
    <MemberPage title="My application" description={verify.isPending ? "Confirming your payment…" : awaitingPayment ? "Complete your payment to activate your membership." : submitted ? "Your application is being processed." : "Complete the form and pay your fee to join."}>
      <div className="space-y-6">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Verified from WCA</h2>
          <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2">{identity?.wcaActive ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />}Active WCA membership</li>
            <li className="flex items-center gap-2">{identity?.dcgActive ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />}Active DCG participation</li>
          </ul>
          {!eligible && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">Both are required to submit. Contact your regional WCA office for help.</p>}
        </section>


        {awaitingPayment && firstInvoice && (
          <>
            <InvoiceCard invoice={firstInvoice} memberName={identity?.fullName} bankAccounts={settings?.bank_accounts} note={settings?.invoice_note} />
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
              {declared ? (
                <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-primary" />Transfer details received. Finance will confirm and activate your membership.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <Field label="Bank transfer reference"><Input value={transferRef} onChange={(e) => setTransferRef(e.target.value)} placeholder="Reference on your bank slip" /></Field>
                  <Field label="Receipt (optional)">
                    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 text-sm hover:border-primary/50">
                      <FileUp className="size-4" /><span className="truncate">{transferProof ? transferProof.name : "Attach receipt"}</span>
                      <input type="file" className="hidden" onChange={(e) => setTransferProof(e.target.files?.[0] ?? null)} />
                    </label>
                  </Field>
                  <Button disabled={declareTransfer.isPending || !transferRef} onClick={() => declareTransfer.mutate()}>{declareTransfer.isPending ? <Loader2 className="animate-spin" /> : <Send />}I have paid</Button>
                </div>
              )}
              {onlineOn && !declared && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
                  <span className="text-muted-foreground">Prefer to pay instantly?</span>
                  {settings?.mobile_money_enabled && <Button size="sm" variant="outline" disabled={payOnline.isPending} onClick={() => payOnline.mutate("mobile_money")}><Smartphone className="size-4" />Mobile money</Button>}
                  {settings?.card_enabled && <Button size="sm" variant="outline" disabled={payOnline.isPending} onClick={() => payOnline.mutate("card")}><CreditCard className="size-4" />Bank card</Button>}
                </div>
              )}
            </section>
          </>
        )}

        {!busy && !submitted && !awaitingPayment && <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How are you applying?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {TRACKS.map((t) => {
              const on = track === t.value;
              const Icon = t.value === "business" ? Briefcase : UserRound;
              return (
                <button key={t.value} type="button" disabled={submitted}
                  onClick={() => { setTrack(t.value); setStep(0); }}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${on ? "gradient-brand text-white" : "bg-muted text-muted-foreground"}`}><Icon className="size-4" /></span>
                  <span>
                    <span className="block text-sm font-semibold">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{submitted ? "Your track is locked while your application is under review." : "Pick the one that fits you — the questions and review criteria differ."}</p>
        </section>}

        {!busy && !submitted && !awaitingPayment && <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Application completeness</span>
              <span className="text-muted-foreground">{completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full gradient-brand transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>

          <ol className="mb-8 flex flex-wrap gap-2">
            {steps.map((label, i) => (
              <li key={label}>
                <button onClick={() => setStep(i)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${step === i ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{i + 1}. {label}</button>
              </li>
            ))}
          </ol>

          {busy ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading your application…</p> : (
            <>
              <fieldset disabled={submitted} className="contents">
              {step === 0 && track === "business" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Business or practice name"><Input value={answers.business_name} onChange={(e) => set("business_name", e.target.value)} /></Field>
                  <Field label="Sector">
                    <Select value={answers.sector} onValueChange={(v) => set("sector", v)}>
                      <SelectTrigger><SelectValue placeholder="Select a sector" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Country of operation">
                    <Select value={answers.country} onValueChange={(v) => set("country", v)}>
                      <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Cities of operation"><Input value={answers.cities} onChange={(e) => set("cities", e.target.value)} placeholder="e.g. Douala, Yaoundé" /></Field>
                  <Field label="Founding year">
                    <Select value={answers.founding_year} onValueChange={(v) => set("founding_year", v)}>
                      <SelectTrigger><SelectValue placeholder="Select founding year" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {FOUNDING_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Team size"><Input type="number" value={answers.employees} onChange={(e) => set("employees", e.target.value)} /></Field>
                  <Field label="Business phone number"><Input type="tel" value={answers.business_phone} onChange={(e) => set("business_phone", e.target.value)} placeholder="e.g. +237 6 00 00 00 00" /></Field>
                  <Field label="Business email"><Input type="email" value={answers.business_email} onChange={(e) => set("business_email", e.target.value)} placeholder="e.g. info@yourbusiness.com" /></Field>
                  <Field label="Registration / licence references (optional)" className="md:col-span-2"><Input value={answers.documents} onChange={(e) => set("documents", e.target.value)} placeholder="Registration number, licence numbers" /></Field>
                  <Field label="What does the business do?" className="md:col-span-2"><Textarea rows={5} value={answers.business_summary} onChange={(e) => set("business_summary", e.target.value)} /></Field>
                </div>
              )}

              {step === 0 && track === "professional" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Profession or job title"><Input value={answers.profession} onChange={(e) => set("profession", e.target.value)} placeholder="e.g. Civil engineer" /></Field>
                  <Field label="Field of practice">
                    <Select value={answers.practice_field} onValueChange={(v) => set("practice_field", v)}>
                      <SelectTrigger><SelectValue placeholder="Select a field" /></SelectTrigger>
                      <SelectContent className="max-h-72">{PRACTICE_FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Work status">
                    <Select value={answers.practice_type} onValueChange={(v) => set("practice_type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select your status" /></SelectTrigger>
                      <SelectContent>{PRACTICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Employer or practice name (optional)"><Input value={answers.employer} onChange={(e) => set("employer", e.target.value)} /></Field>
                  <Field label="Country">
                    <Select value={answers.country} onValueChange={(v) => set("country", v)}>
                      <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                      <SelectContent className="max-h-72">{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="City"><Input value={answers.city} onChange={(e) => set("city", e.target.value)} /></Field>
                  <Field label="Years of experience">
                    <Select value={answers.experience} onValueChange={(v) => set("experience", v)}>
                      <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                      <SelectContent>{EXPERIENCE_BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Professional body / licence reference (optional)"><Input value={answers.licence_reference} onChange={(e) => set("licence_reference", e.target.value)} /></Field>
                  <Field label="Work phone number"><Input type="tel" value={answers.work_phone} onChange={(e) => set("work_phone", e.target.value)} placeholder="e.g. +237 6 00 00 00 00" /></Field>
                  <Field label="Work email"><Input type="email" value={answers.work_email} onChange={(e) => set("work_email", e.target.value)} /></Field>
                  <Field label="Portfolio or LinkedIn link (optional)" className="md:col-span-2"><Input value={answers.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://" /></Field>
                  <Field label="Qualifications and certifications" className="md:col-span-2"><Textarea rows={3} value={answers.qualifications} onChange={(e) => set("qualifications", e.target.value)} placeholder="Degrees, certifications, licences" /></Field>
                  <Field label="What work do you do?" className="md:col-span-2"><Textarea rows={5} value={answers.practice_summary} onChange={(e) => set("practice_summary", e.target.value)} /></Field>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4">
                  {track === "professional" && (
                    <>
                      <Field label="How does your work serve people and reflect Kingdom values?"><Textarea rows={4} value={answers.service_values} onChange={(e) => set("service_values", e.target.value)} /></Field>
                      <Field label="Career and service goals (optional)"><Textarea rows={3} value={answers.career_goals} onChange={(e) => set("career_goals", e.target.value)} /></Field>
                    </>
                  )}
                  <Field label={track === "professional" ? "Your 3–5 year service and impact commitment" : "Your 3–5 year impact commitment"}>
                    <Textarea rows={5} value={answers.impact_statement} onChange={(e) => set("impact_statement", e.target.value)} />
                  </Field>
                  <div>
                    <Label className="mb-3 block">Sustainable Development Goals you advance</Label>
                    <div className="flex flex-wrap gap-2">
                      {SDGS.map((label, i) => {
                        const n = i + 1; const on = answers.sdgs.includes(n);
                        return <button type="button" key={n} onClick={() => set("sdgs", on ? answers.sdgs.filter((s) => s !== n) : [...answers.sdgs, n])} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{n}. {label}</button>;
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <Label className="mb-3 block">Membership category <span className="font-normal text-muted-foreground">· fees in {currency} ({identity?.regionName ?? "your WCA region"})</span></Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      {trackCategories.map((c) => {
                        const on = c.id === categoryId; const f = annualFee(c, currency);
                        return (
                          <button type="button" key={c.id} onClick={() => { setCategoryId(c.id); if (!c.allow_installments) setCycle("annual"); }}
                            className={`rounded-2xl border p-4 text-left transition ${on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                            <span className="flex items-start justify-between gap-3">
                              <span className="text-sm font-semibold">{c.name}</span>
                              <span className="shrink-0 text-sm font-bold text-gradient-brand">{f != null ? `${money(f, currency)}/yr` : "Converted at checkout"}</span>
                            </span>
                            {c.description && <span className="mt-1 block text-xs text-muted-foreground">{c.description}</span>}
                          </button>
                        );
                      })}
                      {!trackCategories.length && <p className="text-sm text-muted-foreground">No membership categories are open yet.</p>}
                    </div>
                  </div>
                  {category && (
                    <div>
                      <Label className="mb-3 block">How would you like to pay?</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {CYCLES.filter((c) => c.value === "annual" || category.allow_installments).map((c) => {
                          const on = cycle === c.value;
                          return (
                            <button type="button" key={c.value} onClick={() => setCycle(c.value)} className={`rounded-2xl border p-4 text-left transition ${on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                              <span className="block text-sm font-semibold">{c.label}</span>
                              <span className="block text-xs text-muted-foreground">{c.blurb}</span>
                              {fee != null && <span className="mt-2 block text-sm font-bold">{money(instalment(fee, c.value, currency), currency)}{c.parts > 1 ? " now" : ""}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="mb-3 block">Payment method</Label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {methods.filter((m) => m.on).map((m) => {
                        const on = method === m.value; const Icon = m.icon;
                        return (
                          <button type="button" key={m.value} onClick={() => setMethod(m.value)} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${on ? "gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="size-4" /></span>
                            <span><span className="block text-sm font-semibold">{METHOD_LABELS[m.value]}</span><span className="block text-xs text-muted-foreground">{m.hint}</span></span>
                          </button>
                        );
                      })}
                      {!methods.some((m) => m.on) && <p className="text-sm text-muted-foreground">Payments are not configured yet. Please check back soon.</p>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">An invoice is generated for every payment method.</p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 text-sm">
                  <Row label="Applicant" value={identity?.fullName ?? "—"} />
                  <Row label="Applying as" value={track === "professional" ? "Professional" : "Business owner"} />
                  <Row label="WCA member ID" value={identity?.member?.member_id ?? "—"} />
                  <Row label="Region" value={identity?.regionName ?? "—"} />
                  <Row label="DCG" value={identity?.dcgName ?? "—"} />
                  {track === "business" ? (
                    <>
                      <Row label="Business" value={answers.business_name || "—"} />
                      <Row label="Sector" value={answers.sector || "—"} />
                      <Row label="Country" value={answers.country || "—"} />
                      <Row label="Cities" value={answers.cities || "—"} />
                      <Row label="Founding year" value={answers.founding_year || "—"} />
                      <Row label="Business phone" value={answers.business_phone || "—"} />
                      <Row label="Business email" value={answers.business_email || "—"} />
                    </>
                  ) : (
                    <>
                      <Row label="Profession" value={answers.profession || "—"} />
                      <Row label="Field of practice" value={answers.practice_field || "—"} />
                      <Row label="Work status" value={answers.practice_type || "—"} />
                      <Row label="Employer" value={answers.employer || "—"} />
                      <Row label="Location" value={[answers.city, answers.country].filter(Boolean).join(", ") || "—"} />
                      <Row label="Experience" value={answers.experience || "—"} />
                      <Row label="Work phone" value={answers.work_phone || "—"} />
                      <Row label="Work email" value={answers.work_email || "—"} />
                    </>
                  )}
                  <Row label="SDGs" value={answers.sdgs.length ? answers.sdgs.join(", ") : "—"} />
                  <Row label="Membership category" value={category?.name ?? "—"} />
                  <Row label="Payment plan" value={CYCLES.find((c) => c.value === cycle)?.label ?? "—"} />
                  <Row label="Payment method" value={method ? METHOD_LABELS[method] : "—"} />
                  <Row label="Due now" value={fee != null ? money(instalment(fee, cycle, currency), currency) : "Calculated on your invoice"} />
                  {!paymentReady && <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">Choose a category, payment plan and method in step 3.</p>}
                  {[0, 1].some((i) => missing(i).length > 0) && (
                    <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">Some required answers are still empty. Complete steps 1–2 before submitting.</p>
                  )}
                  <p className="text-muted-foreground">By paying you confirm the information is accurate and agree to the WCBN Covenant. Your membership activates as soon as payment is confirmed.</p>
                </div>
              )}
              </fieldset>

              <div className="mt-8 flex flex-wrap gap-3">
                {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
                <Button variant="outline" disabled={save.isPending || submitted} onClick={() => save.mutate(false)}><Save />Save progress</Button>
                {step < last
                  ? <Button onClick={() => { const m = missing(step); if (m.length && !submitted) { toast.error("Please complete the required answers on this step first."); return; } if (step === 2 && !paymentReady) { toast.error("Choose a category, payment plan and method."); return; } setStep(step + 1); }}>Next step</Button>
                  : <Button disabled={save.isPending || !eligible || submitted || !paymentReady || [0, 1].some((i) => missing(i).length > 0)} onClick={() => save.mutate(true)}>{save.isPending ? <Loader2 className="animate-spin" /> : <Send />}{method === "bank_transfer" ? "Submit & get invoice" : "Submit & pay"}</Button>}
              </div>
            </>
          )}
        </div>}

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
                          <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${current ? "gradient-brand text-white" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
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
                    <span className="mt-1 block text-left text-xs font-normal text-muted-foreground">View the information you submitted</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="text-sm">
                    <Row label="Applicant" value={identity?.fullName ?? "—"} />
                    <Row label="Applying as" value={track === "professional" ? "Professional" : "Business owner"} />
                    <Row label="WCA member ID" value={identity?.member?.member_id ?? "—"} />
                    <Row label="Region" value={identity?.regionName ?? "—"} />
                    <Row label="DCG" value={identity?.dcgName ?? "—"} />
                    {track === "business" ? (
                      <>
                        <Row label="Business" value={answers.business_name || "—"} />
                        <Row label="Sector" value={answers.sector || "—"} />
                        <Row label="Country" value={answers.country || "—"} />
                        <Row label="Cities" value={answers.cities || "—"} />
                        <Row label="Founding year" value={answers.founding_year || "—"} />
                        <Row label="Team size" value={answers.employees || "—"} />
                        <Row label="Business phone" value={answers.business_phone || "—"} />
                        <Row label="Business email" value={answers.business_email || "—"} />
                        <Row label="Registration / licence references" value={answers.documents || "—"} />
                        <Row label="Business summary" value={answers.business_summary || "—"} />
                      </>
                    ) : (
                      <>
                        <Row label="Profession" value={answers.profession || "—"} />
                        <Row label="Field of practice" value={answers.practice_field || "—"} />
                        <Row label="Work status" value={answers.practice_type || "—"} />
                        <Row label="Employer or practice" value={answers.employer || "—"} />
                        <Row label="Location" value={[answers.city, answers.country].filter(Boolean).join(", ") || "—"} />
                        <Row label="Experience" value={answers.experience || "—"} />
                        <Row label="Qualifications" value={answers.qualifications || "—"} />
                        <Row label="Professional body / licence" value={answers.licence_reference || "—"} />
                        <Row label="Work phone" value={answers.work_phone || "—"} />
                        <Row label="Work email" value={answers.work_email || "—"} />
                        <Row label="Portfolio or LinkedIn" value={answers.portfolio_url || "—"} />
                        <Row label="Practice summary" value={answers.practice_summary || "—"} />
                        <Row label="Service and values" value={answers.service_values || "—"} />
                        <Row label="Career and service goals" value={answers.career_goals || "—"} />
                      </>
                    )}
                    <Row label="Impact commitment" value={answers.impact_statement || "—"} />
                    <Row label="SDGs" value={answers.sdgs.length ? answers.sdgs.join(", ") : "—"} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}

        {false && application != null && (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review tracker</h2>
              <ol className="mt-4 space-y-2 text-sm">
                {trackStages.map((s, i) => {
                  const record = data?.stages.find((r) => r.stage_code === s.code);
                  const done = stageIndex > i || record?.status === "completed";
                  const current = stageIndex === i;
                  return (
                    <li key={s.code} className="flex items-start gap-3">
                      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${current ? "gradient-brand text-white" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                      <span>
                        <span className={current ? "font-semibold" : done ? "" : "text-muted-foreground"}>{s.label}</span>
                        {record?.notes && <span className="block text-xs text-muted-foreground">{record.notes}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {application.decision_reason && <p className="mt-4 rounded-xl bg-muted p-3 text-xs">Decision note: {application.decision_reason}</p>}
            </section>
        )}
      </div>
    </MemberPage>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-border py-2"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
