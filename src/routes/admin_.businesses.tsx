import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/admin_/businesses")({ component: BusinessVetting });

function BusinessVetting() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["admin", "businesses"],
    queryFn: async () => (await supabase.from("wcbn_businesses").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"wcbn_businesses"> }) => {
      const { error } = await supabase.from("wcbn_businesses").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Business updated"); queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Businesses" description="Vet submitted enterprises, flag risk, and activate listings so they appear in the public catalog.">
      {isLoading && <p className="text-sm text-muted-foreground">Loading businesses…</p>}
      {!isLoading && businesses?.length === 0 && <p className="text-sm text-muted-foreground">No businesses have been submitted yet.</p>}
      <div className="grid gap-4 xl:grid-cols-2">
        {businesses?.map((b) => (
          <article key={b.id} className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{b.display_name}</h2>
                <p className="text-sm text-muted-foreground">{b.sector} · {[b.city, b.country].filter(Boolean).join(", ")}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5 text-[11px]">
                <span className="rounded-full bg-muted px-2.5 py-1 capitalize">{b.vetting_status}</span>
                <span className={`rounded-full px-2.5 py-1 ${b.is_active ? "bg-primary/10 text-primary" : "bg-muted"}`}>{b.is_active ? "live" : "hidden"}</span>
                <span className={`rounded-full px-2.5 py-1 capitalize ${b.risk_level === "red" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>risk: {b.risk_level}</span>
              </div>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{b.summary || b.description || "No description provided."}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => update.mutate({ id: b.id, patch: { vetting_status: "approved", is_active: true, approved_at: new Date().toISOString(), approved_by: identity?.userId ?? null } })}><CheckCircle2 />Approve & publish</Button>
              <Button size="sm" variant="outline" onClick={() => update.mutate({ id: b.id, patch: { is_active: !b.is_active } })}><Eye />{b.is_active ? "Unpublish" : "Publish"}</Button>
              <Button size="sm" variant="outline" onClick={() => update.mutate({ id: b.id, patch: { is_featured: !b.is_featured } })}><Star />{b.is_featured ? "Unfeature" : "Feature"}</Button>
              <select value={b.risk_level} onChange={(e) => update.mutate({ id: b.id, patch: { risk_level: e.target.value } })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="green">Risk: green</option><option value="amber">Risk: amber</option><option value="red">Risk: red</option>
              </select>
              <Button size="sm" variant="destructive" onClick={() => update.mutate({ id: b.id, patch: { vetting_status: "rejected", is_active: false } })}><XCircle />Reject</Button>
            </div>
          </article>
        ))}
      </div>
    </AdminPage>
  );
}
