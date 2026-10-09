import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Gem,
  Globe,
  HelpCircle,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { money, useIdentity, slugify } from "@/lib/wcbn";
import { getCategoryArchetype, type Category } from "@/lib/fees";

export const Route = createFileRoute("/admin/applications")({ component: ApplicationsPipeline });

interface ApplicationRecord {
  id: string;
  status: string;
  current_stage: string;
  applicant_type: "business" | "professional" | string;
  applicant_data: Record<string, any> | null;
  category_id: string | null;
  wcbn_member_id: string | null;
  created_at: string;
  submitted_at: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  wcbn_members: {
    id: string;
    category: string | null;
    category_id: string | null;
    status: string;
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
  } | null;
  wcbn_application_stages: {
    id: string;
    stage_code: string;
    status: string;
    notes: string | null;
    created_at: string;
    reviewer_id: string | null;
  }[];
  wcbn_invoices: {
    id: string;
    invoice_number: string;
    amount: number | string;
    paid_amount: number | string;
    status: string;
    currency_code: string;
    billing_cycle: string | null;
  }[];
}

function ApplicationsPipeline() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();

  // Selected Application for Details Dossier View
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | "business" | "professional">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodFilterState>({ preset: "all" });

  // Dialog States for Validation and Decline
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin", "applications-table"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wcbn_applications")
        .select(`
          *,
          wcbn_members (
            id, category, category_id, status, profile_id,
            profiles (first_name, last_name, email, phone),
            members (member_id, status, join_date)
          ),
          wcbn_application_stages (id, stage_code, status, notes, created_at, reviewer_id),
          wcbn_invoices (id, invoice_number, amount, paid_amount, status, currency_code, billing_cycle)
        `)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching applications:", error);
      }
      return (data ?? []) as unknown as ApplicationRecord[];
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

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Selected Application
  const selectedApplication = useMemo(() => {
    if (!selectedAppId) return null;
    return applications.find((a) => a.id === selectedAppId) || null;
  }, [applications, selectedAppId]);

  // Approve / Validate Application Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ appId, notes }: { appId: string; notes?: string }) => {
      const app = applications.find((a) => a.id === appId);
      if (!app) throw new Error("Application not found.");

      const now = new Date().toISOString();

      // 1. Update application status
      const { error: appErr } = await supabase
        .from("wcbn_applications")
        .update({
          status: "approved",
          current_stage: "inducted",
          decided_at: now,
          decision_reason: notes?.trim() || "Validated and approved by WCBN leadership",
          submitted_at: app.submitted_at || now,
        })
        .eq("id", appId);
      if (appErr) throw appErr;

      // 2. Insert or update stage
      await supabase.from("wcbn_application_stages").insert({
        application_id: appId,
        stage_code: "inducted",
        status: "completed",
        notes: notes?.trim() || "Application validated & member inducted.",
        reviewer_id: identity?.userId ?? null,
      });

      // 3. Activate member
      if (app.wcbn_member_id) {
        await supabase
          .from("wcbn_members")
          .update({
            status: "active",
            member_type: app.applicant_type,
            inducted_at: now,
          })
          .eq("id", app.wcbn_member_id);

        // 4. If this is an entrepreneur application with a business name, ensure it is created in wcbn_businesses
        const answers = (app.applicant_data ?? {}) as Record<string, any>;
        if (answers["business_name"]) {
          const bizSlug = slugify(answers["business_name"]) || `biz-${Date.now().toString().slice(-6)}`;
          const { data: existingBiz } = await supabase
            .from("wcbn_businesses")
            .select("id")
            .eq("owner_member_id", app.wcbn_member_id)
            .maybeSingle();

          if (existingBiz) {
            await supabase
              .from("wcbn_businesses")
              .update({
                display_name: answers["business_name"],
                legal_name: answers["business_name"],
                sector: answers["sector"] || "General",
                city: answers["city"] || null,
                country: answers["country"] || "Cameroon",
                summary: answers["business_summary"] || null,
                description: answers["business_summary"] || null,
                website_url: answers["website_url"] || null,
                registration_number: answers["registration_number"] || null,
                vetting_status: "approved",
                is_active: true,
                approved_at: now,
                approved_by: identity?.userId ?? null,
              })
              .eq("id", existingBiz.id);
          } else {
            await supabase.from("wcbn_businesses").insert({
              owner_member_id: app.wcbn_member_id,
              display_name: answers["business_name"],
              legal_name: answers["business_name"],
              slug: bizSlug,
              sector: answers["sector"] || "General",
              city: answers["city"] || null,
              country: answers["country"] || "Cameroon",
              summary: answers["business_summary"] || null,
              description: answers["business_summary"] || null,
              website_url: answers["website_url"] || null,
              registration_number: answers["registration_number"] || null,
              listing_type: "business",
              vetting_status: "approved",
              is_active: true,
              risk_level: "low",
              approved_at: now,
              approved_by: identity?.userId ?? null,
            });
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Application successfully validated! Member is now inducted.");
      setApproveDialogOpen(false);
      setApprovalNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(`Validation error: ${e.message}`),
  });

  // Decline / Reject Application Mutation
  const declineMutation = useMutation({
    mutationFn: async ({ appId, reason }: { appId: string; reason: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("wcbn_applications")
        .update({
          status: "rejected",
          decided_at: now,
          decision_reason: reason.trim(),
        })
        .eq("id", appId);
      if (error) throw error;

      await supabase.from("wcbn_application_stages").insert({
        application_id: appId,
        stage_code: "rejected",
        status: "completed",
        notes: `Application declined: ${reason.trim()}`,
        reviewer_id: identity?.userId ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Application has been declined.");
      setDeclineDialogOpen(false);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(`Decline error: ${e.message}`),
  });

  // Add Reviewer Internal Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ appId, noteText }: { appId: string; noteText: string }) => {
      const app = applications.find((a) => a.id === appId);
      if (!app) return;
      const { error } = await supabase.from("wcbn_application_stages").insert({
        application_id: appId,
        stage_code: app.current_stage || "review",
        status: "in_progress",
        notes: noteText.trim(),
        reviewer_id: identity?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reviewer note saved to dossier.");
      setInternalNote("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Filtered Applications List
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Track filter
      if (trackFilter !== "all" && (app.applicant_type ?? "business") !== trackFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && !["draft", "submitted", "in_review", "applied"].includes(app.status)) {
          return false;
        } else if (statusFilter !== "pending" && app.status !== statusFilter) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "all" && app.category_id !== categoryFilter) {
        return false;
      }

      // Period filter
      if (!isDateInPeriod(app.created_at, period)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = app.wcbn_members?.profiles;
        const answers = (app.applicant_data ?? {}) as Record<string, any>;
        const nameMatch = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.toLowerCase().includes(q);
        const emailMatch = p?.email?.toLowerCase().includes(q);
        const wcaMatch = app.wcbn_members?.members?.member_id?.toLowerCase().includes(q);
        const ventureMatch = (answers["business_name"] || answers["organization"] || "")
          .toLowerCase()
          .includes(q);
        const sectorMatch = (answers["sector"] || answers["preferred_sectors"] || "")
          .toLowerCase()
          .includes(q);

        if (!nameMatch && !emailMatch && !wcaMatch && !ventureMatch && !sectorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [applications, trackFilter, statusFilter, categoryFilter, period, searchQuery]);

  // Overall counters
  const totalAppsCount = applications.length;
  const pendingCount = applications.filter((a) =>
    ["draft", "submitted", "in_review", "applied"].includes(a.status)
  ).length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  // Helper for Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold">
            <CheckCircle2 className="size-3" /> Validated / Inducted
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 font-semibold">
            <XCircle className="size-3" /> Declined
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground gap-1 font-medium">
            <Clock className="size-3" /> Draft
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold">
            <Clock className="size-3" /> Under Review
          </Badge>
        );
    }
  };

  // If viewing a single application dossier
  if (selectedApplication) {
    const app = selectedApplication;
    const p = app.wcbn_members?.profiles;
    const answers = (app.applicant_data ?? {}) as Record<string, any>;
    const isInvestor = app.applicant_type === "professional";
    const cat = app.category_id ? categoryMap.get(app.category_id) : null;
    const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Applicant";
    const stages = app.wcbn_application_stages ?? [];
    const invoices = app.wcbn_invoices ?? [];

    return (
      <AdminPage
        title={`Application Dossier: ${fullName}`}
        description="Review candidate credentials, inspect track questionnaire responses, and decide on admission."
      >
        <div className="space-y-6">
          {/* Top Bar with Back Navigation & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5 shadow-card">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAppId(null)}
              className="gap-2 text-xs"
            >
              <ArrowLeft className="size-3.5" /> Back to Applications Table
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {renderStatusBadge(app.status)}

              {app.status !== "approved" && (
                <Button
                  size="sm"
                  onClick={() => setApproveDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold"
                >
                  <CheckCircle2 className="size-4" /> Validate & Induct Member
                </Button>
              )}

              {app.status !== "rejected" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeclineDialogOpen(true)}
                  className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 gap-1.5 text-xs font-semibold"
                >
                  <XCircle className="size-4" /> Decline Application
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Main Dossier Content */}
            <div className="space-y-6">
              {/* Applicant Identity Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{fullName}</h2>
                    <p className="text-xs text-muted-foreground">{p?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs font-semibold ${isInvestor ? "border-purple-500/40 text-purple-600 bg-purple-500/10" : "border-primary/40 text-primary bg-primary/10"}`}>
                      {isInvestor ? "💎 Investor & Mentor Track" : "🚀 Entrepreneur Track"}
                    </Badge>
                    {cat && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        {cat.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Phone Contact:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                      <Phone className="size-3 text-muted-foreground" /> {p?.phone || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Location:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                      <MapPin className="size-3 text-muted-foreground" /> {[answers["city"] || p?.city, answers["country"] || p?.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">WCA Association ID:</span>
                    <span className="font-mono font-semibold text-foreground mt-0.5 block">
                      {app.wcbn_members?.members?.member_id || "Registered"}
                    </span>
                  </div>
                </div>

                {app.decision_reason && (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs space-y-1">
                    <span className="font-bold text-foreground block">Decision Notice:</span>
                    <p className="text-muted-foreground">{app.decision_reason}</p>
                    <span className="text-[10px] text-muted-foreground block">
                      Recorded on: {app.decided_at ? new Date(app.decided_at).toLocaleString() : "—"}
                    </span>
                  </div>
                )}
              </div>

              {/* Track Questionnaire Responses */}
              {isInvestor ? (
                /* Investor / Mentor Questionnaire Dossier */
                <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-5">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <Gem className="size-5 text-purple-600" />
                    <h3 className="font-bold text-foreground text-base">Investor & Mentor Questionnaire</h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <span className="text-muted-foreground block">Professional Title / Role</span>
                      <p className="font-semibold text-foreground mt-1 text-sm">{answers["investor_role"] || "—"}</p>
                    </div>

                    <div className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <span className="text-muted-foreground block">Organization / Firm</span>
                      <p className="font-semibold text-foreground mt-1 text-sm">{answers["organization"] || "—"}</p>
                    </div>

                    <div className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <span className="text-muted-foreground block">Investment Ticket Size / Capacity</span>
                      <p className="font-semibold text-foreground mt-1 text-sm">{answers["ticket_size"] || "—"}</p>
                    </div>

                    <div className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <span className="text-muted-foreground block">Mentorship Availability</span>
                      <p className="font-semibold text-foreground mt-1 text-sm">{answers["mentorship_availability"] || "—"}</p>
                    </div>
                  </div>

                  {answers["linkedin_url"] && (
                    <div className="rounded-2xl border border-border p-4 bg-muted/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Linkedin className="size-4 text-blue-600" />
                        <span className="font-medium text-foreground">LinkedIn Profile:</span>
                        <span className="text-muted-foreground">{answers["linkedin_url"]}</span>
                      </div>
                      <a href={answers["linkedin_url"]} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          Open <ExternalLink className="size-3" />
                        </Button>
                      </a>
                    </div>
                  )}

                  {answers["advisory_areas"]?.length > 0 && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-muted-foreground block font-medium">Advisory Expertise Areas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {answers["advisory_areas"].map((area: string) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {answers["experience_summary"] && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-muted-foreground block font-medium">Professional Experience Summary:</span>
                      <div className="rounded-2xl bg-muted/30 p-4 border border-border text-foreground leading-relaxed">
                        {answers["experience_summary"]}
                      </div>
                    </div>
                  )}

                  {answers["kingdom_vision"] && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-muted-foreground block font-medium">Kingdom & Business Network Vision:</span>
                      <div className="rounded-2xl bg-muted/30 p-4 border border-border text-foreground leading-relaxed">
                        {answers["kingdom_vision"]}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Entrepreneur Enterprise Questionnaire Dossier */
                <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-5">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <Rocket className="size-5 text-primary" />
                    <h3 className="font-bold text-foreground text-base">Enterprise Questionnaire Responses</h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <span className="text-muted-foreground block">Enterprise Name</span>
                      <p className="font-bold text-foreground mt-1 text-sm">{answers["business_name"] || "—"}</p>
                    </div>

                    <div className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <span className="text-muted-foreground block">Industry / Sector</span>
                      <p className="font-semibold text-foreground mt-1 text-sm">{answers["sector"] || "—"}</p>
                    </div>

                    <div className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <span className="text-muted-foreground block">Operating Location</span>
                      <p className="font-semibold text-foreground mt-1 text-sm">
                        {[answers["city"], answers["country"]].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <span className="text-muted-foreground block">Business Stage</span>
                      <p className="font-semibold text-foreground mt-1 text-sm">{answers["business_stage"] || "—"}</p>
                    </div>
                  </div>

                  {answers["website_url"] && (
                    <div className="rounded-2xl border border-border p-4 bg-muted/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Globe className="size-4 text-primary" />
                        <span className="font-medium text-foreground">Enterprise Website:</span>
                        <span className="text-muted-foreground">{answers["website_url"]}</span>
                      </div>
                      <a href={answers["website_url"]} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          Visit Site <ExternalLink className="size-3" />
                        </Button>
                      </a>
                    </div>
                  )}

                  {answers["business_summary"] && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-muted-foreground block font-medium">Business Executive Summary:</span>
                      <div className="rounded-2xl bg-muted/30 p-4 border border-border text-foreground leading-relaxed">
                        {answers["business_summary"]}
                      </div>
                    </div>
                  )}

                  {answers["growth_priorities"]?.length > 0 && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-muted-foreground block font-medium">Core Growth Priorities:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {answers["growth_priorities"].map((item: string) => (
                          <Badge key={item} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {answers["impact_statement"] && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-muted-foreground block font-medium">Kingdom & Community Impact Statement:</span>
                      <div className="rounded-2xl bg-muted/30 p-4 border border-border text-foreground leading-relaxed">
                        {answers["impact_statement"]}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar: Financials, Stage Transitions & Reviewer Notes */}
            <aside className="space-y-6">
              {/* Financials & Invoices Card */}
              <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <FileText className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Membership Invoices
                  </h4>
                </div>

                {invoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No invoices generated yet for this applicant.</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="rounded-xl border border-border bg-muted/20 p-3 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-foreground">{inv.invoice_number}</span>
                          <Badge variant="outline" className={`text-[10px] capitalize ${inv.status === "paid" ? "text-emerald-600 border-emerald-500/30" : "text-amber-600 border-amber-500/30"}`}>
                            {inv.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-muted-foreground text-[11px]">
                          <span>Amount:</span>
                          <span className="font-semibold text-foreground">{money(Number(inv.amount), inv.currency_code)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground text-[11px]">
                          <span>Billing Cycle:</span>
                          <span className="capitalize">{inv.billing_cycle || "annual"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviewer Internal Notes */}
              <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <MessageSquare className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Reviewer Notes & Timeline
                  </h4>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {stages.length === 0 && (
                    <p className="text-xs text-muted-foreground">No historical review notes recorded.</p>
                  )}
                  {stages.map((st) => (
                    <div key={st.id} className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-foreground capitalize">{st.stage_code.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">{new Date(st.created_at).toLocaleDateString()}</span>
                      </div>
                      {st.notes && <p className="text-muted-foreground text-[11px] leading-relaxed">{st.notes}</p>}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-border space-y-2">
                  <Textarea
                    placeholder="Add an internal reviewer remark..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="text-xs resize-none h-16"
                  />
                  <Button
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    disabled={!internalNote.trim() || addNoteMutation.isPending}
                    onClick={() => addNoteMutation.mutate({ appId: app.id, noteText: internalNote })}
                  >
                    {addNoteMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Add Review Note
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Validate Confirmation Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-5" /> Validate & Induct Member
              </DialogTitle>
              <DialogDescription>
                This will officially approve <strong>{fullName}</strong>, advance their stage to inducted, and activate their network membership.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <label className="font-medium text-foreground">Approval Remarks (Optional)</label>
              <Textarea
                placeholder="e.g. Validated credentials, strong enterprise alignment..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="text-xs h-20"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setApproveDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate({ appId: app.id, notes: approvalNotes })}
              >
                {approveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Confirm Validation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Confirmation Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <XCircle className="size-5" /> Decline Application
              </DialogTitle>
              <DialogDescription>
                Please specify the leadership rationale for declining this application. This will be recorded in the audit dossier.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <label className="font-medium text-foreground">Decline Reason (Required)</label>
              <Textarea
                placeholder="e.g. Does not meet current enterprise criteria, misaligned with network focus..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="text-xs h-20"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeclineDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs gap-1.5"
                disabled={!declineReason.trim() || declineMutation.isPending}
                onClick={() => declineMutation.mutate({ appId: app.id, reason: declineReason })}
              >
                {declineMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                Decline Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminPage>
    );
  }

  // DEFAULT: Master Table of Applications View
  return (
    <AdminPage
      title="Applications Table & Pipeline"
      description="Inspect incoming candidates across Entrepreneur and Investor/Mentor tracks, filter by stage or period, and decide on admissions."
    >
      <div className="space-y-6">
        {/* KPI Summary Banner */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total In Pipeline</span>
              <Users className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalAppsCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Registered applicants</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Under Review</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting decision</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Validated & Inducted</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{approvedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Approved members</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Declined</span>
              <XCircle className="size-4 text-rose-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{rejectedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Not admitted</p>
          </div>
        </div>

        {/* Master Applications Table Section */}
        <div className="rounded-3xl border border-border bg-card shadow-card overflow-hidden">
          {/* Filter Bar */}
          <div className="p-5 border-b border-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search applicant, venture, email, WCA ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Period Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Date:</span>
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>

            {/* Track, Status, and Category Selectors */}
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
                    All Tracks
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
                  <option value="pending">Under Review / Pending</option>
                  <option value="approved">Validated / Inducted</option>
                  <option value="rejected">Declined</option>
                  <option value="draft">Draft</option>
                </select>

                {/* Category Filter */}
                {categories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <span className="text-xs text-muted-foreground">
                Showing <strong>{filteredApplications.length}</strong> of {applications.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4 font-semibold">Applicant</th>
                  <th className="p-4 font-semibold">Category & Track</th>
                  <th className="p-4 font-semibold">Venture / Affiliation</th>
                  <th className="p-4 font-semibold">Applied Date</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                      Loading candidate applications...
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No applications found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => {
                    const p = app.wcbn_members?.profiles;
                    const answers = (app.applicant_data ?? {}) as Record<string, any>;
                    const isInvestor = app.applicant_type === "professional";
                    const cat = app.category_id ? categoryMap.get(app.category_id) : null;
                    const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Applicant";
                    const orgName = answers["business_name"] || answers["organization"] || "—";
                    const sectorName = answers["sector"] || answers["preferred_sectors"] || "—";

                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedAppId(app.id)}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <div className="font-bold text-foreground text-xs leading-tight">{fullName}</div>
                          <div className="text-[11px] text-muted-foreground">{p?.email}</div>
                          {app.wcbn_members?.members?.member_id && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              WCA: {app.wcbn_members.members.member_id}
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="text-xs font-semibold text-foreground">
                            {cat?.name || app.wcbn_members?.category || "General"}
                          </div>
                          <span
                            className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              isInvestor
                                ? "text-purple-600 bg-purple-500/10"
                                : "text-primary bg-primary/10"
                            }`}
                          >
                            {isInvestor ? "💎 Investor & Mentor" : "🚀 Entrepreneur"}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="text-xs font-medium text-foreground">{orgName}</div>
                          <div className="text-[11px] text-muted-foreground">{sectorName}</div>
                        </td>

                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>

                        <td className="p-4 text-center whitespace-nowrap">
                          {renderStatusBadge(app.status)}
                        </td>

                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppId(app.id);
                            }}
                          >
                            View Details <ArrowRight className="size-3" />
                          </Button>
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
    </AdminPage>
  );
}
