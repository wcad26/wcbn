import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, BriefcaseBusiness, CircleDollarSign, ClipboardCheck, ShieldCheck, Target, XCircle } from "lucide-react";
import { MemberPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, money, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal")({ component: PortalHome });

function PortalHome() {
  const { data: identity } = useIdentity();
  const wcbnId = identity?.wcbnMember?.id;

  const { data } = useQuery({
    queryKey: ["portal", "overview", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const [application, businesses, invoices] = await Promise.all([
        supabase.from("wcbn_applications").select("id, status, current_stage, submitted_at").eq("wcbn_member_id", wcbnId!).maybeSingle(),
        supabase.from("wcbn_businesses").select("id, display_name, vetting_status, is_active").eq("owner_member_id", wcbnId!),
        supabase.from("wcbn_invoices").select("id, amount, paid_amount, currency_code, status, due_date").eq("wcbn_member_id", wcbnId!),
      ]);
      return { application: application.data, businesses: businesses.data ?? [], invoices: invoices.data ?? [] };
    },
  });

  const outstanding = (data?.invoices ?? []).reduce((sum, i) => sum + Math.max(0, Number(i.amount) - Number(i.paid_amount)), 0);
  const currency = data?.invoices?.[0]?.currency_code ?? "XAF";
  const stageIndex = STAGES.findIndex((s) => s.code === data?.application?.current_stage);

  return (
    <MemberPage title={`Welcome, ${identity?.fullName ?? "member"}`} description="Your WCBN membership journey, business listing, contributions and impact in one place.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Membership status" value={identity?.wcbnMember?.status ?? "Not started"} detail={identity?.wcbnMember?.category ?? "Begin your application to join"} icon={BadgeCheck} />
        <MetricCard label="Application stage" value={data?.application ? (STAGES[Math.max(stageIndex, 0)]?.label ?? "Applied") : "—"} detail={data?.application?.status ?? "No application yet"} icon={ClipboardCheck} />
        <MetricCard label="Businesses listed" value={data?.businesses.length ?? 0} detail={`${data?.businesses.filter((b) => b.is_active).length ?? 0} live in the public catalog`} icon={BriefcaseBusiness} />
        <MetricCard label="Outstanding dues" value={money(outstanding, currency)} detail={`${data?.invoices.length ?? 0} invoice(s) on record`} icon={CircleDollarSign} />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-lg font-semibold">Validation journey</h2>
          <p className="mt-1 text-sm text-muted-foreground">WCBN membership is earned. Reviewers move your application through each stage.</p>
          <ol className="mt-6 space-y-3">
            {STAGES.map((stage, i) => {
              const done = stageIndex >= i && stageIndex >= 0;
              const current = stageIndex === i;
              return (
                <li key={stage.code} className="flex items-center gap-3">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${current ? "gradient-brand text-primary-foreground" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                  <span className={`text-sm ${current ? "font-semibold" : done ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Eligibility</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <Check ok={!!identity?.wcaActive} label="Active WCA membership" detail={identity?.member?.member_id ?? "No WCA member record found"} />
              <Check ok={!!identity?.dcgActive} label="Active DCG participation" detail={identity?.dcgName ?? "No active DCG assignment"} />
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Region: {identity?.regionName ?? "—"}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/application"><ClipboardCheck />Continue my application</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/business"><BriefcaseBusiness />Manage my business</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/impact"><Target />Impact commitment</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/covenant"><ShieldCheck />View the covenant</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </MemberPage>
  );
}

function Check({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      {ok ? <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
      <span><span className="font-medium">{label}</span><span className="block text-xs text-muted-foreground">{detail}</span></span>
    </li>
  );
}
