import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, CircleDollarSign, ClipboardCheck, Target, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, money } from "@/lib/wcbn";

export const Route = createFileRoute("/admin")({ component: AdminOverview });

const COLORS = ["hsl(284 32% 35%)", "hsl(267 54% 36%)", "hsl(181 53% 45%)", "hsl(284 32% 60%)", "hsl(41 90% 55%)"];

function AdminOverview() {
  const { data } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [members, applications, businesses, invoices, reviews] = await Promise.all([
        supabase.from("wcbn_members").select("id, category, status"),
        supabase.from("wcbn_applications").select("id, status, current_stage"),
        supabase.from("wcbn_businesses").select("id, vetting_status, is_active, country"),
        supabase.from("wcbn_invoices").select("amount, paid_amount, status"),
        supabase.from("wcbn_annual_reviews").select("jobs_created, people_trained, businesses_supported"),
      ]);
      return {
        members: members.data ?? [], applications: applications.data ?? [], businesses: businesses.data ?? [],
        invoices: invoices.data ?? [], reviews: reviews.data ?? [],
      };
    },
  });

  const expected = (data?.invoices ?? []).reduce((s, i) => s + Number(i.amount), 0);
  const collected = (data?.invoices ?? []).reduce((s, i) => s + Number(i.paid_amount), 0);
  const jobs = (data?.reviews ?? []).reduce((s, r) => s + r.jobs_created, 0);
  const stageData = STAGES.map((s) => ({ name: s.label, value: data?.applications.filter((a) => a.current_stage === s.code).length ?? 0 }));
  const categoryData = ["Associate", "Member", "Leader", "Impact Partner", "Fellow"]
    .map((c) => ({ name: c, value: data?.members.filter((m) => m.category === c).length ?? 0 })).filter((d) => d.value > 0);

  return (
    <AdminPage title="Leadership overview" description="Live picture of the network: applications in flight, vetted businesses, dues collection and reported impact.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="WCBN members" value={data?.members.length ?? 0} detail={`${data?.members.filter((m) => m.status === "active").length ?? 0} active`} icon={Users} />
        <MetricCard label="Applications" value={data?.applications.length ?? 0} detail={`${data?.applications.filter((a) => a.status === "submitted").length ?? 0} awaiting review`} icon={ClipboardCheck} />
        <MetricCard label="Businesses" value={data?.businesses.length ?? 0} detail={`${data?.businesses.filter((b) => b.vetting_status === "pending").length ?? 0} pending vetting`} icon={BriefcaseBusiness} />
        <MetricCard label="Dues collected" value={money(collected)} detail={`of ${money(expected)} invoiced`} icon={CircleDollarSign} />
        <MetricCard label="Jobs reported" value={jobs} detail={`${data?.reviews.length ?? 0} annual reviews submitted`} icon={Target} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-lg font-semibold">Applications by stage</h2>
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
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Members by category</h2>
          <div className="mt-6 h-72">
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No members yet.</p>}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
