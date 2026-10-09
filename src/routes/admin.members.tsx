import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Power,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PeriodFilter, PeriodFilterState, isDateInPeriod } from "@/components/wcbn/period-filter";
import { unregisterWcbnMembers } from "@/lib/payments.functions";
import { getCategoryArchetype, type Category } from "@/lib/fees";

function MembersErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AdminPage
      title="Member Directory"
      description="The official WCBN roster of inducted and active members across Entrepreneur and Investor/Mentor categories."
    >
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center max-w-lg mx-auto my-8">
        <AlertCircle className="size-8 text-destructive mx-auto mb-3" />
        <h3 className="font-semibold text-foreground text-base">Unable to load Member Directory</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          {error?.message || "An unexpected error occurred while loading members."}
        </p>
        <Button size="sm" onClick={() => reset()} className="text-xs">
          Try Again
        </Button>
      </div>
    </AdminPage>
  );
}

export const Route = createFileRoute("/admin/members")({
  component: MembersPage,
  errorComponent: MembersErrorComponent,
});

interface MemberItem {
  id: string;
  category: string | null;
  category_id: string | null;
  status: string;
  member_type: string | null;
  created_at: string;
  inducted_at: string | null;
  profile_id: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  members: {
    member_id: string;
    status: string | null;
    join_date: string | null;
  } | null;
  wcbn_membership_categories: {
    id: string;
    name: string;
    code: string;
    applicant_type: string;
  } | null;
  wcbn_applications?: {
    id: string;
    applicant_type: string;
    applicant_data: Record<string, any>;
    status: string;
  }[];
}

function MembersPage() {
  const queryClient = useQueryClient();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | "business" | "professional">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodFilterState>({ preset: "all" });

  // Dialog States
  const [viewingMember, setViewingMember] = useState<MemberItem | null>(null);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editMemberType, setEditMemberType] = useState<"business" | "professional">("business");
  const [deletingMember, setDeletingMember] = useState<MemberItem | null>(null);
  const [resetAllOpen, setResetAllOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin", "members-streamlined"],
    queryFn: async () => {
      const [membersRes, appsRes] = await Promise.all([
        supabase
          .from("wcbn_members")
          .select(`
            *,
            profiles (first_name, last_name, email, phone, city, country),
            members (member_id, status, join_date),
            wcbn_membership_categories (id, name, code, applicant_type)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("wcbn_applications")
          .select("id, wcbn_member_id, applicant_type, applicant_data, status")
          .order("created_at", { ascending: false }),
      ]);

      if (membersRes.error) {
        console.error("Error fetching members:", membersRes.error);
        return [];
      }

      const apps = appsRes.data ?? [];
      const appsByMember = new Map<string, (typeof apps)[0]>();
      for (const app of apps) {
        if (app.wcbn_member_id && !appsByMember.has(app.wcbn_member_id)) {
          appsByMember.set(app.wcbn_member_id, app);
        }
      }

      return (membersRes.data ?? []).map((m) => {
        const app = appsByMember.get(m.id);
        return {
          ...m,
          wcbn_applications: app ? [app] : [],
        };
      }) as unknown as MemberItem[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["wcbn", "categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wcbn_membership_categories")
        .select("*")
        .order("display_order");
      return (data ?? []) as Category[];
    },
  });

  // Category map
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Update Member Mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      categoryId,
      memberType,
    }: {
      id: string;
      categoryId: string;
      memberType: string;
    }) => {
      const catObj = categoryMap.get(categoryId);
      const { error } = await supabase
        .from("wcbn_members")
        .update({
          category_id: categoryId || null,
          category: catObj?.name || "Member",
          member_type: memberType,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member updated successfully");
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "members-streamlined"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview-modern"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Activate / Deactivate Toggle Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (m: MemberItem) => {
      const newStatus = m.status === "active" ? "inactive" : "active";
      const payload: { status: string; inducted_at?: string } = { status: newStatus };
      if (newStatus === "active" && !m.inducted_at) {
        payload.inducted_at = new Date().toISOString();
      }
      const { error } = await supabase.from("wcbn_members").update(payload).eq("id", m.id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(`Member status set to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "members-streamlined"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview-modern"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete / Unregister One Member Mutation
  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await unregisterWcbnMembers({ data: { memberId } });
    },
    onSuccess: () => {
      toast.success("Member deleted and removed from WCBN roster.");
      setDeletingMember(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "members-streamlined"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview-modern"] });
    },
    onError: (e: Error) => toast.error(`Failed to delete member: ${e.message}`),
  });

  // Reset All Registrations (Test utility)
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      await unregisterWcbnMembers({ data: { all: true } });
    },
    onSuccess: () => {
      toast.success("All WCBN registrations have been reset successfully.");
      setResetAllOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "members-streamlined"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview-modern"] });
    },
    onError: (e: Error) => toast.error(`Failed to reset members: ${e.message}`),
  });

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Track filter
      const isInvestor =
        m.member_type === "professional" ||
        m.member_type === "investor" ||
        m.member_type === "mentor" ||
        m.member_type === "investor_mentor";
      if (trackFilter === "business" && isInvestor) return false;
      if (trackFilter === "professional" && !isInvestor) return false;

      // Status filter
      if (statusFilter !== "all" && m.status !== statusFilter) return false;

      // Period filter
      if (!isDateInPeriod(m.created_at, period)) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const p = m.profiles;
        const nameMatch = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.toLowerCase().includes(q);
        const emailMatch = p?.email?.toLowerCase().includes(q);
        const phoneMatch = p?.phone?.toLowerCase().includes(q);
        const wcaMatch = m.members?.member_id?.toLowerCase().includes(q);
        const catMatch = (m.category || m.wcbn_membership_categories?.name || "").toLowerCase().includes(q);

        if (!nameMatch && !emailMatch && !phoneMatch && !wcaMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });
  }, [members, trackFilter, statusFilter, period, search]);

  // Overall counters
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.status === "active").length;
  const prospectCount = members.filter((m) => m.status === "prospect" || m.status === "applicant").length;
  const inactiveCount = members.filter((m) => m.status === "inactive" || m.status === "suspended").length;

  // Helper for Status Entry Badge
  const renderStatusEntry = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold">
            <CheckCircle2 className="size-3" /> Active
          </Badge>
        );
      case "prospect":
      case "applicant":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold">
            <Clock className="size-3" /> Prospect
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 font-semibold">
            <XCircle className="size-3" /> Suspended
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-border text-muted-foreground gap-1 font-medium">
            <Power className="size-3" /> Inactive
          </Badge>
        );
    }
  };

  return (
    <AdminPage
      title="Member Directory"
      description="The official WCBN roster of inducted and active members across Entrepreneur and Investor/Mentor categories."
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Roster</span>
              <Users className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">All registered members</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Active Members</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Inducted & in good standing</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Prospects / Applicants</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{prospectCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">In vetting or onboarding</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Inactive / Suspended</span>
              <Power className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Dormant accounts</p>
          </div>
        </div>

        {/* Master Members Table Section */}
        <div className="rounded-3xl border border-border bg-card shadow-card overflow-hidden">
          {/* Controls & Filter Bar */}
          <div className="p-5 border-b border-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, WCA ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Period Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Period:</span>
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>

            {/* Track, Status Selectors, and Test Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setTrackFilter("all")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      trackFilter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Members
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackFilter("business")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      trackFilter === "business" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🚀 Entrepreneurs
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackFilter("professional")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      trackFilter === "professional" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    💎 Investors & Mentors
                  </button>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="prospect">Prospect / Applicant</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-2">
                  Showing <strong>{filteredMembers.length}</strong> of {members.length}
                </span>

                {/* Test utility: Reset registrations */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetAllOpen(true)}
                  className="h-8 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                >
                  <RotateCcw className="size-3" /> Reset Test Registrations
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4 font-semibold">Member Identity</th>
                  <th className="p-4 font-semibold">Membership Category & Track</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold">Induction Date</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                      Loading member directory...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No members match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const p = m.profiles;
                    const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Member";
                    const isInvestor =
                      m.member_type === "professional" ||
                      m.member_type === "investor" ||
                      m.member_type === "mentor" ||
                      m.member_type === "investor_mentor" ||
                      m.wcbn_membership_categories?.applicant_type === "professional";
                    const appData = (m.wcbn_applications?.[0]?.applicant_data ?? {}) as Record<string, any>;
                    const enterpriseName = (appData["business_name"] as string | undefined) || (appData["organization"] as string | undefined) || null;
                    const enterpriseSector = (appData["sector"] as string | undefined) || (appData["preferred_sectors"] as string | undefined) || null;
                    const catName = m.category || m.wcbn_membership_categories?.name || "General Member";

                    return (
                      <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                        {/* Member Identity */}
                        <td className="p-4">
                          <div className="font-bold text-foreground text-xs leading-tight">{fullName}</div>
                          <div className="text-[11px] text-muted-foreground">{p?.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {m.members?.member_id && (
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                WCA: {m.members.member_id}
                              </span>
                            )}
                            {p?.phone && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Phone className="size-2.5" /> {p.phone}
                              </span>
                            )}
                          </div>
                          {enterpriseName && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-foreground font-semibold">
                              <Building2 className="size-3 text-primary shrink-0" />
                              <span>{enterpriseName}</span>
                              {enterpriseSector && (
                                <span className="text-muted-foreground text-[10px] font-normal">
                                  ({enterpriseSector})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Combined Category & Track Column */}
                        <td className="p-4">
                          <div className="text-xs font-semibold text-foreground">{catName}</div>
                          <span
                            className={`inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded ${
                              isInvestor
                                ? "text-purple-600 bg-purple-500/10"
                                : "text-primary bg-primary/10"
                            }`}
                          >
                            {isInvestor ? "💎 Investor & Mentor" : "🚀 Entrepreneur"}
                          </span>
                        </td>

                        {/* Status Column as Entry (Read-only Badge) */}
                        <td className="p-4 text-center whitespace-nowrap">
                          {renderStatusEntry(m.status)}
                        </td>

                        {/* Induction Date */}
                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                          {m.inducted_at
                            ? new Date(m.inducted_at).toLocaleDateString()
                            : m.created_at
                            ? `Registered: ${new Date(m.created_at).toLocaleDateString()}`
                            : "—"}
                        </td>

                        {/* Action Column as Dropdown Menu */}
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">
                                Member Options
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* View Details */}
                              <DropdownMenuItem
                                onClick={() => setViewingMember(m)}
                                className="gap-2 cursor-pointer"
                              >
                                <Eye className="size-3.5 text-primary" /> View Details
                              </DropdownMenuItem>

                              {/* Edit Member */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingMember(m);
                                  setEditCategoryId(m.category_id || "");
                                  setEditMemberType(isInvestor ? "professional" : "business");
                                }}
                                className="gap-2 cursor-pointer"
                              >
                                <Edit2 className="size-3.5 text-blue-600" /> Edit Member
                              </DropdownMenuItem>

                              {/* Activate / Deactivate Toggle */}
                              <DropdownMenuItem
                                onClick={() => toggleStatusMutation.mutate(m)}
                                className="gap-2 cursor-pointer"
                              >
                                {m.status === "active" ? (
                                  <>
                                    <Power className="size-3.5 text-amber-600" /> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-3.5 text-emerald-600" /> Activate
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Delete Member */}
                              <DropdownMenuItem
                                onClick={() => setDeletingMember(m)}
                                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="size-3.5" /> Delete Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Member Details Dialog */}
      <Dialog open={!!viewingMember} onOpenChange={(open) => !open && setViewingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" /> Member Profile Details
            </DialogTitle>
            <DialogDescription>
              Registered credentials and network classification.
            </DialogDescription>
          </DialogHeader>

          {viewingMember && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      {[viewingMember.profiles?.first_name, viewingMember.profiles?.last_name].filter(Boolean).join(" ") || "Member"}
                    </h3>
                    <p className="text-muted-foreground">{viewingMember.profiles?.email}</p>
                  </div>
                  {renderStatusEntry(viewingMember.status)}
                </div>

                <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Phone:</span>
                    <span className="font-medium text-foreground">{viewingMember.profiles?.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">WCA ID:</span>
                    <span className="font-mono font-medium text-foreground">{viewingMember.members?.member_id || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Location:</span>
                    <span className="font-medium text-foreground">
                      {[viewingMember.profiles?.city, viewingMember.profiles?.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Induction Date:</span>
                    <span className="font-medium text-foreground">
                      {viewingMember.inducted_at ? new Date(viewingMember.inducted_at).toLocaleDateString() : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4 space-y-1.5">
                <span className="text-muted-foreground block font-medium">Assigned Membership Category</span>
                <p className="font-bold text-foreground text-sm">
                  {viewingMember.category || viewingMember.wcbn_membership_categories?.name || "General Member"}
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {viewingMember.member_type === "professional" ? "💎 Investor & Mentor Track" : "🚀 Entrepreneur Track"}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setViewingMember(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-blue-600" /> Edit Member
            </DialogTitle>
            <DialogDescription>
              Update leadership track or assign a different dynamic membership category.
            </DialogDescription>
          </DialogHeader>

          {editingMember && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Leadership Track</Label>
                <select
                  value={editMemberType}
                  onChange={(e) => setEditMemberType(e.target.value as "business" | "professional")}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="business">🚀 Entrepreneur Track</option>
                  <option value="professional">💎 Investor & Mentor Track</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Membership Category</Label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({getCategoryArchetype(c) === "investor_mentor" ? "Investor/Mentor" : "Entrepreneur"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingMember(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => {
                if (editingMember) {
                  updateMutation.mutate({
                    id: editingMember.id,
                    categoryId: editCategoryId,
                    memberType: editMemberType,
                  });
                }
              }}
              className="text-xs gap-1.5"
            >
              {updateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <Dialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" /> Delete Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {[deletingMember?.profiles?.first_name, deletingMember?.profiles?.last_name].filter(Boolean).join(" ") || "this member"}
              </strong>
              ? This will remove their WCBN membership profile and reset their onboarding status.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeletingMember(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMemberMutation.isPending}
              onClick={() => deletingMember && deleteMemberMutation.mutate(deletingMember.id)}
              className="text-xs gap-1.5"
            >
              {deleteMemberMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset All Registrations Dialog */}
      <Dialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" /> Reset All Registrations
            </DialogTitle>
            <DialogDescription>
              This is a test utility that will remove all members, applications, and dues invoices so you can test onboarding from scratch.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetAllOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={resetAllMutation.isPending}
              onClick={() => resetAllMutation.mutate()}
              className="text-xs gap-1.5"
            >
              {resetAllMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              Reset All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
