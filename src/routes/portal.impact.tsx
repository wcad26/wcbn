import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  History,
  Info,
  Loader2,
  Save,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SDGS, ensureWcbnMember, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal/impact")({ component: ImpactPage });

interface AnnualReviewRow {
  id: string;
  review_year: number;
  status: string;
  jobs_created: number;
  people_trained: number;
  businesses_supported: number;
  community_initiatives: number;
  achievements: string | null;
  challenges: string | null;
  next_objectives: string | null;
  sdg_evidence: unknown;
  submitted_at: string | null;
  reviewed_at?: string | null;
  review_feedback?: string | null;
}

export function ImpactPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const wcbnId = identity?.wcbnMember?.id;
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [statement, setStatement] = useState("");
  const [targetYear, setTargetYear] = useState(String(currentYear + 3));
  const [sdgs, setSdgs] = useState<number[]>([]);
  const [measures, setMeasures] = useState("");
  const [review, setReview] = useState({
    jobs_created: "",
    people_trained: "",
    businesses_supported: "",
    community_initiatives: "",
    achievements: "",
    challenges: "",
    next_objectives: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "impact", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const [commitment, reviews, biz] = await Promise.all([
        supabase.from("wcbn_impact_commitments").select("*").eq("wcbn_member_id", wcbnId!).maybeSingle(),
        supabase.from("wcbn_annual_reviews").select("*").eq("wcbn_member_id", wcbnId!).order("review_year", { ascending: false }),
        supabase.from("wcbn_businesses").select("id, slug, display_name").eq("owner_member_id", wcbnId!).limit(1).maybeSingle(),
      ]);
      return {
        commitment: commitment.data,
        reviews: (reviews.data ?? []) as unknown as AnnualReviewRow[],
        business: biz.data,
      };
    },
  });

  useEffect(() => {
    if (!data?.commitment) return;
    setStatement(data.commitment.statement);
    setTargetYear(String(data.commitment.target_year));
    setSdgs(data.commitment.sdg_numbers ?? []);
    setMeasures(Array.isArray(data.commitment.measures) ? (data.commitment.measures as string[]).join("\n") : "");
  }, [data?.commitment]);

  const activeReview = data?.reviews.find((r) => r.review_year === selectedYear) ?? null;
  const isApproved = activeReview?.status === "approved";
  const isPendingReview = activeReview?.status === "submitted";
  const isChangesRequested = activeReview?.status === "changes_requested";

  useEffect(() => {
    if (activeReview) {
      setReview({
        jobs_created: String(activeReview.jobs_created ?? ""),
        people_trained: String(activeReview.people_trained ?? ""),
        businesses_supported: String(activeReview.businesses_supported ?? ""),
        community_initiatives: String(activeReview.community_initiatives ?? ""),
        achievements: activeReview.achievements ?? "",
        challenges: activeReview.challenges ?? "",
        next_objectives: activeReview.next_objectives ?? "",
      });
    } else {
      setReview({
        jobs_created: "",
        people_trained: "",
        businesses_supported: "",
        community_initiatives: "",
        achievements: "",
        challenges: "",
        next_objectives: "",
      });
    }
  }, [activeReview, selectedYear]);

  // Aggregate metrics across all approved or submitted reviews
  const totalJobs = (data?.reviews ?? []).reduce((sum, r) => sum + Number(r.jobs_created || 0), 0);
  const totalTrained = (data?.reviews ?? []).reduce((sum, r) => sum + Number(r.people_trained || 0), 0);
  const totalInitiatives = (data?.reviews ?? []).reduce((sum, r) => sum + Number(r.community_initiatives || 0), 0);

  const saveCommitment = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const payload = {
        wcbn_member_id: memberId,
        statement,
        target_year: Number(targetYear),
        sdg_numbers: sdgs,
        measures: measures.split("\n").filter(Boolean),
        status: "active",
      };
      if (data?.commitment) {
        const { error } = await supabase.from("wcbn_impact_commitments").update(payload).eq("id", data.commitment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_impact_commitments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Impact commitment saved successfully");
      queryClient.invalidateQueries({ queryKey: ["portal", "impact"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const payload = {
        wcbn_member_id: memberId,
        review_year: selectedYear,
        jobs_created: Number(review.jobs_created || 0),
        people_trained: Number(review.people_trained || 0),
        businesses_supported: Number(review.businesses_supported || 0),
        community_initiatives: Number(review.community_initiatives || 0),
        achievements: review.achievements || null,
        challenges: review.challenges || null,
        next_objectives: review.next_objectives || null,
        sdg_evidence: sdgs,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      };
      if (activeReview) {
        const { error } = await supabase.from("wcbn_annual_reviews").update(payload).eq("id", activeReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_annual_reviews").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`${selectedYear} impact report submitted for leadership review.`);
      queryClient.invalidateQueries({ queryKey: ["portal", "impact"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberPage
      title="Annual Impact & Directory Verification"
      description="Record your yearly business impact. When leadership approves your submission, verified metrics become live on your public business profile."
      action={
        data?.business?.slug ? (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/businesses/$slug" params={{ slug: data.business.slug }} target="_blank">
              <span>View public business profile</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        ) : undefined
      }
    >
      {/* Top Impact KPI Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Jobs Created"
          value={totalJobs.toLocaleString()}
          detail="Reported across all active reviews"
          icon={Briefcase}
        />
        <MetricCard
          label="People Trained"
          value={totalTrained.toLocaleString()}
          detail="Empowered & upskilled"
          icon={GraduationCap}
        />
        <MetricCard
          label="Community Initiatives"
          value={totalInitiatives.toLocaleString()}
          detail="Kingdom impact projects"
          icon={HeartHandshake}
        />
        <MetricCard
          label={`${selectedYear} Review Status`}
          value={
            isApproved
              ? "Approved & Live"
              : isPendingReview
              ? "Pending Review"
              : isChangesRequested
              ? "Needs Update"
              : "Draft / Due"
          }
          detail={isApproved ? "Live in public directory" : "Under review by WCBN"}
          icon={isApproved ? CheckCircle2 : Clock}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Annual Review Form */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <span>Annual Impact Review</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select the reporting year and record verified outcomes for your enterprise.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year:</span>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(Number(v))}
                >
                  <SelectTrigger className="w-28 rounded-xl font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Review Status Banner */}
            <div className="mt-6">
              {isApproved && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Verified & Live on Public Directory</p>
                      <p className="text-xs text-muted-foreground">
                        Your {selectedYear} impact report has been approved by WCBN leadership. These statistics are published on your business directory listing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isPendingReview && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Awaiting Leadership Review</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted on {activeReview?.submitted_at ? new Date(activeReview.submitted_at).toLocaleDateString() : "recently"}. Our audit committee verifies submissions before they become live in the directory. You can edit details below and re-submit if needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isChangesRequested && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-950 dark:text-rose-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Revision Requested by Leadership</p>
                      <p className="text-xs">
                        {activeReview?.review_feedback || "Please review the numbers reported and provide clarification."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!activeReview && (
                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-foreground">No Report Submitted for {selectedYear}</p>
                      <p className="text-xs">
                        Enter your enterprise metrics below and submit for leadership review to keep your WCBN directory standing active.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Form Grid */}
            <div className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Jobs Created in {selectedYear}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 15"
                    className="rounded-xl h-11"
                    value={review.jobs_created}
                    onChange={(e) => setReview({ ...review, jobs_created: e.target.value })}
                  />
                  <span className="text-[11px] text-muted-foreground">Full-time and direct part-time jobs</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    People Trained / Mentored
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 120"
                    className="rounded-xl h-11"
                    value={review.people_trained}
                    onChange={(e) => setReview({ ...review, people_trained: e.target.value })}
                  />
                  <span className="text-[11px] text-muted-foreground">Interns, trainees, farmers or staff</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Businesses Supported / Partnered
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    className="rounded-xl h-11"
                    value={review.businesses_supported}
                    onChange={(e) => setReview({ ...review, businesses_supported: e.target.value })}
                  />
                  <span className="text-[11px] text-muted-foreground">Suppliers, local vendors & partners</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Community Initiatives
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 2"
                    className="rounded-xl h-11"
                    value={review.community_initiatives}
                    onChange={(e) => setReview({ ...review, community_initiatives: e.target.value })}
                  />
                  <span className="text-[11px] text-muted-foreground">Social outreach and Kingdom projects</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Achievements & Milestones
                </Label>
                <Textarea
                  rows={3}
                  className="rounded-xl resize-none"
                  placeholder="Describe your major operational milestones, revenue growth, or community milestones achieved this year..."
                  value={review.achievements}
                  onChange={(e) => setReview({ ...review, achievements: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Challenges & Adaptations
                </Label>
                <Textarea
                  rows={2}
                  className="rounded-xl resize-none"
                  placeholder="Key business challenges faced and how your leadership overcame them..."
                  value={review.challenges}
                  onChange={(e) => setReview({ ...review, challenges: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Strategic Objectives for Next Year
                </Label>
                <Textarea
                  rows={2}
                  className="rounded-xl resize-none"
                  placeholder="Primary growth goals, hiring plans, or market expansions for the coming year..."
                  value={review.next_objectives}
                  onChange={(e) => setReview({ ...review, next_objectives: e.target.value })}
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  className="rounded-xl h-11 px-6 shadow-sm"
                  disabled={submitReview.isPending}
                  onClick={() => submitReview.mutate()}
                >
                  {submitReview.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 size-4" />
                  )}
                  {activeReview ? `Update & Submit ${selectedYear} Report` : `Submit ${selectedYear} Impact Report`}
                </Button>
                {isApproved && (
                  <span className="text-xs text-muted-foreground">
                    Updating will submit a refreshed version for leadership review.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Historical Reviews Ledger */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="size-5 text-primary" />
              <span>Historical Impact Submissions</span>
            </h2>
            <div className="mt-4 divide-y divide-border/60">
              {!data?.reviews.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No annual impact reports submitted yet.
                </p>
              ) : (
                data.reviews.map((r) => (
                  <div key={r.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{r.review_year}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${
                            r.status === "approved"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : r.status === "submitted"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {r.status === "submitted" ? "Pending Review" : r.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.jobs_created} jobs · {r.people_trained} trained · {r.businesses_supported} businesses
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={() => setSelectedYear(r.review_year)}
                    >
                      View / Edit
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Year Strategic Commitment & SDGs */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="border-b border-border/60 pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target className="size-5 text-primary" />
                <span>Multi-Year Impact Commitment</span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your overarching pledge to the World Changers Business Network.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  What transformation will your enterprise create?
                </Label>
                <Textarea
                  rows={4}
                  className="rounded-xl resize-none"
                  placeholder="e.g. Transforming cassava farming into an export-grade value chain that employs 500 rural youth..."
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Target Commitment Year
                </Label>
                <Input
                  type="number"
                  className="rounded-xl h-10"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Specific Commitment Measures (one per line)
                </Label>
                <Textarea
                  rows={3}
                  className="rounded-xl resize-none"
                  value={measures}
                  onChange={(e) => setMeasures(e.target.value)}
                  placeholder={"500 jobs created\n2,000 farmers trained\n100% solar-powered processing"}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  United Nations SDGs Supported
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                  {SDGS.map((label, i) => {
                    const n = i + 1;
                    const on = sdgs.includes(n);
                    return (
                      <button
                        type="button"
                        key={n}
                        onClick={() =>
                          setSdgs(on ? sdgs.filter((s) => s !== n) : [...sdgs, n])
                        }
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          on
                            ? "gradient-brand text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {n}. {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl h-11"
                disabled={!statement || saveCommitment.isPending}
                onClick={() => saveCommitment.mutate()}
              >
                {saveCommitment.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Save Multi-Year Commitment
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Award className="size-4 text-primary" />
              <span>How Impact Verification Works</span>
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Each year, submit your enterprise numbers and operational highlights.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>WCBN Leadership reviews the submission to ensure authentic, auditable reporting.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Upon approval, verified badges and statistics appear publicly on your official directory profile.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </MemberPage>
  );
}
