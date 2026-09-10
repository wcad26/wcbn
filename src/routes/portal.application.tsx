import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Save, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SDGS, ensureWcbnMember, useIdentity, useInvalidateIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal/application")({ component: ApplicationPage });

type Answers = {
  business_name: string; sector: string; country: string; years_operating: string; employees: string;
  business_summary: string; testimony: string; leadership: string; impact_statement: string;
  sdgs: number[]; references: string; documents: string;
};

const EMPTY: Answers = { business_name: "", sector: "", country: "", years_operating: "", employees: "", business_summary: "", testimony: "", leadership: "", impact_statement: "", sdgs: [], references: "", documents: "" };

const STEPS = ["Business", "Character & leadership", "Impact & SDGs", "Review & submit"];

function ApplicationPage() {
  const { data: identity } = useIdentity();
  const refreshIdentity = useInvalidateIdentity();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const wcbnId = identity?.wcbnMember?.id;

  const { data: application, isLoading } = useQuery({
    queryKey: ["portal", "application", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => (await supabase.from("wcbn_applications").select("*").eq("wcbn_member_id", wcbnId!).maybeSingle()).data,
  });

  useEffect(() => {
    if (application?.applicant_data) setAnswers({ ...EMPTY, ...(application.applicant_data as Partial<Answers>) });
  }, [application]);

  const eligible = !!identity?.wcaActive && !!identity?.dcgActive;
  const submitted = application?.status && application.status !== "draft";

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
        status: submit ? "submitted" : "draft",
        current_stage: submit ? "applied" : "draft",
        submitted_at: submit ? new Date().toISOString() : null,
      };
      if (application) {
        const { error } = await supabase.from("wcbn_applications").update(payload).eq("id", application.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_applications").insert(payload);
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

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  return (
    <MemberPage title="My application" description="Your WCA identity, region and DCG are verified automatically. Only new business, character and impact information is collected.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <ol className="mb-8 flex flex-wrap gap-2">
            {STEPS.map((label, i) => (
              <li key={label}>
                <button onClick={() => setStep(i)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${step === i ? "gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{i + 1}. {label}</button>
              </li>
            ))}
          </ol>

          {isLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading your application…</p> : (
            <>
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Business or practice name"><Input value={answers.business_name} onChange={(e) => set("business_name", e.target.value)} /></Field>
                  <Field label="Sector"><Input value={answers.sector} onChange={(e) => set("sector", e.target.value)} placeholder="e.g. Agribusiness" /></Field>
                  <Field label="Country of operation"><Input value={answers.country} onChange={(e) => set("country", e.target.value)} /></Field>
                  <Field label="Years operating"><Input type="number" value={answers.years_operating} onChange={(e) => set("years_operating", e.target.value)} /></Field>
                  <Field label="Team size"><Input type="number" value={answers.employees} onChange={(e) => set("employees", e.target.value)} /></Field>
                  <Field label="Registration / licence references" className="md:col-span-2"><Input value={answers.documents} onChange={(e) => set("documents", e.target.value)} placeholder="Registration number, licence numbers" /></Field>
                  <Field label="What does the business do?" className="md:col-span-2"><Textarea rows={5} value={answers.business_summary} onChange={(e) => set("business_summary", e.target.value)} /></Field>
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4">
                  <Field label="Your walk of faith and Christian conduct in business"><Textarea rows={6} value={answers.testimony} onChange={(e) => set("testimony", e.target.value)} /></Field>
                  <Field label="Leadership and influence — who are you developing?"><Textarea rows={5} value={answers.leadership} onChange={(e) => set("leadership", e.target.value)} /></Field>
                  <Field label="WCA leaders who can speak for you"><Input value={answers.references} onChange={(e) => set("references", e.target.value)} placeholder="Names and roles" /></Field>
                </div>
              )}
              {step === 2 && (
                <div className="grid gap-4">
                  <Field label="Your 3–5 year impact commitment"><Textarea rows={5} value={answers.impact_statement} onChange={(e) => set("impact_statement", e.target.value)} /></Field>
                  <div>
                    <Label className="mb-3 block">Sustainable Development Goals you advance</Label>
                    <div className="flex flex-wrap gap-2">
                      {SDGS.map((label, i) => {
                        const n = i + 1; const on = answers.sdgs.includes(n);
                        return <button type="button" key={n} onClick={() => set("sdgs", on ? answers.sdgs.filter((s) => s !== n) : [...answers.sdgs, n])} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? "gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{n}. {label}</button>;
                      })}
                    </div>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4 text-sm">
                  <Row label="Applicant" value={identity?.fullName ?? "—"} />
                  <Row label="WCA member ID" value={identity?.member?.member_id ?? "—"} />
                  <Row label="Region" value={identity?.regionName ?? "—"} />
                  <Row label="DCG" value={identity?.dcgName ?? "—"} />
                  <Row label="Business" value={answers.business_name || "—"} />
                  <Row label="SDGs" value={answers.sdgs.length ? answers.sdgs.join(", ") : "—"} />
                  <p className="text-muted-foreground">By submitting you confirm the information is accurate and agree to the WCBN validation process and Covenant.</p>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="outline" disabled={save.isPending || !!submitted} onClick={() => save.mutate(false)}><Save />Save progress</Button>
                {step < 3 ? <Button onClick={() => setStep(step + 1)}>Next step</Button>
                  : <Button disabled={save.isPending || !eligible || !!submitted} onClick={() => save.mutate(true)}>{save.isPending ? <Loader2 className="animate-spin" /> : <Send />}Submit application</Button>}
              </div>
              {submitted && <p className="mt-4 text-sm text-primary">Your application has been submitted and is now with WCBN reviewers.</p>}
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
            {!eligible && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">Both are mandatory before an application can be submitted. Contact your regional WCA office to update your record.</p>}
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card text-sm text-muted-foreground">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Your details</h2>
            <p className="mt-3">{identity?.fullName}</p>
            <p>{identity?.email}</p>
            <p>{identity?.regionName ?? "Region not set"} · {identity?.dcgName ?? "No DCG"}</p>
          </div>
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
