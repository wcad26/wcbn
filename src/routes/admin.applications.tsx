import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { stagesFor, trackLabel, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/applications")({ component: ApplicationsPipeline });

function ApplicationsPipeline() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [track, setTrack] = useState<"all" | "business" | "professional">("all");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: async () => (await supabase
      .from("wcbn_applications")
      .select("*, wcbn_members(id, category, status, profile_id, profiles(first_name, last_name, email)), wcbn_application_stages(id, stage_code, status, notes, created_at)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const visible = (applications ?? []).filter((a) => track === "all" || (a.applicant_type ?? "business") === track);
  const app = visible.find((a) => a.id === selected) ?? null;
  const appTrack = (app?.applicant_type ?? "business") as string;
  const appStages = stagesFor(appTrack);

  const advance = useMutation({
    mutationFn: async ({ stage, decision }: { stage?: string; decision?: "approved" | "rejected" | "deferred" }) => {
      if (!app) return;
      if (decision) {
        const { error } = await supabase.from("wcbn_applications").update({
          status: decision, current_stage: decision === "approved" ? "inducted" : "decision",
          decided_at: new Date().toISOString(), decided_by: identity?.userId ?? null, decision_reason: note || null,
        }).eq("id", app.id);
        if (error) throw error;
        if (decision === "approved") {
          await supabase.from("wcbn_members").update({ status: "active", category: "Member", member_type: appTrack, inducted_at: new Date().toISOString() }).eq("id", app.wcbn_member_id);
        }
      } else if (stage) {
        const { error } = await supabase.from("wcbn_applications").update({ current_stage: stage, status: "in_review" }).eq("id", app.id);
        if (error) throw error;
        await supabase.from("wcbn_application_stages").insert({ application_id: app.id, stage_code: stage, status: "completed", notes: note || null, reviewer_id: identity?.userId ?? null, completed_at: new Date().toISOString() });
      }
    },
    onSuccess: () => { toast.success("Application updated"); setNote(""); queryClient.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Applications pipeline" description="Move each applicant through the validation stages, record reviewer notes and make the final decision.">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {([["all", "All Applications"], ["business", "🚀 Entrepreneurs"], ["professional", "💎 Investors & Mentors"]] as const).map(([value, label]) => (
              <button key={value} onClick={() => { setTrack(value); setSelected(null); }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${track === value ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                {label}
              </button>
            ))}
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">Loading applications…</p>}
          {!isLoading && visible.length === 0 && <p className="text-sm text-muted-foreground">No applications in this track yet.</p>}
          {visible.map((a) => {
            const m = a.wcbn_members as { profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null } | null;
            const p = m?.profiles;
            return (
              <button key={a.id} onClick={() => setSelected(a.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected === a.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                <p className="font-semibold">{[p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Applicant"}</p>
                <p className="text-xs text-muted-foreground">{stagesFor(a.applicant_type).find((s) => s.code === a.current_stage)?.label ?? a.current_stage} · {a.status}</p>
                <div className="mt-2 flex gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium">{trackLabel(a.applicant_type)}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${a.wca_verified ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>WCA</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${a.dcg_verified ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>DCG</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          {!app ? <p className="text-sm text-muted-foreground">Select an application to review it.</p> : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Application review</h2>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{trackLabel(appTrack)} track</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                {fieldsFor(appTrack, app.applicant_data as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{FIELD_LABELS[k] ?? k.replace(/_/g, " ")}</p>
                    <p className="mt-1 whitespace-pre-wrap">{Array.isArray(v) ? v.join(", ") : String(v || "—")}</p>
                  </div>
                ))}
              </div>

              <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stage history</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {(app.wcbn_application_stages as { id: string; stage_code: string; status: string; notes: string | null }[] | null)?.map((s) => (
                  <li key={s.id} className="rounded-xl border border-border px-4 py-2"><span className="font-medium">{appStages.find((x) => x.code === s.stage_code)?.label ?? s.stage_code}</span> · {s.status}{s.notes ? ` — ${s.notes}` : ""}</li>
                ))}
              </ul>

              <div className="mt-8 space-y-4">
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reviewer note for this stage or decision" />
                <div className="flex flex-wrap gap-2">
                  {appStages.filter((s) => s.code !== "applied").map((s) => (
                    <Button key={s.code} size="sm" variant="outline" disabled={advance.isPending} onClick={() => advance.mutate({ stage: s.code })}>Move to {s.label}</Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button disabled={advance.isPending} onClick={() => advance.mutate({ decision: "approved" })}>{advance.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Approve & induct</Button>
                  <Button variant="outline" disabled={advance.isPending} onClick={() => advance.mutate({ decision: "deferred" })}>Defer</Button>
                  <Button variant="destructive" disabled={advance.isPending} onClick={() => advance.mutate({ decision: "rejected" })}><XCircle />Reject</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminPage>
  );
}

const FIELD_LABELS: Record<string, string> = {
  business_name: "Business or venture name", sector: "Industry / Sector", cities: "Cities of operation", founding_year: "Founding year",
  employees: "Team size", business_phone: "Business phone", business_email: "Business email",
  business_stage: "Business stage", growth_priorities: "Growth priorities", website_url: "Website / Portfolio",
  registration_number: "Registration / Tax reference", business_summary: "What the business does",
  documents: "Registration references",
  investor_role: "Primary investor / mentor role", organization: "Firm / Organization / Fund",
  linkedin_url: "LinkedIn profile", advisory_areas: "Domains of advisory expertise", preferred_sectors: "Preferred sectors",
  ticket_size: "Capital capacity / Ticket size", mentorship_availability: "Mentorship availability",
  experience_summary: "Executive track record & experience", kingdom_vision: "Kingdom vision & contribution",
  profession: "Profession", practice_field: "Field of practice", practice_type: "Work status", employer: "Employer",
  experience: "Years of experience", qualifications: "Qualifications", licence_reference: "Licence reference",
  work_phone: "Work phone", work_email: "Work email", practice_summary: "What they do",
  service_values: "Service & values", career_goals: "Career and service goals", portfolio_url: "Portfolio",
  country: "Country", city: "City", impact_statement: "Kingdom impact commitment", sdgs: "Aligned SDGs",
};

const TRACK_FIELDS: Record<string, string[]> = {
  business: [
    "business_name", "sector", "country", "city", "business_stage", "business_summary",
    "growth_priorities", "website_url", "registration_number", "impact_statement", "sdgs",
    "cities", "founding_year", "employees", "business_phone", "business_email", "documents"
  ],
  professional: [
    "investor_role", "organization", "country", "city", "linkedin_url", "ticket_size",
    "mentorship_availability", "advisory_areas", "preferred_sectors", "experience_summary",
    "kingdom_vision", "impact_statement", "sdgs",
    "profession", "practice_field", "practice_type", "employer", "experience", "qualifications"
  ],
};

/** Shows only the answers that belong to the applicant's track, in a readable order. */
function fieldsFor(track: string, data: Record<string, unknown>): [string, unknown][] {
  const order = TRACK_FIELDS[track] ?? TRACK_FIELDS['business']!;
  const known = order.filter((k) => k in data).map((k) => [k, data[k]] as [string, unknown]);
  const extras = Object.entries(data).filter(([k]) => !order.includes(k) && !TRACK_FIELDS['business']!.includes(k) && !TRACK_FIELDS['professional']!.includes(k));
  return [...known, ...extras];
}
