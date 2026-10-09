import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight, Briefcase, CheckCircle2, Eye, EyeOff, Globe,
  Linkedin, Loader2, MapPin, Search, Sparkles, Star, Tag, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/businesses")({ component: BusinessVetting });

function BusinessVetting() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [listingType, setListingType] = useState<"all" | "business" | "professional">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["admin", "businesses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wcbn_businesses")
        .select(`
          *,
          wcbn_members (
            id, status, member_type,
            profiles (first_name, last_name, email)
          )
        `)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"wcbn_businesses"> }) => {
      const { error } = await supabase.from("wcbn_businesses").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Directory listing updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
      <div className="space-y-4">
        {/* Controls: Track Tabs, Status Filter, Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {([
              ["all", "All Directory Listings"],
              ["business", "🚀 Enterprise Listings"],
              ["professional", "💎 Investor & Mentor Profiles"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setListingType(value)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  listingType === value ? "gradient-brand text-white shadow-xs" : "bg-muted text-muted-foreground hover:bg-secondary"
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
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved & Live</option>
              <option value="pending">Pending Vetting</option>
              <option value="featured">Featured Spotlight</option>
              <option value="rejected">Rejected / Inactive</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ventures, sectors, locations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-60 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading && <p className="text-sm text-muted-foreground">Loading directory ventures…</p>}
        {!isLoading && filteredListings.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No ventures or leadership profiles match the current filter.
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {filteredListings.map((b) => {
            const isInvestor = b.listing_type === "professional";
            const owner = b.wcbn_members as {
              profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null;
            } | null;
            const ownerName = [owner?.profiles?.first_name, owner?.profiles?.last_name].filter(Boolean).join(" ");

            return (
              <article
                key={b.id}
                className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/30 transition-colors"
              >
                <div>
                  {/* Top Bar: Title, Track Badge, and Badges */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{b.display_name}</h3>
                        {b.is_featured && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            <Star className="size-3 fill-amber-500 text-amber-500" /> Featured
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {b.sector} · {[b.city, b.country].filter(Boolean).join(", ") || "Location not stated"}
                      </p>
                      {ownerName && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Owner: <strong className="text-foreground">{ownerName}</strong> ({owner?.profiles?.email})
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isInvestor ? "bg-purple-500/10 text-purple-700 dark:text-purple-300" : "bg-primary/10 text-primary"
                      }`}>
                        {isInvestor ? "💎 Investor/Mentor" : "🚀 Enterprise"}
                      </span>

                      <div className="flex items-center gap-1 text-[10px] font-medium">
                        <span className={`rounded-full px-2 py-0.5 capitalize ${
                          b.vetting_status === "approved"
                            ? "bg-primary/15 text-primary"
                            : b.vetting_status === "pending"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-destructive/15 text-destructive"
                        }`}>
                          {b.vetting_status}
                        </span>

                        <span className={`rounded-full px-2 py-0.5 font-semibold ${
                          b.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {b.is_active ? "Live" : "Hidden"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary / Mission */}
                  <p className="mt-4 line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                    {b.summary || b.description || "No public summary provided yet."}
                  </p>
                </div>

                {/* Bottom Action Controls */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    {b.vetting_status !== "approved" && (
                      <Button
                        size="sm"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: b.id,
                            patch: {
                              vetting_status: "approved",
                              is_active: true,
                              approved_at: new Date().toISOString(),
                              approved_by: identity?.userId ?? null,
                            },
                          })
                        }
                        className="text-xs h-8 gradient-brand text-white font-medium"
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> Approve & Publish
                      </Button>
                    )}

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
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={b.risk_level ?? "green"}
                      onChange={(e) => update.mutate({ id: b.id, patch: { risk_level: e.target.value } })}
                      className={`h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold capitalize ${
                        b.risk_level === "red"
                          ? "text-destructive"
                          : b.risk_level === "amber"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-primary"
                      }`}
                    >
                      <option value="green">Risk: Low (Green)</option>
                      <option value="amber">Risk: Medium (Amber)</option>
                      <option value="red">Risk: High (Red)</option>
                    </select>

                    {b.vetting_status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: b.id, patch: { vetting_status: "rejected", is_active: false } })}
                        className="text-xs h-8 text-destructive hover:bg-destructive/10"
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AdminPage>
  );
}
