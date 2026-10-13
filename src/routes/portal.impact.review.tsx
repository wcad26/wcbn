import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ensureWcbnMember, useIdentity } from "@/lib/wcbn";
import { useImpactData } from "@/lib/wcbn-impact";

export const Route = createFileRoute("/portal/impact/review")({
  validateSearch: (search: Record<string, unknown>): { year?: number } => {
    const y = Number(search["year"]);
    return Number.isFinite(y) && y > 2000 ? { year: y } : {};
  },
  component: AnnualReviewPage,
});

const EMPTY = {
  jobs_created: "",
  people_trained: "",
  businesses_supported: "",
  community_initiatives: "",
  achievements: "",
  challenges: "",
  next_objectives: "",
};

function AnnualReviewPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const wcbnId = identity?.wcbnMember?.id;
  const currentYear = new Date().getFullYear();
  const search = Route.useSearch();

  const [year, setYear] = useState<number>(search.year ?? currentYear);
  const [review, setReview] = useState(EMPTY);

  const { data } = useImpactData(wcbnId);
  const active = data?.reviews.find((r) => r.review_year === year) ?? null;
  const sdgEvidence = Array.isArray(data?.commitment?.sdg_numbers) ? data!.commitment!.sdg_numbers : [];

  useEffect(() => {
    if (active) {
      setReview({
        jobs_created: String(active.jobs_created ?? ""),
        people_trained: String(active.people_trained ?? ""),
        businesses_supported: String(active.businesses_supported ?? ""),
        community_initiatives: String(active.community_initiatives ?? ""),
        achievements: active.achievements ?? "",
        challenges: active.challenges ?? "",
        next_objectives: active.next_objectives ?? "",
      });
    } else {
      setReview(EMPTY);
    }
  }, [active, year]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const payload = {
        wcbn_member_id: memberId,
        review_year: year,
        jobs_created: Number(review.jobs_created || 0),
        people_trained: Number(review.people_trained || 0),
        businesses_supported: Number(review.businesses_supported || 0),
        community_initiatives: Number(review.community_initiatives || 0),
        achievements: review.achievements || null,
        challenges: review.challenges || null,
        next_objectives: review.next_objectives || null,
        sdg_evidence: sdgEvidence,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      };
      if (active) {
        const { error } = await supabase.from("wcbn_annual_reviews").update(payload).eq("id", active.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_annual_reviews").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`${year} impact report submitted for leadership review.`);
      queryClient.invalidateQueries({ queryKey: ["portal", "impact"] });
      navigate({ to: "/portal/impact" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof EMPTY, v: string) => setReview((r) => ({ ...r, [k]: v }));
  const labelCls = "text-xs font-semibold text-muted-foreground";

  return (
    <MemberPage
      title="Annual impact review"
      description="Record verified outcomes for the year. Leadership reviews every submission before it goes live."
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1.5 rounded-xl">
          <Link to="/portal/impact">
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Reporting year</span>
          </div>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
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

        {active?.status === "approved" && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p className="text-muted-foreground">
              This report is approved and live. Saving changes will send a refreshed version for review.
            </p>
          </div>
        )}
        {active?.status === "submitted" && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs">
            <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-muted-foreground">Awaiting leadership review. You can still edit and resubmit.</p>
          </div>
        )}
        {active?.status === "changes_requested" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
            <p className="text-foreground">
              {active.review_feedback || "Please review your numbers and provide clarification."}
            </p>
          </div>
        )}

        <section className="space-y-5 rounded-3xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={labelCls}>Jobs created</Label>
              <Input type="number" min="0" inputMode="numeric" placeholder="e.g. 15" className="h-11 rounded-xl" value={review.jobs_created} onChange={(e) => set("jobs_created", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>People trained / mentored</Label>
              <Input type="number" min="0" inputMode="numeric" placeholder="e.g. 120" className="h-11 rounded-xl" value={review.people_trained} onChange={(e) => set("people_trained", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Businesses supported</Label>
              <Input type="number" min="0" inputMode="numeric" placeholder="e.g. 5" className="h-11 rounded-xl" value={review.businesses_supported} onChange={(e) => set("businesses_supported", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Community initiatives</Label>
              <Input type="number" min="0" inputMode="numeric" placeholder="e.g. 2" className="h-11 rounded-xl" value={review.community_initiatives} onChange={(e) => set("community_initiatives", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={labelCls}>Key achievements</Label>
            <Textarea rows={4} className="resize-none rounded-xl" placeholder="Major milestones achieved this year…" value={review.achievements} onChange={(e) => set("achievements", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Challenges</Label>
            <Textarea rows={3} className="resize-none rounded-xl" placeholder="Challenges faced and how you responded…" value={review.challenges} onChange={(e) => set("challenges", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Objectives for next year</Label>
            <Textarea rows={3} className="resize-none rounded-xl" placeholder="Growth, hiring or expansion goals…" value={review.next_objectives} onChange={(e) => set("next_objectives", e.target.value)} />
          </div>

          <Button className="h-11 w-full rounded-xl" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span>{active ? `Update ${year} report` : `Submit ${year} report`}</span>
          </Button>
        </section>
      </div>
    </MemberPage>
  );
}
