import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/admin_/criteria")({ component: CriteriaPage });

type Track = "business" | "professional";

function CriteriaPage() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [track, setTrack] = useState<Track>("business");

  const { data } = useQuery({
    queryKey: ["admin", "criteria"],
    queryFn: async () => {
      const { data: versions } = await supabase.from("wcbn_criteria_versions").select("*").order("version_number", { ascending: false });
      const active = versions?.find((v) => v.is_active) ?? versions?.[0];
      const { data: criteria } = active
        ? await supabase.from("wcbn_criteria").select("*").eq("version_id", active.id).order("display_order")
        : { data: [] };
      return { versions: versions ?? [], active, criteria: criteria ?? [] };
    },
  });

  const updateCriterion = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"wcbn_criteria"> }) => {
      const { error } = await supabase.from("wcbn_criteria").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "criteria"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateVersion = useMutation({
    mutationFn: async (patch: TablesUpdate<"wcbn_criteria_versions">) => {
      if (!data?.active) return;
      const { error } = await supabase.from("wcbn_criteria_versions").update(patch).eq("id", data.active.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Thresholds updated"); queryClient.invalidateQueries({ queryKey: ["admin", "criteria"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const newVersion = useMutation({
    mutationFn: async () => {
      if (!data?.active) throw new Error("No criteria version to copy.");
      const next = Math.max(...data.versions.map((v) => v.version_number)) + 1;
      await supabase.from("wcbn_criteria_versions").update({ is_active: false }).eq("id", data.active.id);
      const { data: created, error } = await supabase.from("wcbn_criteria_versions").insert({
        name: `Criteria set v${next}`, version_number: next, is_active: true,
        minimum_score: data.active.minimum_score, strong_score: data.active.strong_score,
        professional_minimum_score: data.active.professional_minimum_score, professional_strong_score: data.active.professional_strong_score,
        created_by: identity?.userId ?? null,
      }).select("id").single();
      if (error) throw error;
      const copies = data.criteria.map((c) => ({
        version_id: created.id, code: c.code, label: c.label, description: c.description, section: c.section,
        weight: c.weight, is_required: c.is_required, is_disqualifying: c.is_disqualifying, display_order: c.display_order, is_active: c.is_active, config: c.config, applies_to: c.applies_to,
      }));
      if (copies.length) {
        const { error: copyError } = await supabase.from("wcbn_criteria").insert(copies);
        if (copyError) throw copyError;
      }
    },
    onSuccess: () => { toast.success("New criteria version created. Applications already submitted keep their original version."); queryClient.invalidateQueries({ queryKey: ["admin", "criteria"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown = (data?.criteria ?? []).filter((c) => c.applies_to === "both" || c.applies_to === track);
  const total = shown.reduce((s, c) => s + (c.is_active ? c.weight : 0), 0);

  return (
    <AdminPage title="Criteria & workflow" description="Enable, weight and configure every membership criterion. Versions are preserved so decisions in flight keep the rules they were submitted under."
      action={<Button variant="outline" onClick={() => newVersion.mutate()}><Plus />New version</Button>}>
      <div className="mb-6 flex flex-wrap gap-2">
        {([["business", "Business criteria"], ["professional", "Professional criteria"]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTrack(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${track === value ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-4">Criterion</th><th className="p-4">Applies to</th><th className="p-4">Weight</th><th className="p-4">Mandatory</th><th className="p-4">Disqualifying</th><th className="p-4">Active</th></tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="p-4"><span className="font-medium">{c.label}</span><span className="block max-w-md text-xs text-muted-foreground">{c.description}</span></td>
                  <td className="p-4">
                    <select value={c.applies_to} onChange={(e) => updateCriterion.mutate({ id: c.id, patch: { applies_to: e.target.value } })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                      <option value="both">Both tracks</option><option value="business">Businesses</option><option value="professional">Professionals</option>
                    </select>
                  </td>
                  <td className="p-4"><Input type="number" defaultValue={c.weight} className="w-20" onBlur={(e) => updateCriterion.mutate({ id: c.id, patch: { weight: Number(e.target.value) } })} /></td>
                  <td className="p-4"><Switch checked={c.is_required} onCheckedChange={(v) => updateCriterion.mutate({ id: c.id, patch: { is_required: v } })} /></td>
                  <td className="p-4"><Switch checked={c.is_disqualifying} onCheckedChange={(v) => updateCriterion.mutate({ id: c.id, patch: { is_disqualifying: v } })} /></td>
                  <td className="p-4"><Switch checked={c.is_active} onCheckedChange={(v) => updateCriterion.mutate({ id: c.id, patch: { is_active: v } })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Active version</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data?.active?.name} · v{data?.active?.version_number}</p>
            <p className="mt-4 text-sm">Total weight: <span className="font-semibold">{total}</span> points</p>
            {track === "business" ? (
              <div className="mt-5 space-y-3">
                <label className="block text-sm">Minimum passing score (businesses)
                  <Input type="number" defaultValue={data?.active?.minimum_score} className="mt-1" onBlur={(e) => updateVersion.mutate({ minimum_score: Number(e.target.value) })} /></label>
                <label className="block text-sm">Strong candidate score (businesses)
                  <Input type="number" defaultValue={data?.active?.strong_score} className="mt-1" onBlur={(e) => updateVersion.mutate({ strong_score: Number(e.target.value) })} /></label>
              </div>
            ) : (
              <div className="mt-5 space-y-3" key="pro">
                <label className="block text-sm">Minimum passing score (professionals)
                  <Input type="number" defaultValue={data?.active?.professional_minimum_score} className="mt-1" onBlur={(e) => updateVersion.mutate({ professional_minimum_score: Number(e.target.value) })} /></label>
                <label className="block text-sm">Strong candidate score (professionals)
                  <Input type="number" defaultValue={data?.active?.professional_strong_score} className="mt-1" onBlur={(e) => updateVersion.mutate({ professional_strong_score: Number(e.target.value) })} /></label>
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card text-sm text-muted-foreground">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Versions</h2>
            <ul className="mt-3 space-y-1">
              {data?.versions.map((v) => <li key={v.id}>v{v.version_number} — {v.name}{v.is_active ? " (active)" : ""}</li>)}
            </ul>
          </div>
        </aside>
      </div>
    </AdminPage>
  );
}
