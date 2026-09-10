import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SDGS, ensureWcbnMember, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal/impact")({ component: ImpactPage });

function ImpactPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const wcbnId = identity?.wcbnMember?.id;
  const year = new Date().getFullYear();

  const [statement, setStatement] = useState("");
  const [targetYear, setTargetYear] = useState(String(year + 3));
  const [sdgs, setSdgs] = useState<number[]>([]);
  const [measures, setMeasures] = useState("");
  const [review, setReview] = useState({ jobs_created: "", people_trained: "", businesses_supported: "", community_initiatives: "", achievements: "", challenges: "", next_objectives: "" });

  const { data } = useQuery({
    queryKey: ["portal", "impact", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const [commitment, reviews] = await Promise.all([
        supabase.from("wcbn_impact_commitments").select("*").eq("wcbn_member_id", wcbnId!).maybeSingle(),
        supabase.from("wcbn_annual_reviews").select("*").eq("wcbn_member_id", wcbnId!).order("review_year", { ascending: false }),
      ]);
      return { commitment: commitment.data, reviews: reviews.data ?? [] };
    },
  });

  useEffect(() => {
    if (!data?.commitment) return;
    setStatement(data.commitment.statement);
    setTargetYear(String(data.commitment.target_year));
    setSdgs(data.commitment.sdg_numbers ?? []);
    setMeasures(Array.isArray(data.commitment.measures) ? (data.commitment.measures as string[]).join("\n") : "");
  }, [data?.commitment]);

  const saveCommitment = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const payload = { wcbn_member_id: memberId, statement, target_year: Number(targetYear), sdg_numbers: sdgs, measures: measures.split("\n").filter(Boolean), status: "active" };
      if (data?.commitment) {
        const { error } = await supabase.from("wcbn_impact_commitments").update(payload).eq("id", data.commitment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_impact_commitments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Impact commitment saved"); queryClient.invalidateQueries({ queryKey: ["portal", "impact"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const { error } = await supabase.from("wcbn_annual_reviews").insert({
        wcbn_member_id: memberId, review_year: year,
        jobs_created: Number(review.jobs_created || 0), people_trained: Number(review.people_trained || 0),
        businesses_supported: Number(review.businesses_supported || 0), community_initiatives: Number(review.community_initiatives || 0),
        achievements: review.achievements || null, challenges: review.challenges || null, next_objectives: review.next_objectives || null,
        sdg_evidence: sdgs, status: "submitted", submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${year} impact review submitted`); queryClient.invalidateQueries({ queryKey: ["portal", "impact"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberPage title="Impact" description="Your impact commitment and the annual review that feeds the WCBN Impact Index.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Impact commitment</h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-2"><Label>What change will your enterprise create?</Label><Textarea rows={5} value={statement} onChange={(e) => setStatement(e.target.value)} /></div>
            <div className="space-y-2"><Label>Target year</Label><Input type="number" value={targetYear} onChange={(e) => setTargetYear(e.target.value)} /></div>
            <div className="space-y-2"><Label>Measures (one per line)</Label><Textarea rows={4} value={measures} onChange={(e) => setMeasures(e.target.value)} placeholder={"200 jobs created\n1,000 farmers trained"} /></div>
            <div>
              <Label className="mb-3 block">SDGs</Label>
              <div className="flex flex-wrap gap-2">
                {SDGS.map((label, i) => { const n = i + 1; const on = sdgs.includes(n);
                  return <button type="button" key={n} onClick={() => setSdgs(on ? sdgs.filter((s) => s !== n) : [...sdgs, n])} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? "gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{n}. {label}</button>;
                })}
              </div>
            </div>
            <Button disabled={!statement || saveCommitment.isPending} onClick={() => saveCommitment.mutate()}>{saveCommitment.isPending ? <Loader2 className="animate-spin" /> : <Save />}Save commitment</Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">{year} annual impact review</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {([["jobs_created", "Jobs created"], ["people_trained", "People trained"], ["businesses_supported", "Businesses supported"], ["community_initiatives", "Community initiatives"]] as const).map(([k, label]) => (
                <div className="space-y-2" key={k}><Label>{label}</Label><Input type="number" value={review[k]} onChange={(e) => setReview({ ...review, [k]: e.target.value })} /></div>
              ))}
              <div className="space-y-2 sm:col-span-2"><Label>Key achievements</Label><Textarea rows={3} value={review.achievements} onChange={(e) => setReview({ ...review, achievements: e.target.value })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Challenges</Label><Textarea rows={3} value={review.challenges} onChange={(e) => setReview({ ...review, challenges: e.target.value })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Next year objectives</Label><Textarea rows={3} value={review.next_objectives} onChange={(e) => setReview({ ...review, next_objectives: e.target.value })} /></div>
            </div>
            <Button className="mt-5" disabled={submitReview.isPending} onClick={() => submitReview.mutate()}>{submitReview.isPending ? <Loader2 className="animate-spin" /> : <Send />}Submit review</Button>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Submitted reviews</h2>
            {!data?.reviews.length && <p className="mt-3 text-sm text-muted-foreground">No reviews submitted yet.</p>}
            <ul className="mt-4 space-y-2 text-sm">
              {data?.reviews.map((r) => (
                <li key={r.id} className="flex justify-between rounded-xl border border-border px-4 py-3">
                  <span className="font-medium">{r.review_year}</span>
                  <span className="text-muted-foreground">{r.jobs_created} jobs · {r.people_trained} trained · {r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </MemberPage>
  );
}
