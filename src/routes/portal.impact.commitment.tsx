import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SDGS, ensureWcbnMember, useIdentity } from "@/lib/wcbn";
import { useImpactData } from "@/lib/wcbn-impact";

export const Route = createFileRoute("/portal/impact/commitment")({ component: CommitmentPage });

function CommitmentPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const wcbnId = identity?.wcbnMember?.id;
  const currentYear = new Date().getFullYear();

  const [statement, setStatement] = useState("");
  const [targetYear, setTargetYear] = useState(String(currentYear + 3));
  const [measures, setMeasures] = useState("");
  const [sdgs, setSdgs] = useState<number[]>([]);

  const { data } = useImpactData(wcbnId);
  const commitment = data?.commitment ?? null;

  useEffect(() => {
    if (!commitment) return;
    setStatement(commitment.statement);
    setTargetYear(String(commitment.target_year));
    setSdgs(commitment.sdg_numbers ?? []);
    setMeasures(Array.isArray(commitment.measures) ? (commitment.measures as string[]).join("\n") : "");
  }, [commitment]);

  const save = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const payload = {
        wcbn_member_id: memberId,
        statement,
        target_year: Number(targetYear),
        sdg_numbers: sdgs,
        measures: measures.split("\n").map((m) => m.trim()).filter(Boolean),
        status: "active",
      };
      if (commitment) {
        const { error } = await supabase.from("wcbn_impact_commitments").update(payload).eq("id", commitment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_impact_commitments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Impact commitment saved.");
      queryClient.invalidateQueries({ queryKey: ["portal", "impact"] });
      navigate({ to: "/portal/impact" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const labelCls = "text-xs font-semibold text-muted-foreground";

  return (
    <MemberPage
      title="Multi-year commitment"
      description="Your long-term pledge to the World Changers Business Network."
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1.5 rounded-xl">
          <Link to="/portal/impact">
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-3xl">
        <section className="space-y-5 rounded-3xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
          <div className="space-y-1.5">
            <Label className={labelCls}>What transformation will your enterprise create?</Label>
            <Textarea
              rows={5}
              className="resize-none rounded-xl"
              placeholder="e.g. Turning cassava farming into an export-grade value chain that employs 500 rural youth…"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelCls}>Target year</Label>
            <Input type="number" inputMode="numeric" className="h-11 rounded-xl" value={targetYear} onChange={(e) => setTargetYear(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className={labelCls}>Measurable targets (one per line)</Label>
            <Textarea
              rows={4}
              className="resize-none rounded-xl"
              placeholder={"500 jobs created\n2,000 farmers trained\n100% solar-powered processing"}
              value={measures}
              onChange={(e) => setMeasures(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className={labelCls}>UN Sustainable Development Goals</Label>
            <div className="flex flex-wrap gap-1.5">
              {SDGS.map((label, i) => {
                const n = i + 1;
                const on = sdgs.includes(n);
                return (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setSdgs(on ? sdgs.filter((s) => s !== n) : [...sdgs, n])}
                    className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
                      on ? "gradient-brand text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {n}. {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button className="h-11 w-full rounded-xl" disabled={!statement.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>Save commitment</span>
          </Button>
        </section>
      </div>
    </MemberPage>
  );
}
