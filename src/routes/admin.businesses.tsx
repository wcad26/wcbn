import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Star,
  Tag,
  Users,
  Eye,
  Power,
  Edit2,
  Save,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { slugify } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/businesses")({ component: AdminVenturesPage });

export interface ValidatedVenture {
  id: string; // unique key
  realBizId?: string; // id in wcbn_businesses if present
  applicationId?: string; // id in wcbn_applications if present
  displayName: string;
  legalName: string;
  slug: string;
  sector: string;
  city: string;
  country: string;
  stage: string;
  summary: string;
  growthPriorities: string[];
  impactStatement: string;
  websiteUrl: string | null;
  registrationNumber: string | null;
  listingType: "business" | "professional";
  isActive: boolean;
  isFeatured: boolean;
  riskLevel: string;
  validationDate: string;
  ownerMemberId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  wcaMemberId: string;
  memberStatus: string;
  memberCategory: string;
}

function AdminVenturesPage() {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState<"all" | "business" | "professional">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "featured">("all");
  const [period, setPeriod] = useState<PeriodFilterState>({ preset: "all" });

  // Detail View State (Dossier Mode)
  const [selectedVentureId, setSelectedVentureId] = useState<string | null>(null);

  // Edit Modal State
  const [editingVenture, setEditingVenture] = useState<ValidatedVenture | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    legalName: "",
    sector: "",
    city: "",
    country: "",
    websiteUrl: "",
    stage: "",
    summary: "",
  });

  // Query: Only businesses validated during the application stage or in verified directory
  const { data: ventures = [], isLoading } = useQuery({
    queryKey: ["admin", "validated-ventures"],
    queryFn: async () => {
      const [bizRes, appsRes] = await Promise.all([
        supabase
          .from("wcbn_businesses")
          .select(`
            *,
            wcbn_members (
              id, status, member_type, category,
              profiles (first_name, last_name, email, phone, city, country),
              members (member_id, status)
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("wcbn_applications")
          .select(`
            id, status, current_stage, applicant_type, applicant_data, submitted_at, decided_at, created_at, wcbn_member_id,
            wcbn_members (
              id, status, member_type, category,
              profiles (first_name, last_name, email, phone, city, country),
              members (member_id, status)
            )
          `)
          .eq("status", "approved") // CRITICAL: Only validated/approved applications!
          .order("created_at", { ascending: false }),
      ]);

      if (bizRes.error) console.error("Error fetching registered businesses:", bizRes.error);
      if (appsRes.error) console.error("Error fetching approved applications:", appsRes.error);

      const registeredBiz = (bizRes.data ?? []) as any[];
      const approvedApps = (appsRes.data ?? []) as any[];

      const items: ValidatedVenture[] = [];
      const registeredByOwnerId = new Map<string, any>();
      const registeredByName = new Map<string, any>();

      // 1. Process official wcbn_businesses
      registeredBiz.forEach((b) => {
        if (b.owner_member_id) registeredByOwnerId.set(b.owner_member_id, b);
        if (b.display_name) registeredByName.set(b.display_name.trim().toLowerCase(), b);

        const m = b.wcbn_members;
        const p = m?.profiles;
        const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Founder";

        items.push({
          id: b.id,
          realBizId: b.id,
          displayName: b.display_name,
          legalName: b.legal_name || b.display_name,
          slug: b.slug || slugify(b.display_name),
          sector: b.sector || "General Commerce",
          city: b.city || "—",
          country: b.country || "—",
          stage: "Active Commercial",
          summary: b.summary || b.description || "Validated network venture.",
          growthPriorities: [],
          impactStatement: "Committed to Kingdom transformation and community advancement.",
          websiteUrl: b.website_url || null,
          registrationNumber: b.registration_number || null,
          listingType: b.listing_type === "professional" ? "professional" : "business",
          isActive: Boolean(b.is_active),
          isFeatured: Boolean(b.is_featured),
          riskLevel: b.risk_level || "low",
          validationDate: b.approved_at || b.created_at,
          ownerMemberId: b.owner_member_id || "",
          ownerName: fullName,
          ownerEmail: p?.email || "—",
          ownerPhone: p?.phone || "—",
          wcaMemberId: m?.members?.member_id || "WCA Member",
          memberStatus: m?.status || "active",
          memberCategory: m?.category || "General Member",
        });
      });

      // 2. Process approved applications that have enterprise data
      approvedApps.forEach((app) => {
        const answers = (app.applicant_data ?? {}) as Record<string, any>;
        const bName =
          (answers["business_name"] as string | undefined) ||
          (answers["organization"] as string | undefined) ||
          null;

        if (!bName || !bName.trim()) return; // Must have an enterprise name

        const existingByOwner = app.wcbn_member_id ? registeredByOwnerId.get(app.wcbn_member_id) : null;
        const existingByName = registeredByName.get(bName.trim().toLowerCase());
        const existing = existingByOwner || existingByName;

        if (existing) {
          // Enrich the existing business item with detailed application dossier data if available
          const matchIndex = items.findIndex((i) => i.id === existing.id);
          if (matchIndex !== -1) {
            const item = items[matchIndex];
            if (answers["business_stage"]) item.stage = String(answers["business_stage"]);
            if (answers["business_summary"] && !item.summary) item.summary = String(answers["business_summary"]);
            if (answers["impact_statement"]) item.impactStatement = String(answers["impact_statement"]);
            if (Array.isArray(answers["growth_priorities"])) item.growthPriorities = answers["growth_priorities"];
            if (!item.websiteUrl && answers["website_url"]) item.websiteUrl = String(answers["website_url"]);
            if (!item.registrationNumber && answers["registration_number"]) {
              item.registrationNumber = String(answers["registration_number"]);
            }
            item.applicationId = app.id;
          }
        } else {
          // Add as validated venture directly from application
          const m = app.wcbn_members;
          const p = m?.profiles;
          const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Founder";

          items.push({
            id: `app_${app.id}`,
            applicationId: app.id,
            displayName: bName.trim(),
            legalName: (answers["legal_name"] as string | undefined) || bName.trim(),
            slug: slugify(bName),
            sector: (answers["sector"] as string | undefined) || (answers["preferred_sectors"] as string | undefined) || "General",
            city: (answers["city"] as string | undefined) || p?.city || "—",
            country: (answers["country"] as string | undefined) || p?.country || "—",
            stage: (answers["business_stage"] as string | undefined) || "Established Venture",
            summary: (answers["business_summary"] as string | undefined) || (answers["experience_summary"] as string | undefined) || "Validated business application.",
            growthPriorities: Array.isArray(answers["growth_priorities"]) ? answers["growth_priorities"] : [],
            impactStatement: (answers["impact_statement"] as string | undefined) || "Committed to Kingdom advancement.",
            websiteUrl: (answers["website_url"] as string | undefined) || null,
            registrationNumber: (answers["registration_number"] as string | undefined) || null,
            listingType: app.applicant_type === "professional" ? "professional" : "business",
            isActive: true, // Validated applications are approved
            isFeatured: false,
            riskLevel: "low",
            validationDate: app.decided_at || app.submitted_at || app.created_at,
            ownerMemberId: app.wcbn_member_id || "",
            ownerName: fullName,
            ownerEmail: p?.email || "—",
            ownerPhone: p?.phone || "—",
            wcaMemberId: m?.members?.member_id || "WCA Member",
            memberStatus: m?.status || "active",
            memberCategory: m?.category || "General Member",
          });
        }
      });

      return items;
    },
  });

  // Mutation: Toggle Active / Inactive
  const toggleActiveMutation = useMutation({
    mutationFn: async (v: ValidatedVenture) => {
      const nextActive = !v.isActive;
      if (v.realBizId) {
        const { error } = await supabase
          .from("wcbn_businesses")
          .update({ is_active: nextActive })
          .eq("id", v.realBizId);
        if (error) throw error;
      } else {
        // Promote candidate to wcbn_businesses
        const { error } = await supabase.from("wcbn_businesses").insert({
          slug: v.slug || slugify(v.displayName) || `biz-${Date.now().toString().slice(-6)}`,
          display_name: v.displayName,
          legal_name: v.legalName,
          sector: v.sector,
          city: v.city === "—" ? null : v.city,
          country: v.country === "—" ? "Cameroon" : v.country,
          summary: v.summary,
          website_url: v.websiteUrl,
          listing_type: v.listingType,
          vetting_status: "approved",
          is_active: nextActive,
          is_featured: false,
          risk_level: "low",
          owner_member_id: v.ownerMemberId,
          approved_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      return nextActive;
    },
    onSuccess: (nextActive) => {
      toast.success(`Venture directory visibility set to ${nextActive ? "Active" : "Inactive"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "validated-ventures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation: Toggle Featured
  const toggleFeaturedMutation = useMutation({
    mutationFn: async (v: ValidatedVenture) => {
      const nextFeatured = !v.isFeatured;
      if (v.realBizId) {
        const { error } = await supabase
          .from("wcbn_businesses")
          .update({ is_featured: nextFeatured })
          .eq("id", v.realBizId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_businesses").insert({
          slug: v.slug || slugify(v.displayName) || `biz-${Date.now().toString().slice(-6)}`,
          display_name: v.displayName,
          legal_name: v.legalName,
          sector: v.sector,
          city: v.city === "—" ? null : v.city,
          country: v.country === "—" ? "Cameroon" : v.country,
          summary: v.summary,
          website_url: v.websiteUrl,
          listing_type: v.listingType,
          vetting_status: "approved",
          is_active: true,
          is_featured: nextFeatured,
          risk_level: "low",
          owner_member_id: v.ownerMemberId,
          approved_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      return nextFeatured;
    },
    onSuccess: (nextFeatured) => {
      toast.success(`Venture ${nextFeatured ? "featured on directory spotlight" : "unfeatured"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "validated-ventures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation: Edit Venture Details
  const editVentureMutation = useMutation({
    mutationFn: async (v: ValidatedVenture) => {
      if (v.realBizId) {
        const { error } = await supabase
          .from("wcbn_businesses")
          .update({
            display_name: editForm.displayName.trim(),
            legal_name: editForm.legalName.trim(),
            sector: editForm.sector.trim(),
            city: editForm.city.trim() || null,
            country: editForm.country.trim(),
            website_url: editForm.websiteUrl.trim() || null,
            summary: editForm.summary.trim() || null,
          })
          .eq("id", v.realBizId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_businesses").insert({
          slug: slugify(editForm.displayName) || `biz-${Date.now().toString().slice(-6)}`,
          display_name: editForm.displayName.trim(),
          legal_name: editForm.legalName.trim(),
          sector: editForm.sector.trim(),
          city: editForm.city.trim() || null,
          country: editForm.country.trim() || "Cameroon",
          summary: editForm.summary.trim() || null,
          website_url: editForm.websiteUrl.trim() || null,
          listing_type: v.listingType,
          vetting_status: "approved",
          is_active: v.isActive,
          is_featured: v.isFeatured,
          risk_level: "low",
          owner_member_id: v.ownerMemberId,
          approved_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Venture details updated successfully.");
      setEditingVenture(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "validated-ventures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpenEdit = (v: ValidatedVenture) => {
    setEditingVenture(v);
    setEditForm({
      displayName: v.displayName,
      legalName: v.legalName,
      sector: v.sector,
      city: v.city === "—" ? "" : v.city,
      country: v.country === "—" ? "" : v.country,
      websiteUrl: v.websiteUrl || "",
      stage: v.stage,
      summary: v.summary,
    });
  };

  // Distinct Sectors
  const distinctSectors = useMemo(() => {
    const set = new Set<string>();
    ventures.forEach((v) => {
      if (v.sector && v.sector !== "—") set.add(v.sector);
    });
    return Array.from(set).sort();
  }, [ventures]);

  // Filtered Ventures
  const filteredVentures = useMemo(() => {
    return ventures.filter((v) => {
      // Sector filter
      if (sectorFilter !== "all" && v.sector.toLowerCase() !== sectorFilter.toLowerCase()) {
        return false;
      }

      // Track filter
      if (trackFilter === "business" && v.listingType !== "business") return false;
      if (trackFilter === "professional" && v.listingType !== "professional") return false;

      // Status filter
      if (statusFilter === "active" && !v.isActive) return false;
      if (statusFilter === "inactive" && v.isActive) return false;
      if (statusFilter === "featured" && !v.isFeatured) return false;

      // Period filter
      if (!isDateInPeriod(v.validationDate, period)) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = v.displayName.toLowerCase().includes(q) || v.legalName.toLowerCase().includes(q);
        const ownerMatch = v.ownerName.toLowerCase().includes(q) || v.ownerEmail.toLowerCase().includes(q);
        const locMatch = v.city.toLowerCase().includes(q) || v.country.toLowerCase().includes(q);
        const secMatch = v.sector.toLowerCase().includes(q);
        if (!nameMatch && !ownerMatch && !locMatch && !secMatch) return false;
      }

      return true;
    });
  }, [ventures, sectorFilter, trackFilter, statusFilter, period, search]);

  // Selected Venture Object
  const selectedVenture = useMemo(() => {
    if (!selectedVentureId) return null;
    return ventures.find((v) => v.id === selectedVentureId) || null;
  }, [ventures, selectedVentureId]);

  // Overall KPI Counters
  const totalCount = ventures.length;
  const activeCount = ventures.filter((v) => v.isActive).length;
  const featuredCount = ventures.filter((v) => v.isFeatured).length;
  const sectorsCount = distinctSectors.length;

  /* -------------------------------------------------------------------------- */
  /*                      FULL-PAGE VENTURE DOSSIER VIEW                        */
  /* -------------------------------------------------------------------------- */

  if (selectedVenture) {
    const v = selectedVenture;
    return (
      <AdminPage
        title={v.displayName}
        description={`Validated ${v.listingType === "professional" ? "Strategic Practice" : "Commercial Enterprise"} owned by ${v.ownerName}`}
      >
        <div className="space-y-6">
          {/* Top Bar Navigation & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedVentureId(null)}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <ArrowLeft className="size-3.5" /> Back to Ventures Directory
              </Button>

              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-xs font-semibold">
                <CheckCircle2 className="size-3" /> Validated via Application
              </Badge>

              {v.isFeatured && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs font-semibold">
                  <Star className="size-3 fill-amber-500" /> Featured Spotlight
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Active Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleActiveMutation.mutate(v)}
                disabled={toggleActiveMutation.isPending}
                className={`h-8 text-xs gap-1.5 font-semibold ${
                  v.isActive
                    ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Power className="size-3.5" />
                {v.isActive ? "Active in Directory" : "Directory Hidden"}
              </Button>

              {/* Toggle Featured Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFeaturedMutation.mutate(v)}
                disabled={toggleFeaturedMutation.isPending}
                className="h-8 text-xs gap-1.5 font-semibold text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
              >
                <Star className={`size-3.5 ${v.isFeatured ? "fill-amber-500" : ""}`} />
                {v.isFeatured ? "Featured" : "Spotlight"}
              </Button>

              {/* Edit Venture Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(v)}
                className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/10"
              >
                <Edit2 className="size-3.5" /> Edit Details
              </Button>

              {/* External Website Link */}
              {v.websiteUrl && (
                <a href={v.websiteUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" className="h-8 text-xs gap-1.5">
                    Visit Website <ExternalLink className="size-3" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Dossier Two-Column Layout */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left Column: Core Venture Dossier */}
            <div className="space-y-6">
              {/* Enterprise Identity Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Building2 className="size-5 text-primary" /> {v.displayName}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Legal Name: <strong className="text-foreground">{v.legalName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary bg-primary/5">
                      {v.sector}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {v.stage}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Commercial Sector:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                      <Tag className="size-3 text-muted-foreground" /> {v.sector}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Headquarters Location:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                      <MapPin className="size-3 text-muted-foreground" /> {[v.city, v.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Official Registration:</span>
                    <span className="font-mono font-semibold text-foreground mt-0.5 block">
                      {v.registrationNumber || "Verified Entity"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-3">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Briefcase className="size-4 text-primary" /> Executive Summary & Commercial Focus
                </h3>
                <div className="rounded-2xl bg-muted/30 p-4 border border-border text-xs text-foreground leading-relaxed">
                  {v.summary}
                </div>
              </div>

              {/* Growth Priorities Card */}
              {v.growthPriorities.length > 0 && (
                <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" /> Core Growth Priorities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {v.growthPriorities.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs py-1 px-3">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Kingdom Impact Statement Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-3">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" /> Kingdom & Community Impact Commitment
                </h3>
                <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-xs text-foreground leading-relaxed">
                  {v.impactStatement}
                </div>
              </div>
            </div>

            {/* Right Column: Founder & Governance Record */}
            <aside className="space-y-6">
              {/* Founder Information Card */}
              <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <Users className="size-4 text-primary" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                    Founder / Principal
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Primary Leader:</span>
                    <strong className="text-foreground text-sm block mt-0.5">{v.ownerName}</strong>
                    <span className="text-muted-foreground block text-[11px]">{v.ownerEmail}</span>
                  </div>

                  {v.ownerPhone && (
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-muted-foreground block text-[11px]">Phone Contact:</span>
                      <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="size-3 text-muted-foreground" /> {v.ownerPhone}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/60">
                    <span className="text-muted-foreground block text-[11px]">WCA Membership ID:</span>
                    <span className="font-mono text-xs font-semibold text-foreground mt-0.5 block">
                      {v.wcaMemberId}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <span className="text-muted-foreground block text-[11px]">Assigned Tier:</span>
                    <Badge variant="outline" className="mt-1 text-[11px]">
                      {v.memberCategory}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Directory Governance Card */}
              <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                    Vetting & Validation
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Approval Status:</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px] font-semibold mt-1">
                      <Check className="size-3" /> Validated via Applications
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <span className="text-muted-foreground block text-[11px]">Validated Date:</span>
                    <span className="font-medium text-foreground mt-0.5 block">
                      {v.validationDate ? new Date(v.validationDate).toLocaleDateString() : "Active"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <span className="text-muted-foreground block text-[11px]">Risk Rating:</span>
                    <span className="font-semibold text-emerald-600 mt-0.5 block uppercase text-[11px]">
                      Verified Clean ({v.riskLevel})
                    </span>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Active in Directory</span>
                      <Switch
                        checked={v.isActive}
                        onCheckedChange={() => toggleActiveMutation.mutate(v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Featured Spotlight</span>
                      <Switch
                        checked={v.isFeatured}
                        onCheckedChange={() => toggleFeaturedMutation.mutate(v)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </AdminPage>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                      MASTER VENTURES DIRECTORY TABLE                       */
  /* -------------------------------------------------------------------------- */

  return (
    <AdminPage
      title="Ventures Directory"
      description="The official network directory of validated Christian commercial enterprises and strategic firms inducted through the WCBN application process."
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Validated Ventures</span>
              <Building2 className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Approved through applications</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Active in Directory</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Publicly searchable & visible</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Featured Spotlight</span>
              <Star className="size-4 text-amber-500 fill-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{featuredCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Highlighted enterprises</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Industry Sectors</span>
              <Tag className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{sectorsCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Distinct commercial sectors</p>
          </div>
        </div>

        {/* Master Table Section */}
        <div className="rounded-3xl border border-border bg-card shadow-card overflow-hidden">
          {/* Filter Bar */}
          <div className="p-5 border-b border-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by business name, founder, sector..."
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

            {/* Filter Pills and Sector Selectors */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Track Selector */}
                <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setTrackFilter("all")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      trackFilter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Ventures
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackFilter("business")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      trackFilter === "business" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🚀 Commercial
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackFilter("professional")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      trackFilter === "professional" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    💎 Strategic Firms
                  </button>
                </div>

                {/* Sector Selector */}
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
                >
                  <option value="all">All Sectors ({distinctSectors.length})</option>
                  {distinctSectors.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>

                {/* Directory Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
                >
                  <option value="all">All Directory Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="featured">Featured Spotlight Only</option>
                  <option value="inactive">Hidden / Inactive</option>
                </select>
              </div>

              <span className="text-xs text-muted-foreground">
                Showing <strong>{filteredVentures.length}</strong> of {ventures.length} validated ventures
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4 font-semibold">Enterprise Venture</th>
                  <th className="p-4 font-semibold">Founder / Principal</th>
                  <th className="p-4 font-semibold">Sector & Stage</th>
                  <th className="p-4 font-semibold">Location</th>
                  <th className="p-4 font-semibold">Validation Date</th>
                  <th className="p-4 font-semibold text-center">Directory Status</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                      Loading validated ventures directory...
                    </td>
                  </tr>
                ) : filteredVentures.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No validated ventures match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredVentures.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVentureId(v.id)}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      {/* Enterprise Venture */}
                      <td className="p-4">
                        <div className="font-bold text-foreground text-xs leading-tight flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-primary shrink-0" />
                          <span>{v.displayName}</span>
                          {v.isFeatured && (
                            <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        {v.legalName && v.legalName !== v.displayName && (
                          <div className="text-[11px] text-muted-foreground">{v.legalName}</div>
                        )}
                        {v.websiteUrl && (
                          <div className="flex items-center gap-1 text-[10px] text-primary mt-1">
                            <Globe className="size-2.5" />
                            <span className="line-clamp-1">{v.websiteUrl.replace(/^https?:\/\//, "")}</span>
                          </div>
                        )}
                      </td>

                      {/* Founder / Principal */}
                      <td className="p-4">
                        <div className="font-semibold text-foreground text-xs leading-tight">{v.ownerName}</div>
                        <div className="text-[11px] text-muted-foreground">{v.ownerEmail}</div>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {v.wcaMemberId}
                        </div>
                      </td>

                      {/* Sector & Stage */}
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className="bg-primary/5 text-primary border-primary/20 text-[10px] font-semibold"
                        >
                          {v.sector}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground mt-1">{v.stage}</div>
                      </td>

                      {/* Location */}
                      <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          <span>{[v.city, v.country].filter(Boolean).join(", ") || "—"}</span>
                        </div>
                      </td>

                      {/* Validation Date */}
                      <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                        {v.validationDate ? new Date(v.validationDate).toLocaleDateString() : "Validated"}
                      </td>

                      {/* Directory Status */}
                      <td className="p-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <Badge
                            className={
                              v.isActive
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                                : "bg-muted text-muted-foreground border-border text-[10px]"
                            }
                          >
                            {v.isActive ? "Active" : "Hidden"}
                          </Badge>
                          <Switch
                            checked={v.isActive}
                            onCheckedChange={() => toggleActiveMutation.mutate(v)}
                          />
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVentureId(v.id)}
                          className="h-8 text-xs gap-1 text-primary hover:bg-primary/10 font-semibold"
                        >
                          <Eye className="size-3.5" /> View Dossier
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Venture Modal Dialog */}
      <Dialog open={!!editingVenture} onOpenChange={(open) => !open && setEditingVenture(null)}>
        <DialogContent className="sm:max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit2 className="size-4 text-primary" /> Edit Venture Listing
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update directory metadata for {editingVenture?.displayName}.
            </DialogDescription>
          </DialogHeader>

          {editingVenture && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Display Name</Label>
                <Input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Legal Entity Name</Label>
                <Input
                  value={editForm.legalName}
                  onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Industry Sector</Label>
                  <Input
                    value={editForm.sector}
                    onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operating City</Label>
                  <Input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Country</Label>
                  <Input
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Website URL</Label>
                  <Input
                    value={editForm.websiteUrl}
                    onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                    placeholder="https://..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Commercial Summary</Label>
                <Textarea
                  rows={3}
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingVenture(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={editVentureMutation.isPending}
              onClick={() => editingVenture && editVentureMutation.mutate(editingVenture)}
              className="text-xs gap-1.5"
            >
              {editVentureMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
