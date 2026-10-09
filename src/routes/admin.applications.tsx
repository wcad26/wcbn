import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck, Briefcase, CheckCircle2, Clock, Globe, Landmark,
  Linkedin, Loader2, Mail, MapPin, Phone, Search, Send, Sparkles,
  UserCheck, Users, XCircle, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { stagesFor, trackLabel, useIdentity, money } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/applications")({ component: ApplicationsPipeline });

function ApplicationsPipeline() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [track, setTrack] = useState<"all" | "business" | "professional">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wcbn_applications")
        .select(`
          *,
          wcbn_members (
            id, category, category_id, status, profile_id,
            profiles (first_name, last_name, email, phone),
            members (member_id, status, join_date, region_id)
          ),
          wcbn_application_stages (id, stage_code, status, notes, created_at, reviewer_id),
          wcbn_invoices (id, invoice_number, amount, paid_amount, status, currency_code, billing_cycle)
        `)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["wcbn", "categories"],
    queryFn: async () => {
      const { data } = await supabase.from("wcbn_membership_categories").select("id, name, code, applicant_type");
      return data ?? [];
    },
  });

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const visible = useMemo(() => {
    return (applications ?? []).filter((a) => {
      const matchesTrack = track === "all" || (a.applicant_type ?? "business") === track;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && (a.status === "submitted" || a.status === "in_review" || a.status === "applied")) ||
        (statusFilter === "awaiting_payment" && a.status === "awaiting_payment") ||
        (statusFilter === "approved" && (a.status === "approved" || a.status === "inducted"));

      const m = a.wcbn_members as { profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null } | null;
      const p = m?.profiles;
      const appData = (a.applicant_data ?? {}) as Record<string, unknown>;
      const text = `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.email ?? ""} ${appData.business_name ?? ""}`.toLowerCase();
      const matchesSearch = !search.trim() || text.includes(search.toLowerCase());

      return matchesTrack && matchesStatus && matchesSearch;
    });
  }, [applications, track, statusFilter, search]);

  const app = (applications ?? []).find((a) => a.id === selected) ?? visible[0] ?? null;
  const appTrack = (app?.applicant_type ?? "business") as string;
  const appStages = stagesFor(appTrack);
  const applicantData = (app?.applicant_data ?? {}) as Record<string, unknown>;

  const advance = useMutation({
    mutationFn: async ({ stage, decision }: { stage?: string; decision?: "approved" | "rejected" | "deferred" }) => {
      if (!app) return;
      if (decision) {
        const { error } = await supabase.from("wcbn_applications").update({
          status: decision,
          current_stage: decision === "approved" ? "inducted" : "decision",
          decided_at: new Date().toISOString(),
          decided_by: identity?.userId ?? null,
          decision_reason: note || null,
        }).eq("id", app.id);
        if (error) throw error;

        if (decision === "approved") {
          await supabase.from("wcbn_members").update({
            status: "active",
            member_type: appTrack,
            inducted_at: new Date().toISOString(),
          }).eq("id", app.wcbn_member_id);
        }
      } else if (stage) {
        const { error } = await supabase.from("wcbn_applications").update({
          current_stage: stage,
          status: "in_review",
        }).eq("id", app.id);
        if (error) throw error;

        await supabase.from("wcbn_application_stages").insert({
          application_id: app.id,
          stage_code: stage,
          status: "completed",
          notes: note || null,
          reviewer_id: identity?.userId ?? null,
          completed_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      toast.success("Application status updated successfully");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage
      title="Applications Pipeline"
      description="Review and vet incoming applicant tracks (Entrepreneurs vs. Investors & Mentors), inspect credentials, and manage induction stages."
    >
      <div className="space-y-4">
        {/* Workstation Controls: Track Tabs, Status Filter, Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {([
              ["all", "All Applications"],
              ["business", "🚀 Entrepreneurs"],
              ["professional", "💎 Investors & Mentors"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => { setTrack(value); setSelected(null); }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  track === value ? "gradient-brand text-white shadow-xs" : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium"
            >
              <option value="all">All Stages</option>
              <option value="pending">Awaiting Review</option>
              <option value="awaiting_payment">Awaiting Payment</option>
              <option value="approved">Approved / Inducted</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search applicants…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Pipeline Workstation Split: Left Queue, Right Dossier */}
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Applications Left Queue */}
          <div className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading applications…</p>}
            {!isLoading && visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No applications match your selected filter.
              </div>
            )}

            <div className="space-y-2.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {visible.map((a) => {
                const m = a.wcbn_members as {
                  profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null;
                  members?: { member_id: string } | null;
                } | null;
                const p = m?.profiles;
                const d = (a.applicant_data ?? {}) as Record<string, unknown>;
                const isSelected = (selected ?? visible[0]?.id) === a.id;
                const catName = (d.category_id && categoryMap.get(d.category_id as string)) || "Category Selected";
                const isInvestor = a.applicant_type === "professional" || a.applicant_type === "investor_mentor";

                return (
                  <div
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">
                          {[p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Applicant"}
                        </h4>
                        <p className="text-xs text-muted-foreground">{p?.email}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        a.status === "approved" || a.status === "inducted"
                          ? "bg-primary/15 text-primary"
                          : a.status === "awaiting_payment"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {a.status}
                      </span>
                    </div>

                    <div className="mt-2 text-xs">
                      <span className="font-medium text-foreground">
                        {isInvestor ? String(d.investor_role || "Investor & Mentor") : String(d.business_name || "Enterprise")}
                      </span>
                      {d.city ? <span className="text-muted-foreground"> · {String(d.city)}</span> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground font-semibold">
                        {isInvestor ? "💎 Investor/Mentor" : "🚀 Entrepreneur"}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {catName}
                      </span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
                        a.wca_verified ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {a.wca_verified ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        WCA
                      </span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
                        a.dcg_verified ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}>
                        {a.dcg_verified ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        DCG
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Applicant Dossier & Vetting Controls */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            {!app ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Select an applicant from the queue to inspect details and record decisions.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Banner */}
                {(() => {
                  const m = app.wcbn_members as {
                    profiles?: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
                    members?: { member_id: string; status: string; join_date: string } | null;
                  } | null;
                  const p = m?.profiles;
                  const wca = m?.members;
                  const isInvestor = appTrack === "professional" || appTrack === "investor_mentor";
                  const catName = (applicantData.category_id && categoryMap.get(applicantData.category_id as string)) || "Custom Category";

                  return (
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-foreground">
                              {[p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Applicant"}
                            </h2>
                            <span className="rounded-full gradient-brand px-3 py-0.5 text-xs font-semibold text-white">
                              {trackLabel(appTrack)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {p?.email && <span className="flex items-center gap-1"><Mail className="size-3.5" />{p.email}</span>}
                            {p?.phone && <span className="flex items-center gap-1"><Phone className="size-3.5" />{p.phone}</span>}
                            {applicantData.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3.5" />
                                {[applicantData.city, applicantData.country].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase">Target Category</span>
                          <span className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            {catName}
                          </span>
                        </div>
                      </div>

                      {/* Verified Credentials Bar */}
                      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-muted/40 p-3.5 text-xs">
                        <span className="font-semibold text-muted-foreground">WCA Credentials:</span>
                        <span className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 font-medium shadow-2xs">
                          {app.wca_verified ? <CheckCircle2 className="size-3.5 text-primary" /> : <Clock className="size-3.5 text-amber-500" />}
                          WCA ID: {wca?.member_id ?? "Verified"} ({wca?.status ?? "active"})
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 font-medium shadow-2xs">
                          {app.dcg_verified ? <CheckCircle2 className="size-3.5 text-primary" /> : <Clock className="size-3.5 text-amber-500" />}
                          Destiny Care Group (DCG): {app.dcg_verified ? "Verified Active" : "Assignment in Review"}
                        </span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          Applied: {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Dossier Questionnaire Details */}
                      <div className="mt-6 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {isInvestor ? "Investor & Mentor Profile Responses" : "Enterprise Questionnaire Responses"}
                        </h3>

                        {!isInvestor ? (
                          /* Entrepreneur Specific Dossier */
                          <div className="grid gap-3.5 sm:grid-cols-2">
                            <InfoTile label="Enterprise Name" value={applicantData.business_name} />
                            <InfoTile label="Industry / Sector" value={applicantData.sector} />
                            <InfoTile label="Operating Location" value={[applicantData.city, applicantData.country].filter(Boolean).join(", ")} />
                            <InfoTile label="Business Stage" value={applicantData.business_stage} />

                            {applicantData.business_summary && (
                              <InfoTile label="Executive Summary" value={applicantData.business_summary} className="sm:col-span-2" />
                            )}

                            {applicantData.impact_statement && (
                              <InfoTile label="3–5 Year Kingdom Impact Commitment" value={applicantData.impact_statement} className="sm:col-span-2" />
                            )}

                            {applicantData.website_url && (
                              <InfoTile label="Website URL" value={applicantData.website_url} />
                            )}

                            {applicantData.registration_number && (
                              <InfoTile label="Registration / Tax ID" value={applicantData.registration_number} />
                            )}

                            {Array.isArray(applicantData.growth_priorities) && applicantData.growth_priorities.length > 0 && (
                              <InfoTile label="Growth Priorities" value={applicantData.growth_priorities.join(", ")} className="sm:col-span-2" />
                            )}

                            {Array.isArray(applicantData.sdgs) && applicantData.sdgs.length > 0 && (
                              <InfoTile label="Aligned SDGs" value={applicantData.sdgs.map((n) => `SDG ${n}`).join(", ")} className="sm:col-span-2" />
                            )}
                          </div>
                        ) : (
                          /* Investor & Mentor Specific Dossier */
                          <div className="grid gap-3.5 sm:grid-cols-2">
                            <InfoTile label="Primary Role / Profile" value={applicantData.investor_role} />
                            <InfoTile label="Firm / Fund / Organization" value={applicantData.organization} />
                            <InfoTile label="Location" value={[applicantData.city, applicantData.country].filter(Boolean).join(", ")} />
                            <InfoTile label="LinkedIn Profile" value={applicantData.linkedin_url} isLink />
                            <InfoTile label="Capital Capacity / Ticket Size" value={applicantData.ticket_size} />
                            <InfoTile label="Mentorship Availability" value={applicantData.mentorship_availability} />

                            {applicantData.preferred_sectors && (
                              <InfoTile label="Preferred Sectors for Backing" value={applicantData.preferred_sectors} className="sm:col-span-2" />
                            )}

                            {applicantData.experience_summary && (
                              <InfoTile label="Executive Track Record & Experience" value={applicantData.experience_summary} className="sm:col-span-2" />
                            )}

                            {applicantData.kingdom_vision && (
                              <InfoTile label="Kingdom Vision & Contribution" value={applicantData.kingdom_vision} className="sm:col-span-2" />
                            )}

                            {Array.isArray(applicantData.advisory_areas) && applicantData.advisory_areas.length > 0 && (
                              <InfoTile label="Domains of Mentorship Expertise" value={applicantData.advisory_areas.join(", ")} className="sm:col-span-2" />
                            )}

                            {Array.isArray(applicantData.sdgs) && applicantData.sdgs.length > 0 && (
                              <InfoTile label="Aligned SDGs" value={applicantData.sdgs.map((n) => `SDG ${n}`).join(", ")} className="sm:col-span-2" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stage Progression History */}
                      <div className="mt-8 border-t border-border pt-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Vetting Stage Progression
                        </h3>
                        <div className="mt-3 space-y-2">
                          {(app.wcbn_application_stages as { id: string; stage_code: string; status: string; notes: string | null; created_at: string }[] | null)?.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Application recently received at stage: Applied.</p>
                          ) : (
                            (app.wcbn_application_stages as { id: string; stage_code: string; status: string; notes: string | null; created_at: string }[] | null)?.map((s) => (
                              <div key={s.id} className="flex items-start justify-between rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-xs">
                                <div>
                                  <span className="font-semibold text-foreground">
                                    {appStages.find((x) => x.code === s.stage_code)?.label ?? s.stage_code}
                                  </span>
                                  {s.notes && <p className="mt-0.5 text-muted-foreground">Note: {s.notes}</p>}
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(s.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Review Action Controls */}
                      <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Advance Stage or Record Decision</h4>
                          <p className="text-xs text-muted-foreground">Add reviewer feedback and transition the applicant to the next vetting milestone.</p>
                        </div>

                        <Textarea
                          rows={2}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Enter reviewer feedback, interview remarks, or approval note…"
                          className="bg-background"
                        />

                        {/* Advance to Specific Stage */}
                        <div>
                          <span className="mb-2 block text-xs font-semibold text-muted-foreground">Advance to stage:</span>
                          <div className="flex flex-wrap gap-2">
                            {appStages.filter((s) => s.code !== "applied" && s.code !== "inducted").map((s) => (
                              <Button
                                key={s.code}
                                size="sm"
                                variant="outline"
                                disabled={advance.isPending}
                                onClick={() => advance.mutate({ stage: s.code })}
                                className="text-xs h-8 bg-background"
                              >
                                {s.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Final Decision Bar */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                          <Button
                            size="sm"
                            disabled={advance.isPending}
                            onClick={() => advance.mutate({ decision: "approved" })}
                            className="gradient-brand text-white font-semibold"
                          >
                            {advance.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                            Approve & Induct Member
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={advance.isPending}
                            onClick={() => advance.mutate({ decision: "deferred" })}
                            className="text-xs"
                          >
                            Defer
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={advance.isPending}
                            onClick={() => advance.mutate({ decision: "rejected" })}
                            className="text-xs"
                          >
                            <XCircle className="size-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

function InfoTile({
  label,
  value,
  className = "",
  isLink = false,
}: {
  label: string;
  value: unknown;
  className?: string;
  isLink?: boolean;
}) {
  const text = String(value || "—");
  return (
    <div className={`rounded-2xl border border-border bg-card p-3.5 ${className}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {isLink && value ? (
        <a href={text} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {text} <ArrowRight className="size-3" />
        </a>
      ) : (
        <p className="mt-1 text-sm font-medium text-foreground whitespace-pre-wrap">{text}</p>
      )}
    </div>
  );
}
