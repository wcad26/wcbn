import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartHandshake,
  Target,
} from "lucide-react";
import { MemberPage } from "@/components/wcbn/admin-page";
import { StatTile } from "@/components/wcbn/stat-tile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SDGS, useIdentity } from "@/lib/wcbn";
import { reviewStatusLabel, useImpactData } from "@/lib/wcbn-impact";

export const Route = createFileRoute("/portal/impact/")({ component: ImpactPage });

function statusTone(status: string | undefined | null) {
  if (status === "approved") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "submitted") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "changes_requested") return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "border-border bg-muted text-muted-foreground";
}

function ImpactPage() {
  const { data: identity } = useIdentity();
  const wcbnId = identity?.wcbnMember?.id;
  const currentYear = new Date().getFullYear();
  const { data, isLoading } = useImpactData(wcbnId);

  const reviews = data?.reviews ?? [];
  const thisYear = reviews.find((r) => r.review_year === currentYear) ?? null;
  const commitment = data?.commitment ?? null;
  const measures = Array.isArray(commitment?.measures) ? (commitment!.measures as string[]) : [];

  const totalJobs = reviews.reduce((s, r) => s + Number(r.jobs_created || 0), 0);
  const totalTrained = reviews.reduce((s, r) => s + Number(r.people_trained || 0), 0);
  const totalInitiatives = reviews.reduce((s, r) => s + Number(r.community_initiatives || 0), 0);

  return (
    <MemberPage
      title="Annual Impact"
      description="Report your yearly impact. Approved reports go live on your public business profile."
      action={
        data?.business?.slug ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-xl">
            <Link to="/businesses/$slug" params={{ slug: data.business.slug }} target="_blank">
              <span>Public profile</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Jobs created" value={totalJobs.toLocaleString()} detail="All reported years" icon={Briefcase} tone="blue" />
            <StatTile label="People trained" value={totalTrained.toLocaleString()} detail="Mentored & upskilled" icon={GraduationCap} tone="emerald" />
            <StatTile label="Initiatives" value={totalInitiatives.toLocaleString()} detail="Community projects" icon={HeartHandshake} tone="amber" />
            <StatTile
              label={`${currentYear} report`}
              value={thisYear ? reviewStatusLabel(thisYear.status) : "Due"}
              detail={thisYear?.status === "approved" ? "Live on directory" : "Awaiting submission"}
              icon={thisYear?.status === "approved" ? CheckCircle2 : Clock}
              tone={thisYear?.status === "approved" ? "emerald" : "primary"}
            />
          </div>

          {thisYear?.status === "changes_requested" && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-foreground">Revision requested</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {thisYear.review_feedback || "Leadership asked for clarification on your report."}
                </p>
              </div>
            </div>
          )}

          {/* The two actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-xs">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </span>
                  <Badge variant="outline" className={`rounded-full text-[11px] ${statusTone(thisYear?.status)}`}>
                    {reviewStatusLabel(thisYear?.status)}
                  </Badge>
                </div>
                <h2 className="mt-4 text-base font-bold text-foreground">{currentYear} annual impact review</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Jobs created, people trained, partnerships and milestones for the year.
                </p>
              </div>
              <Button asChild className="mt-5 w-full rounded-xl">
                <Link to="/portal/impact/review" search={{ year: currentYear }}>
                  {thisYear ? "Update annual review" : "Submit annual review"}
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </section>

            <section className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-xs">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Target className="size-5" />
                  </span>
                  <Badge variant="outline" className={`rounded-full text-[11px] ${commitment ? statusTone("approved") : statusTone(null)}`}>
                    {commitment ? `Target ${commitment.target_year}` : "Not set"}
                  </Badge>
                </div>
                <h2 className="mt-4 text-base font-bold text-foreground">Multi-year commitment</h2>
                {commitment ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{commitment.statement}</p>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Your long-term pledge to the network, with measurable targets and SDGs.
                  </p>
                )}
              </div>
              <Button asChild variant="outline" className="mt-5 w-full rounded-xl">
                <Link to="/portal/impact/commitment">
                  {commitment ? "Update commitment" : "Set commitment"}
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </section>
          </div>

          {commitment && (measures.length > 0 || (commitment.sdg_numbers ?? []).length > 0) && (
            <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs">
              <h3 className="text-sm font-bold text-foreground">Commitment targets</h3>
              {measures.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {measures.map((m) => (
                    <li key={m} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
              {(commitment.sdg_numbers ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(commitment.sdg_numbers ?? []).map((n: number) => (
                    <span key={n} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {n}. {SDGS[n - 1]}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* History */}
          <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Submitted reports</h3>
            {!reviews.length ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No annual reports submitted yet.</p>
            ) : (
              <div className="mt-2 divide-y divide-border/60">
                {reviews.map((r) => (
                  <Link
                    key={r.id}
                    to="/portal/impact/review"
                    search={{ year: r.review_year }}
                    className="flex items-center justify-between gap-3 py-3 transition hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{r.review_year}</span>
                        <Badge variant="outline" className={`rounded-full text-[10px] ${statusTone(r.status)}`}>
                          {reviewStatusLabel(r.status)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {r.jobs_created} jobs · {r.people_trained} trained · {r.businesses_supported} partners
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </MemberPage>
  );
}
