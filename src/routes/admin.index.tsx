import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, ArrowUpRight, BriefcaseBusiness, CheckCircle2, CircleDollarSign,
  ClipboardCheck, Clock, FileCheck2, Landmark, Rocket, Sparkles, TrendingUp, Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, money } from "@/lib/wcbn";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

const COLORS = ["hsl(284 32% 35%)", "hsl(267 54% 36%)", "hsl(181 53% 45%)", "hsl(284 32% 60%)", "hsl(41 90% 55%)", "hsl(210 70% 50%)"];

function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [members, applications, businesses, invoices, payments, categories] = await Promise.all([
        supabase.from("wcbn_members").select("id, category, category_id, status, member_type"),
        supabase.from("wcbn_applications").select("id, status, current_stage, applicant_type, created_at"),
        supabase.from("wcbn_businesses").select("id, vetting_status, is_active, listing_type, country"),
        supabase.from("wcbn_invoices").select("id, amount, paid_amount, status, currency_code"),
        supabase.from("wcbn_payments").select("id, status, method, amount, currency_code").in("status", ["pending", "declared"]),
        supabase.from("wcbn_membership_categories").select("id, name, code, applicant_type"),
      ]);

      return {
        members: members.data ?? [],
        applications: applications.data ?? [],
        businesses: businesses.data ?? [],
        invoices: invoices.data ?? [],
        pendingPayments: payments.data ?? [],
        categories: categories.data ?? [],
      };
    },
  });

  const members = data?.members ?? [];
  const applications = data?.applications ?? [];
  const businesses = data?.businesses ?? [];
  const invoices = data?.invoices ?? [];
  const pendingPayments = data?.pendingPayments ?? [];
  const categories = data?.categories ?? [];

  const activeMembers = members.filter((m) => m.status === "active");
  const entrepreneurMembers = members.filter((m) => m.member_type === "business");
  const investorMembers = members.filter((m) => m.member_type === "professional" || m.member_type === "investor_mentor");

  const pendingApps = applications.filter((a) => a.status === "submitted" || a.status === "in_review" || a.status === "applied");
  const expectedFees = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const collectedFees = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const collectionRate = expectedFees > 0 ? Math.round((collectedFees / expectedFees) * 100) : 0;

  // Dynamic stages breakdown
  const stageData = STAGES.map((s) => ({
    name: s.label,
    value: applications.filter((a) => a.current_stage === s.code).length,
  }));

  // Dynamic categories breakdown
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const categoryData = categories.map((cat) => {
    const count = members.filter((m) => m.category_id === cat.id || m.category === cat.name).length;
    return { name: cat.name, value: count };
  }).filter((d) => d.value > 0);

  // If no members are mapped to dynamic categories yet, fallback to track count
  const displayCategoryData = categoryData.length > 0 ? categoryData : [
    { name: "Entrepreneurs", value: entrepreneurMembers.length },
    { name: "Investors & Mentors", value: investorMembers.length },
  ].filter((d) => d.value > 0);

  return (
    <AdminPage
      title="Leadership Command Center"
      description="Live operational picture of the World Changers Business Network: applications queue, bank transfer verifications, member directory, and fee collections."
    >
      {/* High-priority Action Alerts Hub */}
      <div className="space-y-4">
        {(pendingPayments.length > 0 || pendingApps.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingPayments.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-amber-500/20">
                    <Landmark className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      {pendingPayments.length} Bank Transfer Slip{pendingPayments.length > 1 ? "s" : ""} Pending
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      Receipts submitted by applicants awaiting verification to activate membership.
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="border-amber-500/40 hover:bg-amber-500/20">
                  <Link to="/admin/contributions">Verify Now</Link>
                </Button>
              </div>
            )}

            {pendingApps.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 p-4 text-foreground">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/20">
                    <ClipboardCheck className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      {pendingApps.length} Application{pendingApps.length > 1 ? "s" : ""} Awaiting Review
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Entrepreneurs and Investors queued in the vetting pipeline.
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" className="gradient-brand text-white">
                  <Link to="/admin/applications">Review Queue</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Core Metric Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Total WCBN Members"
            value={members.length}
            detail={`${activeMembers.length} active · ${entrepreneurMembers.length} Ent. / ${investorMembers.length} Inv.`}
            icon={Users}
          />
          <MetricCard
            label="Applications Queue"
            value={applications.length}
            detail={`${pendingApps.length} awaiting leadership review`}
            icon={ClipboardCheck}
          />
          <MetricCard
            label="Transfer Slips"
            value={pendingPayments.length}
            detail="Awaiting bank verification"
            icon={Landmark}
          />
          <MetricCard
            label="Fees Collected"
            value={money(collectedFees)}
            detail={`${collectionRate}% of ${money(expectedFees)} invoiced`}
            icon={CircleDollarSign}
          />
          <MetricCard
            label="Vetted Listings"
            value={businesses.length}
            detail={`${businesses.filter((b) => b.is_active).length} live in directory`}
            icon={BriefcaseBusiness}
          />
        </div>

        {/* Operational Analytics & Distribution */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Applications by Stage */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Applications by Pipeline Stage</h2>
                <p className="text-xs text-muted-foreground">Flow of applicants through vetting and induction</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to="/admin/applications">
                  View Pipeline <ArrowUpRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(284 32% 35%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Members by Category / Track */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Membership Distribution</h2>
                <p className="text-xs text-muted-foreground">By category & leadership track</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to="/admin/members">
                  All Members <ArrowUpRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="mt-6 h-72">
              {displayCategoryData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayCategoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {displayCategoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No member data recorded yet.
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground">
              {displayCategoryData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Launchpad to Common Admin Tasks */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-bold text-foreground">Quick Management Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Link
              to="/admin/applications"
              className="flex items-center gap-3 rounded-2xl border border-border p-3.5 text-sm font-medium transition hover:border-primary/50 hover:bg-muted/40"
            >
              <ClipboardCheck className="size-5 text-primary" />
              <div>
                <span className="block font-semibold">Vetting Queue</span>
                <span className="block text-xs text-muted-foreground">Review applications</span>
              </div>
            </Link>

            <Link
              to="/admin/contributions"
              className="flex items-center gap-3 rounded-2xl border border-border p-3.5 text-sm font-medium transition hover:border-primary/50 hover:bg-muted/40"
            >
              <Landmark className="size-5 text-primary" />
              <div>
                <span className="block font-semibold">Verify Transfers</span>
                <span className="block text-xs text-muted-foreground">Confirm payments</span>
              </div>
            </Link>

            <Link
              to="/admin/members"
              className="flex items-center gap-3 rounded-2xl border border-border p-3.5 text-sm font-medium transition hover:border-primary/50 hover:bg-muted/40"
            >
              <Users className="size-5 text-primary" />
              <div>
                <span className="block font-semibold">Member Roster</span>
                <span className="block text-xs text-muted-foreground">Manage & reset members</span>
              </div>
            </Link>

            <Link
              to="/admin/categories"
              className="flex items-center gap-3 rounded-2xl border border-border p-3.5 text-sm font-medium transition hover:border-primary/50 hover:bg-muted/40"
            >
              <Sparkles className="size-5 text-primary" />
              <div>
                <span className="block font-semibold">Categories & Fees</span>
                <span className="block text-xs text-muted-foreground">Configure tiers</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
