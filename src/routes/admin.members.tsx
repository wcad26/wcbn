import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, Clock, Loader2, RotateCcw, Search, Sparkles,
  Trash2, UserCheck, Users, Mail, Phone, MapPin
} from "lucide-react";
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
import { unregisterWcbnMembers } from "@/lib/payments.functions";

export const Route = createFileRoute("/admin/members")({ component: MembersPage });

const STATUSES = ["active", "prospect", "applicant", "suspended", "inactive"];

function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | "business" | "professional">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [targetMember, setTargetMember] = useState<{ id: string; name: string } | null>(null);
  const [resetAllOpen, setResetAllOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wcbn_members")
        .select(`
          *,
          profiles (first_name, last_name, email, phone),
          members (
            id, member_id, status, region_id,
            dcg_members (is_active, dcgs(name, is_active))
          ),
          wcbn_membership_categories (id, name, code, applicant_type)
        `)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["wcbn", "categories"],
    queryFn: async () => {
      const { data } = await supabase.from("wcbn_membership_categories").select("id, name, code, applicant_type, is_active");
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"wcbn_members"> }) => {
      const { error } = await supabase.from("wcbn_members").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member record updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
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

  const filteredMembers = useMemo(() => {
    return (members ?? []).filter((m) => {
      const isInvestor = m.member_type === "professional" || m.member_type === "investor_mentor";
      const matchesTrack =
        trackFilter === "all" ||
        (trackFilter === "business" && !isInvestor) ||
        (trackFilter === "professional" && isInvestor);

      const matchesStatus = statusFilter === "all" || m.status === statusFilter;

      const p = m.profiles as { first_name: string | null; last_name: string | null; email: string | null } | null;
      const wca = m.members as { member_id: string } | null;
      const text = `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.email ?? ""} ${wca?.member_id ?? ""}`.toLowerCase();
      const matchesSearch = !search.trim() || text.includes(search.toLowerCase());

      return matchesTrack && matchesStatus && matchesSearch;
    });
  }, [members, trackFilter, statusFilter, search]);

  return (
    <AdminPage
      title="Member Directory"
      description="The official WCBN roster of inducted and active members across Entrepreneur and Investor/Mentor tracks, linked to dynamic categories."
      action={
        <div className="flex flex-wrap items-center gap-2">
          {members.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetAllOpen(true)}
              className="text-destructive hover:bg-destructive/10 border-destructive/20 text-xs"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Reset All Registrations
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {([
              ["all", "All Members"],
              ["business", "🚀 Entrepreneurs"],
              ["professional", "💎 Investors & Mentors"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTrackFilter(value)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  trackFilter === value ? "gradient-brand text-white shadow-xs" : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium capitalize"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, WCA ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-60 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Member Directory Table */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-4">Member Identity</th>
                  <th className="p-4">Leadership Track</th>
                  <th className="p-4">Membership Category</th>
                  <th className="p-4">Destiny Care Group (DCG)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Induction Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                      Loading WCBN member directory…
                    </td>
                  </tr>
                )}
                {!isLoading && filteredMembers.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-muted-foreground" colSpan={7}>
                      No members match the current filter.
                    </td>
                  </tr>
                )}
                {filteredMembers.map((m) => {
                  const p = m.profiles as { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
                  const wca = m.members as {
                    member_id: string;
                    status: string | null;
                    dcg_members?: { is_active: boolean; dcgs?: { name: string; is_active: boolean } | null }[] | null;
                  } | null;
                  const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "WCBN Member";
                  const isInvestor = m.member_type === "professional" || m.member_type === "investor_mentor";

                  // Extract DCG
                  const dcgRow = wca?.dcg_members?.[0];
                  const dcgName = dcgRow?.dcgs?.name;
                  const dcgActive = !!dcgRow?.is_active && !!dcgRow?.dcgs?.is_active;

                  return (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-foreground block">{fullName}</span>
                        <span className="block text-xs text-muted-foreground">{p?.email}</span>
                        <span className="inline-block mt-1 font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          WCA: {wca?.member_id ?? "—"}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isInvestor ? "bg-purple-500/10 text-purple-700 dark:text-purple-300" : "bg-primary/10 text-primary"
                        }`}>
                          {isInvestor ? "💎 Investor & Mentor" : "🚀 Entrepreneur"}
                        </span>
                      </td>

                      <td className="p-4">
                        <select
                          value={m.category_id ?? ""}
                          onChange={(e) => {
                            const newCatId = e.target.value;
                            const catObj = categories.find((c) => c.id === newCatId);
                            update.mutate({
                              id: m.id,
                              patch: {
                                category_id: newCatId || null,
                                category: catObj?.name ?? m.category,
                              },
                            });
                          }}
                          className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                        >
                          <option value="">{m.category || "Select category…"}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          {dcgActive ? (
                            <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                          ) : (
                            <Clock className="size-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className="font-medium text-foreground">
                            {dcgName ?? (dcgActive ? "Active" : "Assignment in review")}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <select
                          value={m.status}
                          onChange={(e) => update.mutate({ id: m.id, patch: { status: e.target.value } })}
                          className={`h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold capitalize ${
                            m.status === "active" ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="capitalize">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4 text-xs text-muted-foreground">
                        {m.inducted_at ? new Date(m.inducted_at).toLocaleDateString() : "—"}
                      </td>

                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTargetMember({ id: m.id, name: fullName })}
                          className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          title="Unregister member for testing"
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
        </div>
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
            This will remove their WCBN membership record, application dossier, and generated invoices. Their base World Changers Association account and credentials remain safe. They will be able to restart the onboarding process anew.
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
              Are you sure you want to unregister <strong>all {members.length} WCBN members</strong>?
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
