import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/members")({ component: MembersPage });

const STATUSES = ["prospect", "applicant", "active", "suspended", "inactive"];

function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async () => (await supabase
      .from("wcbn_members")
      .select("*, profiles(first_name, last_name, email, phone), members(member_id, status, region_id)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, string> }) => {
      const { error } = await supabase.from("wcbn_members").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Member updated"); queryClient.invalidateQueries({ queryKey: ["admin", "members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (members ?? []).filter((m) => {
    const p = m.profiles as { first_name: string | null; last_name: string | null; email: string | null } | null;
    const text = `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.email ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <AdminPage title="Members" description="The WCBN roster drawn from World Changers Association records. Promote, suspend or reclassify members here."
      action={<Input placeholder="Search members" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />}>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-4">Member</th><th className="p-4">WCA ID</th><th className="p-4">Category</th><th className="p-4">Status</th><th className="p-4">Inducted</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={5}>Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={5}>No WCBN members yet.</td></tr>}
            {rows.map((m) => {
              const p = m.profiles as { first_name: string | null; last_name: string | null; email: string | null } | null;
              const wca = m.members as { member_id: string; status: string | null } | null;
              return (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-4"><span className="font-medium">{[p?.first_name, p?.last_name].filter(Boolean).join(" ") || "—"}</span><span className="block text-xs text-muted-foreground">{p?.email}</span></td>
                  <td className="p-4 text-muted-foreground">{wca?.member_id ?? "—"}</td>
                  <td className="p-4">
                    <select value={m.category} onChange={(e) => update.mutate({ id: m.id, patch: { category: e.target.value } })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    <select value={m.status} onChange={(e) => update.mutate({ id: m.id, patch: { status: e.target.value } })} className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-muted-foreground">{m.inducted_at ? new Date(m.inducted_at).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
