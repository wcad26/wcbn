import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { CATEGORIES } from "@/lib/wcbn";
import { unregisterWcbnMembers } from "@/lib/payments.functions";

export const Route = createFileRoute("/admin/members")({ component: MembersPage });

const STATUSES = ["prospect", "applicant", "active", "suspended", "inactive"];

function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [targetMember, setTargetMember] = useState<{ id: string; name: string } | null>(null);
  const [resetAllOpen, setResetAllOpen] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async () => (await supabase
      .from("wcbn_members")
      .select("*, profiles(first_name, last_name, email, phone), members(member_id, status, region_id)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"wcbn_members"> }) => {
      const { error } = await supabase.from("wcbn_members").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unregisterOne = useMutation({
    mutationFn: async (memberId: string) => {
      await unregisterWcbnMembers({ data: { memberId } });
    },
    onSuccess: () => {
      toast.success("Member unregistered successfully. They can now restart the onboarding flow.");
      setTargetMember(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(`Failed to unregister member: ${e.message}`),
  });

  const unregisterAll = useMutation({
    mutationFn: async () => {
      await unregisterWcbnMembers({ data: { all: true } });
    },
    onSuccess: () => {
      toast.success("All WCBN registrations have been reset successfully.");
      setResetAllOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(`Failed to reset members: ${e.message}`),
  });

  const rows = (members ?? []).filter((m) => {
    const p = m.profiles as { first_name: string | null; last_name: string | null; email: string | null } | null;
    const text = `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.email ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <AdminPage
      title="Members"
      description="The WCBN roster drawn from World Changers Association records. Promote, suspend, unregister or reset registrations here."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search members" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          {rows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetAllOpen(true)}
              className="text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="size-3.5" />
              Reset All Registrations
            </Button>
          )}
        </div>
      }
    >
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-4">Member</th>
              <th className="p-4">WCA ID</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status</th>
              <th className="p-4">Inducted</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={6}>Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={6}>No WCBN members registered yet.</td></tr>}
            {rows.map((m) => {
              const p = m.profiles as { first_name: string | null; last_name: string | null; email: string | null } | null;
              const wca = m.members as { member_id: string; status: string | null } | null;
              const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Member";
              return (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-4">
                    <span className="font-medium">{fullName}</span>
                    <span className="block text-xs text-muted-foreground">{p?.email}</span>
                  </td>
                  <td className="p-4 text-muted-foreground">{wca?.member_id ?? "—"}</td>
                  <td className="p-4">
                    <select
                      value={m.category}
                      onChange={(e) => update.mutate({ id: m.id, patch: { category: e.target.value } })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      value={m.status}
                      onChange={(e) => update.mutate({ id: m.id, patch: { status: e.target.value } })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-muted-foreground">{m.inducted_at ? new Date(m.inducted_at).toLocaleDateString() : "—"}</td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTargetMember({ id: m.id, name: fullName })}
                      className="text-destructive hover:bg-destructive/10"
                      title="Unregister member so they can restart registration"
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Unregister</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog: Unregister Single Member */}
      <Dialog open={!!targetMember} onOpenChange={(open) => !open && setTargetMember(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Unregister Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to unregister <strong>{targetMember?.name}</strong> from WCBN?
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-5">
            This will remove their WCBN membership record, application draft, and generated invoices. Their base World Changers Association account and login credentials will remain completely safe. They will be able to restart the onboarding process from scratch.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTargetMember(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={unregisterOne.isPending}
              onClick={() => targetMember && unregisterOne.mutate(targetMember.id)}
            >
              {unregisterOne.isPending ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4" />}
              Unregister Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Reset All Registrations */}
      <Dialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reset All WCBN Registrations</DialogTitle>
            <DialogDescription>
              Are you sure you want to unregister <strong>all {rows.length} WCBN members</strong>?
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-5">
            This will clear all registered WCBN member records, applications, and onboarding fee schedules so the system can be tested completely fresh. Core WCA member profiles, roles, and church data are not affected.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetAllOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={unregisterAll.isPending}
              onClick={() => unregisterAll.mutate()}
            >
              {unregisterAll.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw className="size-4" />}
              Reset All Registrations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
