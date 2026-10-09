import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Linkedin,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Star,
  Tag,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { slugify, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/businesses")({ component: BusinessVetting });

interface BusinessListing {
  id: string;
  display_name: string;
  legal_name: string;
  sector: string;
  city: string | null;
  country: string;
  summary: string | null;
  description: string | null;
  website_url: string | null;
  listing_type: string;
  vetting_status: string;
  is_active: boolean;
  is_featured: boolean;
  risk_level: string;
  created_at: string;
  is_candidate?: boolean;
  application_id?: string;
  owner_member_id?: string;
  wcbn_members: {
    id: string;
    status: string;
    member_type: string;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  } | null;
}

function BusinessVetting() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [listingType, setListingType] = useState<"all" | "business" | "professional">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["admin", "businesses-unified"],
    queryFn: async () => {
      const [bizRes, appsRes] = await Promise.all([
        supabase
          .from("wcbn_businesses")
          .select(`
            *,
            wcbn_members (
              id, status, member_type,
              profiles (first_name, last_name, email, phone)
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("wcbn_applications")
          .select(`
            id, status, current_stage, applicant_type, applicant_data, created_at, wcbn_member_id,
            wcbn_members (
              id, status, member_type,
              profiles (first_name, last_name, email, phone)
            )
          `)
          .order("created_at", { ascending: false }),
      ]);

      if (bizRes.error) console.error("Error fetching businesses:", bizRes.error);
      if (appsRes.error) console.error("Error fetching applications:", appsRes.error);

      const registeredBiz = (bizRes.data ?? []) as BusinessListing[];
      const applications = (appsRes.data ?? []) as any[];

      // Extract applicant businesses that aren't already registered in wcbn_businesses
      const registeredOwnerIds = new Set(registeredBiz.map((b) => b.owner_member_id).filter(Boolean));

      const candidateListings: BusinessListing[] = [];
      applications.forEach((app) => {
        const answers = (app.applicant_data ?? {}) as Record<string, any>;
        const bName =
          answers["business_name"] || (app.applicant_type === "professional" ? answers["organization"] : null);
        if (!bName) return;

        if (!registeredOwnerIds.has(app.wcbn_member_id)) {
          candidateListings.push({
            id: `app_${app.id}`,
            display_name: bName,
            legal_name: bName,
            sector: answers["sector"] || answers["preferred_sectors"] || "General",
            city: answers["city"] || "—",
            country: answers["country"] || "—",
            summary: answers["business_summary"] || answers["experience_summary"] || answers["impact_statement"] || null,
            description: answers["business_summary"] || answers["experience_summary"] || null,
            website_url: answers["website_url"] || answers["linkedin_url"] || null,
            listing_type: app.applicant_type === "professional" ? "professional" : "business",
            vetting_status: app.status === "approved" ? "approved" : "pending",
            is_active: app.status === "approved",
            risk_level: "low",
            created_at: app.created_at,
            is_featured: false,
            is_candidate: true,
            application_id: app.id,
            owner_member_id: app.wcbn_member_id,
            wcbn_members: app.wcbn_members,
          });
        }
      });

      return [...registeredBiz, ...candidateListings];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"wcbn_businesses"> }) => {
      const { error } = await supabase.from("wcbn_businesses").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Directory listing updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Approve & Promote Candidate to official wcbn_businesses table
  const promoteCandidate = useMutation({
    mutationFn: async (b: BusinessListing) => {
      const bizSlug = slugify(b.display_name) || `biz-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      if (b.is_candidate && b.owner_member_id) {
        const { error: insErr } = await supabase.from("wcbn_businesses").insert({
          owner_member_id: b.owner_member_id,
          display_name: b.display_name,
          legal_name: b.legal_name,
          slug: bizSlug,
          sector: b.sector,
          city: b.city !== "—" ? b.city : null,
          country: b.country !== "—" ? b.country : "Cameroon",
          summary: b.summary,
          description: b.description,
          website_url: b.website_url,
          listing_type: b.listing_type,
          vetting_status: "approved",
          is_active: true,
          risk_level: "low",
          approved_at: now,
          approved_by: identity?.userId ?? null,
        });
        if (insErr) throw insErr;

        // If candidate has linked application, mark approved
        if (b.application_id) {
          await supabase
            .from("wcbn_applications")
            .update({
              status: "approved",
              current_stage: "inducted",
              decided_at: now,
              decision_reason: "Approved & published to directory",
            })
            .eq("id", b.application_id);
        }
      } else {
        const { error } = await supabase
          .from("wcbn_businesses")
          .update({
            vetting_status: "approved",
            is_active: true,
            approved_at: now,
            approved_by: identity?.userId ?? null,
          })
          .eq("id", b.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Business verified and published to official directory!");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(`Approval error: ${e.message}`),
  });

  const filteredListings = useMemo(() => {
    return businesses.filter((b) => {
      const matchesType = listingType === "all" || (b.listing_type ?? "business") === listingType;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "approved" && b.vetting_status === "approved" && b.is_active) ||
        (statusFilter === "pending" && b.vetting_status === "pending") ||
        (statusFilter === "featured" && b.is_featured) ||
        (statusFilter === "rejected" && b.vetting_status === "rejected");

      const text = `${b.display_name ?? ""} ${b.sector ?? ""} ${b.city ?? ""} ${b.country ?? ""} ${b.summary ?? ""}`.toLowerCase();
      const matchesSearch = !search.trim() || text.includes(search.toLowerCase());

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [businesses, listingType, statusFilter, search]);

  return (
    <AdminPage
      title="Ventures & Directory"
      description="Review and vet Kingdom enterprise listings and Investor/Mentor profiles, spotlight top businesses, and manage public directory visibility."
    >
      <div className="space-y-6">
        {/* Controls: Track Tabs, Status Filter, Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border text-xs">
              <button
                type="button"
                onClick={() => setListingType("all")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  listingType === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Ventures ({businesses.length})
              </button>
              <button
                type="button"
                onClick={() => setListingType("business")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  listingType === "business" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🚀 Enterprises ({businesses.filter((b) => b.listing_type !== "professional").length})
              </button>
              <button
                type="button"
                onClick={() => setListingType("professional")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  listingType === "professional" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                💎 Investor / Mentor Profiles ({businesses.filter((b) => b.listing_type === "professional").length})
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved & Live</option>
              <option value="pending">Pending Review / Candidate</option>
              <option value="featured">Featured Only</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search enterprise, sector, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading && (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading directory ventures…</p>
          </div>
        )}

        {!isLoading && filteredListings.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No ventures or candidate profiles match the current filter.
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {filteredListings.map((b) => {
            const isInvestor = b.listing_type === "professional";
            const owner = b.wcbn_members as {
              profiles?: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
            } | null;
            const ownerName = [owner?.profiles?.first_name, owner?.profiles?.last_name].filter(Boolean).join(" ") || owner?.profiles?.email;

            return (
              <article
                key={b.id}
                className={`flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-card hover:border-primary/40 transition-colors ${
                  b.is_candidate ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-border"
                }`}
              >
                <div>
                  {/* Top Bar: Title, Track Badge, and Status Badges */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary shrink-0" />
                        <h3 className="text-base font-bold text-foreground">{b.display_name}</h3>
                        {b.is_featured && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            <Star className="size-3 fill-amber-500 text-amber-500" /> Featured
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {b.sector} · {[b.city, b.country].filter((v) => Boolean(v) && v !== "—").join(", ") || "Location not stated"}
                      </p>
                      {ownerName && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Owner: <strong className="text-foreground">{ownerName}</strong>
                          {owner?.profiles?.email && ` (${owner.profiles.email})`}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isInvestor
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {isInvestor ? "💎 Investor / Mentor" : "🚀 Enterprise"}
                      </span>

                      {b.is_candidate ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Application in Pipeline
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-medium">
                          <span
                            className={`rounded-full px-2 py-0.5 capitalize ${
                              b.vetting_status === "approved"
                                ? "bg-primary/15 text-primary"
                                : b.vetting_status === "pending"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {b.vetting_status}
                          </span>

                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              b.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {b.is_active ? "Live" : "Hidden"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary / Mission */}
                  <p className="mt-4 line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                    {b.summary || b.description || "No public executive summary provided yet."}
                  </p>
                </div>

                {/* Bottom Action Controls */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    {b.vetting_status !== "approved" && (
                      <Button
                        size="sm"
                        disabled={promoteCandidate.isPending}
                        onClick={() => promoteCandidate.mutate(b)}
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1"
                      >
                        {promoteCandidate.isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                        Approve & Publish to Directory
                      </Button>
                    )}

                    {b.is_candidate && (
                      <Link to="/admin/applications">
                        <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                          Review Application <ExternalLink className="size-3" />
                        </Button>
                      </Link>
                    )}

                    {!b.is_candidate && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={update.isPending}
                          onClick={() => update.mutate({ id: b.id, patch: { is_active: !b.is_active } })}
                          className="text-xs h-8"
                        >
                          {b.is_active ? <EyeOff className="size-3.5 mr-1" /> : <Eye className="size-3.5 mr-1" />}
                          {b.is_active ? "Hide" : "Publish"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={update.isPending}
                          onClick={() => update.mutate({ id: b.id, patch: { is_featured: !b.is_featured } })}
                          className={`text-xs h-8 ${b.is_featured ? "text-amber-600 border-amber-500/40" : ""}`}
                        >
                          <Star className={`size-3.5 mr-1 ${b.is_featured ? "fill-amber-500" : ""}`} />
                          {b.is_featured ? "Unfeature" : "Feature"}
                        </Button>
                      </>
                    )}
                  </div>

                  {!b.is_candidate && (
                    <div className="flex items-center gap-2">
                      <select
                        value={b.risk_level ?? "low"}
                        onChange={(e) => update.mutate({ id: b.id, patch: { risk_level: e.target.value } })}
                        className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold capitalize"
                      >
                        <option value="low">Risk: Low</option>
                        <option value="medium">Risk: Medium</option>
                        <option value="high">Risk: High</option>
                      </select>

                      {b.vetting_status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate({ id: b.id, patch: { vetting_status: "rejected", is_active: false } })
                          }
                          className="text-xs h-8 text-destructive hover:bg-destructive/10"
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AdminPage>
  );
}
