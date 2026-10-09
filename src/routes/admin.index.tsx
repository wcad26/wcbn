import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Gem,
  Landmark,
  Rocket,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PeriodFilter, PeriodFilterState, isDateInPeriod } from "@/components/wcbn/period-filter";
import { getCategoryArchetype, type Category } from "@/lib/fees";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

// Rich distinct palette for different categories and tracks
const CATEGORY_COLORS = [
  "#7c3aed", // Deep Violet (Entrepreneurs)
  "#2563eb", // Royal Blue
  "#059669", // Emerald Green
  "#d97706", // Amber
  "#db2777", // Rose Pink
  "#0284c7", // Sky Blue
  "#7c2d12", // Warm Brown
  "#4f46e5", // Indigo
];

function AdminOverview() {
  const [period, setPeriod] = useState<PeriodFilterState>({ preset: "12M" });
  const [trackFilter, setTrackFilter] = useState<"all" | "entrepreneur" | "investor_mentor">("all");
  const [viewMode, setViewMode] = useState<"cumulative" | "new">("cumulative");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview-modern"],
    queryFn: async () => {
      const [membersRes, businessesRes, categoriesRes, paymentsRes, applicationsRes] = await Promise.all([
        supabase
          .from("wcbn_members")
          .select(`
            id,
            category,
            category_id,
            member_type,
            status,
            created_at,
            inducted_at,
            wcbn_membership_categories(id, name, code, applicant_type)
          `)
          .order("created_at", { ascending: true }),
        supabase
          .from("wcbn_businesses")
          .select("id, display_name, legal_name, is_active, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("wcbn_membership_categories")
          .select("*")
          .order("display_order", { ascending: true }),
        supabase
          .from("wcbn_payments")
          .select("id, status, amount, currency_code")
          .in("status", ["pending", "declared"]),
        supabase
          .from("wcbn_applications")
          .select("id, status, applicant_type, applicant_data, current_stage, created_at"),
      ]);

      return {
        members: membersRes.data ?? [],
        businesses: businessesRes.data ?? [],
        categories: (categoriesRes.data ?? []) as Category[],
        pendingPayments: paymentsRes.data ?? [],
        applications: applicationsRes.data ?? [],
      };
    },
  });

  const allMembers = data?.members ?? [];
  const allApplications = data?.applications ?? [];
  const allBusinesses = data?.businesses ?? [];
  const categories = data?.categories ?? [];
  const pendingPayments = data?.pendingPayments ?? [];

  // Filter members and businesses based on selected date period
  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => isDateInPeriod(m.created_at, period));
  }, [allMembers, period]);

  const filteredBusinesses = useMemo(() => {
    return allBusinesses.filter((b) => isDateInPeriod(b.created_at, period));
  }, [allBusinesses, period]);

  // Total KPI Calculations
  // 1. Total Members
  const totalMembersCount = allMembers.length;
  const newMembersInPeriod = filteredMembers.length;

  // 2. Total Entrepreneurs
  const entrepreneurMembers = useMemo(() => {
    return allMembers.filter((m) => {
      if (m.member_type === "business" || m.member_type === "entrepreneur") return true;
      if (m.wcbn_membership_categories) {
        return getCategoryArchetype(m.wcbn_membership_categories as unknown as Category) === "entrepreneur";
      }
      return true; // default track
    });
  }, [allMembers]);

  // 3. Total Investors / Mentors
  const investorMembers = useMemo(() => {
    return allMembers.filter((m) => {
      if (
        m.member_type === "professional" ||
        m.member_type === "investor" ||
        m.member_type === "mentor" ||
        m.member_type === "investor_mentor"
      ) {
        return true;
      }
      if (m.wcbn_membership_categories) {
        return getCategoryArchetype(m.wcbn_membership_categories as unknown as Category) === "investor_mentor";
      }
      return false;
    });
  }, [allMembers]);

  // 4. Total Businesses
  const totalBusinessesCount = useMemo(() => {
    const registeredCount = allBusinesses.length;
    const applicantCount = allApplications.filter((a) => {
      const d = (a.applicant_data ?? {}) as Record<string, any>;
      const bName = typeof d["business_name"] === "string" ? d["business_name"].trim() : "";
      return (a.applicant_type === "business" || Boolean(bName)) && Boolean(bName);
    }).length;
    return Math.max(registeredCount, applicantCount);
  }, [allBusinesses, allApplications]);

  const newBusinessesInPeriod = useMemo(() => {
    const registeredCount = filteredBusinesses.length;
    const applicantCount = allApplications.filter((a) => {
      const d = (a.applicant_data ?? {}) as Record<string, any>;
      const bName = typeof d["business_name"] === "string" ? d["business_name"].trim() : "";
      return (
        isDateInPeriod(a.created_at, period) &&
        (a.applicant_type === "business" || Boolean(bName)) &&
        Boolean(bName)
      );
    }).length;
    return Math.max(registeredCount, applicantCount);
  }, [filteredBusinesses, allApplications, period]);

  // Track breakdown in selected period
  const periodEntrepreneurs = useMemo(() => {
    return filteredMembers.filter((m) => {
      if (m.member_type === "business" || m.member_type === "entrepreneur") return true;
      if (m.wcbn_membership_categories) {
        return getCategoryArchetype(m.wcbn_membership_categories as unknown as Category) === "entrepreneur";
      }
      return true;
    }).length;
  }, [filteredMembers]);

  const periodInvestors = useMemo(() => {
    return filteredMembers.filter((m) => {
      if (
        m.member_type === "professional" ||
        m.member_type === "investor" ||
        m.member_type === "mentor" ||
        m.member_type === "investor_mentor"
      ) {
        return true;
      }
      if (m.wcbn_membership_categories) {
        return getCategoryArchetype(m.wcbn_membership_categories as unknown as Category) === "investor_mentor";
      }
      return false;
    }).length;
  }, [filteredMembers]);

  // Growth Chart Time Buckets
  const { chartData, categoryKeys } = useMemo(() => {
    // Generate buckets depending on period preset
    const now = new Date();
    const buckets: { key: string; label: string; date: Date }[] = [];

    const numBuckets = period.preset === "1M" ? 4 : period.preset === "3M" ? 6 : period.preset === "6M" ? 6 : 12;

    for (let i = numBuckets - 1; i >= 0; i--) {
      const d = new Date(now);
      if (period.preset === "1M") {
        d.setDate(d.getDate() - i * 7);
        const label = `W-${numBuckets - i}`;
        buckets.push({ key: d.toISOString().slice(0, 10), label, date: d });
      } else {
        d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label, date: d });
      }
    }

    // Determine category keys to chart
    const catMap = new Map<string, string>();
    categories.forEach((c) => catMap.set(c.id, c.name));

    // Also include default track keys if categories are few
    const keys: { key: string; label: string; color: string }[] = [];

    if (categories.length > 0) {
      categories.forEach((cat, idx) => {
        if (trackFilter !== "all") {
          const arch = getCategoryArchetype(cat);
          if (arch !== trackFilter) return;
        }
        keys.push({
          key: `cat_${cat.id}`,
          label: cat.name,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] ?? "#7c3aed",
        });
      });
    }

    // If categories are not assigned or filtered, fallback to tracks
    if (keys.length === 0) {
      keys.push(
        { key: "entrepreneurs", label: "Entrepreneurs", color: "#7c3aed" },
        { key: "investors", label: "Investors & Mentors", color: "#2563eb" }
      );
    }

    // Build bucket rows
    const rows = buckets.map((bucket, bIdx) => {
      const row: Record<string, any> = {
        name: bucket.label,
        date: bucket.date,
      };

      keys.forEach((k) => {
        row[k.key] = 0;
      });

      const nextBucket = buckets[bIdx + 1];

      allMembers.forEach((m) => {
        const mDate = new Date(m.created_at || m.inducted_at || new Date());
        const isBeforeEnd = mDate <= (nextBucket ? nextBucket.date : new Date());
        const isCurrentPeriod =
          mDate <= (nextBucket ? nextBucket.date : new Date()) &&
          mDate >= bucket.date;

        const countThis = viewMode === "cumulative" ? isBeforeEnd : isCurrentPeriod;
        if (!countThis) return;

        // Attribute to key
        if (m.category_id && keys.some((k) => k.key === `cat_${m.category_id}`)) {
          row[`cat_${m.category_id}`] = (row[`cat_${m.category_id}`] || 0) + 1;
        } else {
          // Track fallback
          const isInv =
            m.member_type === "professional" ||
            m.member_type === "investor" ||
            m.member_type === "mentor" ||
            m.member_type === "investor_mentor";
          if (isInv && row["investors"] !== undefined) {
            row["investors"] = (row["investors"] || 0) + 1;
          } else if (row["entrepreneurs"] !== undefined) {
            row["entrepreneurs"] = (row["entrepreneurs"] || 0) + 1;
          } else if (keys[0]) {
            row[keys[0].key] = (row[keys[0].key] || 0) + 1;
          }
        }
      });

      return row;
    });

    return { chartData: rows, categoryKeys: keys };
  }, [period, trackFilter, viewMode, categories, allMembers]);

  return (
    <AdminPage
      title="Leadership Overview"
      description="Live membership metrics, verified growth trajectory, and network operational indicators."
    >
      <div className="space-y-6">
        {/* Top Control Bar with Period & Track Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground ml-1">Filter Track:</span>
            <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border">
              <button
                type="button"
                onClick={() => setTrackFilter("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  trackFilter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Tracks
              </button>
              <button
                type="button"
                onClick={() => setTrackFilter("entrepreneur")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  trackFilter === "entrepreneur" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🚀 Entrepreneurs
              </button>
              <button
                type="button"
                onClick={() => setTrackFilter("investor_mentor")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  trackFilter === "investor_mentor" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                💎 Investors & Mentors
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Period:</span>
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>

        {/* High-priority Action Alerts Strip (Compact & Unobtrusive) */}
        {pendingPayments.length > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-amber-500/20">
                <Landmark className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold">
                  {pendingPayments.length} Bank Transfer Slip{pendingPayments.length > 1 ? "s" : ""} Pending
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Payment proofs awaiting verification to induct members.
                </p>
              </div>
            </div>
            <Link to="/admin/contributions">
              <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/40 bg-card hover:bg-amber-500/20">
                Verify Slips
              </Button>
            </Link>
          </div>
        )}

        {/* The Exact 4 Required KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Members */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Members
              </span>
              <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-5" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {totalMembersCount}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{newMembersInPeriod}
              </span>
              <span>joined in selected period ({period.preset})</span>
            </div>
          </div>

          {/* Card 2: Total Entrepreneurs */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Entrepreneurs
              </span>
              <div className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Rocket className="size-5" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {entrepreneurMembers.length}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {totalMembersCount > 0 ? Math.round((entrepreneurMembers.length / totalMembersCount) * 100) : 0}%
              </span>
              <span>of total network membership</span>
            </div>
          </div>

          {/* Card 3: Total Investors/Mentors */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Investors / Mentors
              </span>
              <div className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Gem className="size-5" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {investorMembers.length}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {totalMembersCount > 0 ? Math.round((investorMembers.length / totalMembersCount) * 100) : 0}%
              </span>
              <span>of total network membership</span>
            </div>
          </div>

          {/* Card 4: Total Businesses */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Businesses
              </span>
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Building2 className="size-5" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {totalBusinessesCount}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{newBusinessesInPeriod}
              </span>
              <span>enterprises registered in period</span>
            </div>
          </div>
        </div>

        {/* Membership Growth Chart by Category / Track */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Membership Growth by Category
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Historical progression and intake across distinct membership tiers and leadership tracks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("cumulative")}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    viewMode === "cumulative" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cumulative Total
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("new")}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    viewMode === "new" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  New Cohort Intake
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  {categoryKeys.map((k) => (
                    <linearGradient key={`grad_${k.key}`} id={`grad_${k.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={k.color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={k.color} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-border bg-popover p-3 shadow-lg text-xs space-y-1">
                        <p className="font-bold text-foreground border-b border-border pb-1 mb-1.5">{label}</p>
                        {payload.map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <span className="font-bold text-foreground">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                  formatter={(value) => <span className="text-xs font-medium text-foreground">{value}</span>}
                />
                {categoryKeys.map((k) => (
                  <Area
                    key={k.key}
                    type="monotone"
                    dataKey={k.key}
                    name={k.label}
                    stroke={k.color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={`url(#grad_${k.key})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </AdminPage>
  );
}
