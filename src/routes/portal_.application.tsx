import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Loader2, Save, Send, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, SDGS, SECTORS, STAGES, documentUrl, ensureWcbnMember, uploadDocument, useIdentity, useInvalidateIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal_/application")({ component: ApplicationPage });

type Answers = {
  business_name: string; sector: string; country: string; cities: string; years_operating: string; employees: string;
  business_summary: string; testimony: string; leadership: string; impact_statement: string;
  sdgs: number[]; references: string; documents: string;
};

const EMPTY: Answers = { business_name: "", sector: "", country: "", cities: "", years_operating: "", employees: "", business_summary: "", testimony: "", leadership: "", impact_statement: "", sdgs: [], references: "", documents: "" };

const STEPS = ["Business", "Impact & SDGs", "Review & submit"] as const;
const LAST = STEPS.length - 1;

const REQUIRED: Record<number, (keyof Answers)[]> = {
  0: ["business_name", "sector", "country", "cities", "business_summary"],
  1: ["impact_statement"],
  2: [],
};

function ApplicationPage() {
  const { data: identity, isLoading: identityLoading } = useIdentity();
  const refreshIdentity = useInvalidateIdentity();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const wcbnId = identity?.wcbnMember?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "application", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const { data: application } = await supabase.from("wcbn_applications").select("*").eq("wcbn_member_id", wcbnId!).maybeSingle();
      const [stages, documents] = await Promise.all([
        application ? supabase.from("wcbn_application_stages").select("*").eq("application_id", application.id).order("created_at") : Promise.resolve({ data: [] }),
        supabase.from("wcbn_member_documents").select("*").eq("wcbn_member_id", wcbnId!).eq("kind", "application").order("created_at", { ascending: false }),
      ]);
      return { application, stages: stages.data ?? [], documents: documents.data ?? [] };
    },
  });

  const application = data?.application;

  useEffect(() => {
    if (application?.applicant_data) setAnswers({ ...EMPTY, ...(application.applicant_data as Partial<Answers>) });
  }, [application]);

  const eligible = !!identity?.wcaActive && !!identity?.dcgActive;
  const submitted = !!application?.status && application.status !== "draft";
  const stageIndex = STAGES.findIndex((s) => s.code === application?.current_stage);

  const completion = useMemo(() => {
    const fields = [...REQUIRED[0]!, ...REQUIRED[1]!];
    const done = fields.filter((f) => String(answers[f] ?? "").trim().length > 0).length;
    return Math.round((done / fields.length) * 100);
  }, [answers]);

  const missing = (i: number) => REQUIRED[i]!.filter((f) => !String(answers[f] ?? "").trim());

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const { data: version } = await supabase.from("wcbn_criteria_versions").select("id").eq("is_active", true).order("version_number", { ascending: false }).limit(1).maybeSingle();
      if (!version) throw new Error("No active criteria version has been configured yet.");
      const payload = {
        wcbn_member_id: memberId,
        criteria_version_id: version.id,
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
        const { error } = await supabase.rpc("wcbn_submit_application", { _application_id: applicationId! });
        if (error) throw error;
      }
    },
    onSuccess: (_d, submit) => {
      toast.success(submit ? "Application submitted for review" : "Progress saved");
      refreshIdentity();
      queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function addDocument(file: File) {
    if (!identity) return;
    setUploading(true);
    try {
      const memberId = await ensureWcbnMember(identity);
      const path = await uploadDocument(identity.userId, "application", file);
      const { error } = await supabase.from("wcbn_member_documents").insert({ wcbn_member_id: memberId, uploaded_by: identity.userId, kind: "application", label: file.name, storage_path: path });
      if (error) throw error;
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["portal", "application"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(id: string) {
    const { error } = await supabase.from("wcbn_member_documents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["portal", "application"] });
  }

  async function openDocument(path: string) {
    try { window.open(await documentUrl(path), "_blank", "noopener"); }
    catch (e) { toast.error((e as Error).message); }
  }

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  const busy = identityLoading || isLoading;

  return (
    <MemberPage title="My application" description="Your WCA identity, region and DCG are verified automatically. Only new business, character and impact information is collected.">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
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
            {STEPS.map((label, i) => (
              <li key={label}>
                <button onClick={() => setStep(i)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${step === i ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{i + 1}. {label}</button>
              </li>
            ))}
          </ol>

          {busy ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading your application…</p> : (
            <>
              {submitted && (
                <div className="mb-6 rounded-2xl bg-primary/10 p-4 text-sm text-primary">
                  Your application was submitted{application?.submitted_at ? ` on ${new Date(application.submitted_at).toLocaleDateString()}` : ""} and is now with WCBN reviewers. It can no longer be edited.
                </div>
              )}
              <fieldset disabled={submitted} className="contents">
              {step === 0 && (
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
                  <Field label="Years operating"><Input type="number" value={answers.years_operating} onChange={(e) => set("years_operating", e.target.value)} /></Field>
                  <Field label="Team size"><Input type="number" value={answers.employees} onChange={(e) => set("employees", e.target.value)} /></Field>
                  <Field label="Registration / licence references (optional)" className="md:col-span-2"><Input value={answers.documents} onChange={(e) => set("documents", e.target.value)} placeholder="Registration number, licence numbers" /></Field>
                  <Field label="What does the business do?" className="md:col-span-2"><Textarea rows={5} value={answers.business_summary} onChange={(e) => set("business_summary", e.target.value)} /></Field>
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4">
                  <Field label="Your 3–5 year impact commitment"><Textarea rows={5} value={answers.impact_statement} onChange={(e) => set("impact_statement", e.target.value)} /></Field>
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
                <div className="space-y-4 text-sm">
                  <Row label="Applicant" value={identity?.fullName ?? "—"} />
                  <Row label="WCA member ID" value={identity?.member?.member_id ?? "—"} />
                  <Row label="Region" value={identity?.regionName ?? "—"} />
                  <Row label="DCG" value={identity?.dcgName ?? "—"} />
                  <Row label="Business" value={answers.business_name || "—"} />
                  <Row label="Sector" value={answers.sector || "—"} />
                  <Row label="Country" value={answers.country || "—"} />
                  <Row label="Cities" value={answers.cities || "—"} />
                  <Row label="SDGs" value={answers.sdgs.length ? answers.sdgs.join(", ") : "—"} />
                  <Row label="Documents attached" value={String(data?.documents.length ?? 0)} />
                  {[0, 1].some((i) => missing(i).length > 0) && (
                    <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">Some required answers are still empty. Complete steps 1–2 before submitting.</p>
                  )}
                  <p className="text-muted-foreground">By submitting you confirm the information is accurate and agree to the WCBN validation process and Covenant.</p>
                </div>
              )}
              </fieldset>

              <div className="mt-8 flex flex-wrap gap-3">
                {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
                <Button variant="outline" disabled={save.isPending || submitted} onClick={() => save.mutate(false)}><Save />Save progress</Button>
                {step < LAST
                  ? <Button onClick={() => { const m = missing(step); if (m.length && !submitted) { toast.error("Please complete the required answers on this step first."); return; } setStep(step + 1); }}>Next step</Button>
                  : <Button disabled={save.isPending || !eligible || submitted || [0, 1].some((i) => missing(i).length > 0)} onClick={() => save.mutate(true)}>{save.isPending ? <Loader2 className="animate-spin" /> : <Send />}Submit application</Button>}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Verified from WCA</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2">{identity?.wcaActive ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />}Active WCA membership</li>
              <li className="flex items-center gap-2">{identity?.dcgActive ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />}Active DCG participation</li>
            </ul>
            {!eligible && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">Both are mandatory before an application can be submitted. Contact your regional WCA office so your membership or DCG record can be reactivated.</p>}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Supporting documents</h2>
            <p className="mt-2 text-xs text-muted-foreground">Registration certificate, licences, reference letters. Only you and WCBN reviewers can open them.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium hover:border-primary/50">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}{uploading ? "Uploading…" : "Upload a document"}
              <input type="file" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) addDocument(f); e.target.value = ""; }} />
            </label>
            <ul className="mt-4 space-y-2 text-sm">
              {!data?.documents.length && <li className="text-xs text-muted-foreground">No documents uploaded yet.</li>}
              {data?.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                  <button className="truncate text-left text-xs hover:text-primary" onClick={() => openDocument(d.storage_path)}>{d.label}</button>
                  <Button size="icon" variant="ghost" onClick={() => removeDocument(d.id)} aria-label="Remove document"><Trash2 className="size-4" /></Button>
                </li>
              ))}
            </ul>
          </div>

          {application && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review tracker</h2>
              <ol className="mt-4 space-y-2 text-sm">
                {STAGES.map((s, i) => {
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
            </div>
          )}
        </aside>
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
