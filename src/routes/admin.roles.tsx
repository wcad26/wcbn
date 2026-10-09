import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/roles")({ component: RolesPage });

function RolesPage() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");

  const { data } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const [roles, assignments] = await Promise.all([
        supabase.from("wcbn_roles").select("*").order("name"),
        supabase.from("wcbn_user_roles").select("*, wcbn_roles(name), profiles:user_id(first_name, last_name, email)").order("assigned_at", { ascending: false }),
      ]);
      return { roles: roles.data ?? [], assignments: assignments.data ?? [] };
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("id").ilike("email", email.trim()).maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error("No World Changers Association account was found with that email.");
      const { error } = await supabase.from("wcbn_user_roles").insert({ user_id: profile.id, role_id: roleId, assigned_by: identity?.userId ?? null, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Leadership access granted"); setEmail(""); queryClient.invalidateQueries({ queryKey: ["admin", "roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("wcbn_user_roles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "roles"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Roles & access" description="Who can act inside the WCBN leadership portal, and what each role may do.">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-4">Person</th><th className="p-4">Role</th><th className="p-4">Active</th></tr>
              </thead>
              <tbody>
                {data?.assignments.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={3}>No leadership roles assigned yet. WCA super administrators always have access.</td></tr>}
                {data?.assignments.map((a) => {
                  const p = a.profiles as { first_name: string | null; last_name: string | null; email: string | null } | null;
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-4"><span className="font-medium">{[p?.first_name, p?.last_name].filter(Boolean).join(" ") || "—"}</span><span className="block text-xs text-muted-foreground">{p?.email}</span></td>
                      <td className="p-4">{(a.wcbn_roles as { name: string } | null)?.name}</td>
                      <td className="p-4"><Switch checked={a.is_active} onCheckedChange={(v) => toggle.mutate({ id: a.id, is_active: v })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {data?.roles.map((r) => (
              <div key={r.id} className="rounded-3xl border border-border bg-card p-5 shadow-card">
                <h3 className="font-semibold">{r.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(Array.isArray(r.permissions) ? (r.permissions as string[]) : []).map((p) => (
                    <span key={p} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px]">{p === "*" ? "full access" : p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Grant leadership access</h2>
          <p className="mt-1 text-sm text-muted-foreground">The person must already have a World Changers Association account.</p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2"><Label>Email address</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="leader@example.com" /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select role</option>
                {data?.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <Button className="w-full" disabled={!email || !roleId || assign.isPending} onClick={() => assign.mutate()}>{assign.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}Grant access</Button>
          </div>
        </aside>
      </div>
    </AdminPage>
  );
}
