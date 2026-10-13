import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Globe2,
  Plus,
  Receipt,
  ScrollText,
  Sparkles,
  Target,
  TriangleAlert,
  UserRound,
  Users,
  Video,
} from "lucide-react";
import { MemberPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { money, useIdentity } from "@/lib/wcbn";
import { eventDate, eventPlace, postDate, postTypeLabel } from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/")({ component: PortalHome });

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  currency_code: string;
  status: string;
  due_date: string;
  wcbn_payments: Payment[] | null;
};
type Payment = {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
};
type Business = {
  id: string;
  display_name: string;
  slug: string | null;
  sector: string;
  city: string | null;
  country: string;
  vetting_status: string;
  is_active: boolean;
};
type Review = {
  id: string;
  review_year: number;
  status: string;
  jobs_created: number | null;
  people_trained: number | null;
  businesses_supported: number | null;
};

export function PortalHome() {
  const { data: identity } = useIdentity();
  const wcbnId = identity?.wcbnMember?.id;
  const year = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "overview", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const [invoices, businesses, commitment, reviews, network, catalog, networkImpact, jobs] =
        await Promise.all([
          supabase
            .from("wcbn_invoices")
            .select(
              "id, invoice_number, amount, paid_amount, currency_code, status, due_date, wcbn_payments(id, amount, status, method, reference, paid_at, created_at)"
            )
            .eq("wcbn_member_id", wcbnId!)
            .order("due_date", { ascending: false }),
          supabase
            .from("wcbn_businesses")
            .select("id, display_name, slug, sector, city, country, vetting_status, is_active")
            .eq("owner_member_id", wcbnId!)
            .order("created_at"),
          supabase
            .from("wcbn_impact_commitments")
            .select("id, statement, target_year, sdg_numbers, measures")
            .eq("wcbn_member_id", wcbnId!)
            .maybeSingle(),
          supabase
            .from("wcbn_annual_reviews")
            .select("id, review_year, status, jobs_created, people_trained, businesses_supported")
            .eq("wcbn_member_id", wcbnId!)
            .order("review_year", { ascending: false }),
          supabase.from("wcbn_members").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase
            .from("wcbn_businesses")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .eq("vetting_status", "approved"),
          supabase.from("wcbn_annual_reviews").select("jobs_created, people_trained"),
          supabase.from("wcbn_jobs").select("id", { count: "exact", head: true }).eq("wcbn_member_id", wcbnId!),
        ]);
      return {
        invoices: (invoices.data ?? []) as unknown as Invoice[],
        businesses: (businesses.data ?? []) as unknown as Business[],
        commitment: commitment.data,
        reviews: (reviews.data ?? []) as unknown as Review[],
        networkMembers: network.count ?? 0,
        networkBusinesses: catalog.count ?? 0,
        networkJobs: (networkImpact.data ?? []).reduce((s, r) => s + Number(r.jobs_created ?? 0), 0),
        networkTrained: (networkImpact.data ?? []).reduce((s, r) => s + Number(r.people_trained ?? 0), 0),
        memberJobsCount: jobs.count ?? 0,
      };
    },
  });

  const { data: feed } = useQuery({
    queryKey: ["portal", "overview-feed"],
    queryFn: async () => {
      const [events, posts] = await Promise.all([
        supabase
          .from("wcbn_events")
          .select("id, title, slug, start_datetime, end_datetime, venue_name, city, country, event_format, virtual_url")
          .eq("status", "published")
          .gte("start_datetime", new Date().toISOString())
          .order("start_datetime")
          .limit(2),
        supabase
          .from("wcbn_posts")
          .select("id, title, slug, post_type, published_at, created_at")
          .eq("status", "published")
          .order("is_pinned", { ascending: false })
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(3),
      ]);
      return { events: events.data ?? [], posts: posts.data ?? [] };
    },
  });

  const invoices = data?.invoices ?? [];
  const businesses = data?.businesses ?? [];
  const reviews = data?.reviews ?? [];
  const currency = invoices[0]?.currency_code ?? "XAF";
  const today = new Date().toISOString().slice(0, 10);

  const outstanding = invoices.reduce(
    (s, i) => s + Math.max(0, Number(i.amount) - Number(i.paid_amount)),
    0
  );
  const overdue = invoices.filter(
    (i) => Number(i.amount) - Number(i.paid_amount) > 0 && i.due_date < today
  );
  const nextDue = invoices
    .filter((i) => Number(i.amount) - Number(i.paid_amount) > 0 && i.due_date >= today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const payments = invoices
    .flatMap((i) =>
      (i.wcbn_payments ?? []).map((p) => ({
        ...p,
        invoice_number: i.invoice_number,
        currency_code: i.currency_code,
      }))
    )
    .sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at));
  const confirmedThisYear = payments
    .filter((p) => p.status === "confirmed" && (p.paid_at ?? p.created_at).startsWith(String(year)))
    .reduce((s, p) => s + Number(p.amount), 0);

  const live = businesses.filter((b) => b.is_active).length;
  const jobs = reviews.reduce((s, r) => s + Number(r.jobs_created ?? 0), 0);
  const trained = reviews.reduce((s, r) => s + Number(r.people_trained ?? 0), 0);
  const latestReview = reviews[0] ?? null;
  const thisYearReview = reviews.find((r) => r.review_year === year) ?? null;

  const duesOk = outstanding === 0;
  const goodStanding = overdue.length === 0;

  const checklist = [
    {
      ok: true,
      label: "Covenant charter affirmed",
      to: "/portal/covenant" as const,
      action: "View Covenant Charter",
    },
    {
      ok: live > 0,
      label: "Business directory profile active",
      to: "/portal/business" as const,
      action: "Manage your business listing",
    },
    {
      ok: !!data?.commitment,
      label: "Multi-year impact commitment on file",
      to: "/portal/impact" as const,
      action: "Update impact commitment",
    },
    {
      ok: duesOk,
      label: "Membership fees up to date",
      to: "/portal/contributions" as const,
      action: "Review fee invoices",
    },
    {
      ok: !!thisYearReview,
      label: `${year} annual impact review reported`,
      to: "/portal/impact" as const,
      action: "Submit annual review",
    },
  ];

  if (isLoading) {
    return (
      <MemberPage
        title={`Welcome, ${identity?.fullName ?? "Member"}`}
        description="Your standing in the World Changers Business Network: overview, impact and opportunities."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </MemberPage>
    );
  }

  return (
    <MemberPage
      title={`Welcome, ${identity?.fullName ?? "Member"}`}
      description="Your executive dashboard in the World Changers Business Network: business standing, talent recruitment, verified impact, and gatherings."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="rounded-xl shadow-sm gap-1.5">
            <Link to="/portal/jobs">
              <Plus className="size-4" />
              <span>Post a Job</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Link to="/portal/impact">
              <Target className="size-4 text-primary" />
              <span>Report Impact</span>
            </Link>
          </Button>
        </div>
      }
    >
      {/* Member Standing Header Pills */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <BadgeCheck className="size-3.5" />
          {identity?.wcbnMember?.category ?? "Enterprise"} Track
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            goodStanding
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          }`}
        >
          {goodStanding ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
          {goodStanding ? "Good Standing" : "Fees Due"}
        </span>
        {identity?.wcbnMember?.inducted_at && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Member since {new Date(identity.wcbnMember.inducted_at).toLocaleDateString()}
          </span>
        )}
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs rounded-full gap-1 text-primary">
          <Link to="/portal/covenant">
            <ScrollText className="size-3" />
            <span>Covenant Charter</span>
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Membership Standing"
          value={goodStanding ? "Active & In Good Standing" : "Attention Needed"}
          detail={`${identity?.wcbnMember?.category ?? "Member"} · ${identity?.regionName ?? "WCA Hub"}`}
          icon={BadgeCheck}
        />
        <MetricCard
          label="Verified Impact"
          value={jobs.toLocaleString()}
          detail={`${jobs} jobs created · ${trained} trained`}
          icon={Target}
        />
        <MetricCard
          label="Career Postings"
          value={data?.memberJobsCount ?? 0}
          detail="Active roles on WCBN jobs board"
          icon={Briefcase}
        />
        <MetricCard
          label={`Fees Settle in ${year}`}
          value={money(confirmedThisYear, currency)}
          detail={outstanding > 0 ? `${money(outstanding, currency)} pending payment` : "All dues settled"}
          icon={CircleDollarSign}
        />
      </div>

      {/* Two Column Layout */}
      <section className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Left Column: Finance, Businesses, and Impact */}
        <div className="space-y-6 lg:col-span-8">
          {/* Finance & Invoices Box */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Membership Invoices & Dues</h2>
                <p className="text-xs text-muted-foreground">Your fee schedule and recent payment confirmations.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to="/portal/contributions">
                  <Receipt className="mr-1.5 size-4" />
                  <span>View All Invoices</span>
                </Link>
              </Button>
            </div>

            {overdue.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-destructive/10 p-4 text-xs text-destructive border border-destructive/20">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  {overdue.length} invoice(s) past due —{" "}
                  <strong>{money(overdue.reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount)), 0), currency)}</strong>{" "}
                  outstanding balance.
                </span>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              {nextDue ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Next Due Invoice
                    </span>
                    <p className="mt-0.5 text-2xl font-bold text-foreground">
                      {money(Number(nextDue.amount) - Number(nextDue.paid_amount), nextDue.currency_code)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {nextDue.invoice_number} · Due {new Date(nextDue.due_date).toLocaleDateString()}
                    </p>
                    <Button asChild size="sm" className="mt-2 rounded-xl">
                      <Link to="/portal/contributions">Pay Invoice</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {invoices.length ? "All fee obligations are settled in full." : "No invoices issued."}
                </p>
              )}
            </div>

            {payments.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Payments
                </h3>
                <div className="mt-2.5 divide-y divide-border/60">
                  {payments.slice(0, 3).map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-foreground">{money(Number(p.amount), p.currency_code)}</strong>
                        <span className="text-muted-foreground ml-2">Invoice {p.invoice_number}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          p.status === "confirmed"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Business & Directory Overview */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">My Business Profile</h2>
                <p className="text-xs text-muted-foreground">Your presence in the public WCBN enterprise catalog.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to="/portal/business">
                  <Building2 className="mr-1.5 size-4" />
                  <span>Manage Profile</span>
                </Link>
              </Button>
            </div>

            {businesses.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {businesses.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-sm text-foreground">{b.display_name}</strong>
                      <Badge
                        className={`text-[10px] capitalize ${
                          b.is_active
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {b.is_active ? "Live" : "Under Vetting"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.sector} · {[b.city, b.country].filter(Boolean).join(", ")}
                    </p>
                    {b.slug && (
                      <Link
                        to="/businesses/$slug"
                        params={{ slug: b.slug }}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" /> View Public Page
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <p>No business profile listed yet.</p>
                <Button asChild size="sm" className="mt-3 rounded-xl">
                  <Link to="/portal/business">Create Business Profile</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Responsibilities, Upcoming Events & Pulse */}
        <div className="space-y-6 lg:col-span-4">
          {/* Member Responsibilities Checklist */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground pb-3 border-b border-border/60">
              Member Checklist
            </h3>
            <ul className="space-y-3 text-xs">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  {item.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <span className="font-semibold text-foreground">{item.label}</span>
                    {!item.ok && (
                      <Link to={item.to} className="block text-[11px] font-semibold text-primary hover:underline mt-0.5">
                        {item.action} →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming Gatherings Widget */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <CalendarDays className="size-4 text-primary" />
                <span>Upcoming Gatherings</span>
              </h3>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link to="/portal/events">View All</Link>
              </Button>
            </div>

            {feed?.events.length ? (
              <div className="space-y-3">
                {feed.events.map((e: any) => (
                  <div key={e.id} className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-2">
                    <Link
                      to="/portal/events/$slug"
                      params={{ slug: e.slug }}
                      className="font-bold text-xs text-foreground hover:text-primary transition line-clamp-1 block"
                    >
                      {e.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{eventDate(e)}</p>
                    {e.virtual_url && (
                      <Button
                        asChild
                        size="sm"
                        className="w-full h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
                      >
                        <a href={e.virtual_url} target="_blank" rel="noreferrer">
                          <Video className="size-3.5" />
                          <span>Join Online Meeting</span>
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No upcoming sessions announced.</p>
            )}
          </div>

          {/* Network Pulse */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
              <Globe2 className="size-4 text-primary" />
              <span>WCBN Network Pulse</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-muted/40 p-3">
                <span className="text-lg font-bold text-primary block">{data?.networkMembers ?? 0}</span>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Active Members</span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <span className="text-lg font-bold text-primary block">{data?.networkBusinesses ?? 0}</span>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Enterprises</span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <span className="text-lg font-bold text-primary block">{(data?.networkJobs ?? 0).toLocaleString()}</span>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Jobs Created</span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <span className="text-lg font-bold text-primary block">{(data?.networkTrained ?? 0).toLocaleString()}</span>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">People Trained</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MemberPage>
  );
}
