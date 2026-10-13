import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Plus,
  Receipt,
  ScrollText,
  Sparkles,
  Target,
  TriangleAlert,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { money, useIdentity } from "@/lib/wcbn";
import { eventDate, eventPlace } from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/")({ component: PortalHome });

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  currency_code: string;
  status: string;
  due_date: string;
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
};

type Job = {
  id: string;
  title: string;
  slug: string;
  department: string | null;
  employment_type: string;
  location_type: string;
  status: string;
  created_at: string;
};

export function PortalHome() {
  const { data: identity } = useIdentity();
  const wcbnId = identity?.wcbnMember?.id;
  const currentYear = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "overview-focused", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const [invoices, businesses, reviews, jobs] = await Promise.all([
        supabase
          .from("wcbn_invoices")
          .select("id, invoice_number, amount, paid_amount, currency_code, status, due_date")
          .eq("wcbn_member_id", wcbnId!)
          .order("due_date", { ascending: false }),
        supabase
          .from("wcbn_businesses")
          .select("id, display_name, slug, sector, city, country, vetting_status, is_active")
          .eq("owner_member_id", wcbnId!)
          .order("created_at"),
        supabase
          .from("wcbn_annual_reviews")
          .select("id, review_year, status, jobs_created, people_trained")
          .eq("wcbn_member_id", wcbnId!)
          .order("review_year", { ascending: false }),
        supabase
          .from("wcbn_jobs")
          .select("id, title, slug, department, employment_type, location_type, status, created_at")
          .eq("wcbn_member_id", wcbnId!)
          .order("created_at", { ascending: false }),
      ]);

      return {
        invoices: (invoices.data ?? []) as Invoice[],
        businesses: (businesses.data ?? []) as Business[],
        reviews: (reviews.data ?? []) as Review[],
        jobs: (jobs.data ?? []) as Job[],
      };
    },
  });

  const { data: eventsData } = useQuery({
    queryKey: ["portal", "overview-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wcbn_events")
        .select("id, title, slug, start_datetime, end_datetime, venue_name, city, country, event_format, virtual_url, meeting_id, meeting_passcode")
        .eq("status", "published")
        .gte("start_datetime", new Date().toISOString())
        .order("start_datetime")
        .limit(2);
      return data ?? [];
    },
  });

  const invoices = data?.invoices ?? [];
  const businesses = data?.businesses ?? [];
  const reviews = data?.reviews ?? [];
  const jobs = data?.jobs ?? [];
  const currency = invoices[0]?.currency_code ?? identity?.regionCurrency ?? "XAF";
  const today = new Date().toISOString().slice(0, 10);

  const outstanding = invoices.reduce(
    (s, i) => s + Math.max(0, Number(i.amount) - Number(i.paid_amount)),
    0
  );
  const overdueInvoices = invoices.filter(
    (i) => Number(i.amount) - Number(i.paid_amount) > 0 && i.due_date < today
  );
  const nextDue = invoices
    .filter((i) => Number(i.amount) - Number(i.paid_amount) > 0 && i.due_date >= today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const duesSettled = outstanding === 0;
  const thisYearReview = reviews.find((r) => r.review_year === currentYear);
  const activeJobs = jobs.filter((j) => j.status === "published");
  const primaryBusiness = businesses[0] ?? null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-72 rounded-3xl lg:col-span-7" />
          <Skeleton className="h-72 rounded-3xl lg:col-span-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ========================================================= */}
      {/* 1. EXECUTIVE WELCOME DOSSIER HERO CARD                   */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full gradient-brand opacity-10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <BadgeCheck className="size-3.5" />
                {identity?.wcbnMember?.category ?? "Enterprise"} Member
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  duesSettled
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                }`}
              >
                {duesSettled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
                {duesSettled ? "Good Standing" : "Dues Outstanding"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back, {identity?.fullName?.split(" ")[0] || "Member"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Your World Changers Business Network portal. Manage your venture profile, talent recruitment, annual impact audits, and gathering connections.
            </p>
          </div>

          {/* Quick Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2 sm:self-start shrink-0">
            <Button asChild size="sm" className="rounded-xl shadow-xs gap-1.5">
              <Link to="/portal/jobs">
                <Plus className="size-3.5" />
                <span>Post a Job</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
              <Link to="/portal/impact">
                <Target className="size-3.5 text-primary" />
                <span>Report Impact</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. FOUR ESSENTIAL KPI STATS (2-col mobile, 4-col desktop) */}
      {/* ========================================================= */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* KPI 1: Standing */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Standing</p>
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <BadgeCheck className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-lg sm:text-2xl font-bold text-foreground">
            {duesSettled ? "Active" : "Attention"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {identity?.regionName || "WCA Global"}
          </p>
        </div>

        {/* KPI 2: Annual Impact */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Impact {currentYear}</p>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Target className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-lg sm:text-2xl font-bold text-foreground">
            {thisYearReview?.status === "approved"
              ? "Live"
              : thisYearReview?.status === "submitted"
              ? "In Review"
              : "Due"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {thisYearReview ? `${thisYearReview.jobs_created ?? 0} jobs created` : "Report pending"}
          </p>
        </div>

        {/* KPI 3: Career Postings */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Job Postings</p>
            <span className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
              <Briefcase className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-lg sm:text-2xl font-bold text-foreground">
            {activeJobs.length}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {activeJobs.length === 1 ? "Active role on board" : "Active roles on board"}
          </p>
        </div>

        {/* KPI 4: Invoices & Fees */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Membership Dues</p>
            <span className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
              <CircleDollarSign className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-lg sm:text-2xl font-bold text-foreground">
            {duesSettled ? "Settled" : money(outstanding, currency)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {duesSettled ? "All obligations cleared" : "Balance pending"}
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CONDITIONAL ACTION BANNERS                             */}
      {/* ========================================================= */}
      {overdueInvoices.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive">
          <div className="flex items-center gap-2.5">
            <TriangleAlert className="size-5 shrink-0" />
            <div>
              <p className="font-bold text-sm">Outstanding Membership Fees</p>
              <p className="text-muted-foreground mt-0.5">
                You have {overdueInvoices.length} invoice(s) due totaling{" "}
                <strong className="text-destructive font-semibold">
                  {money(overdueInvoices.reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount)), 0), currency)}
                </strong>
                .
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="destructive" className="rounded-xl shrink-0">
            <Link to="/portal/contributions">Review & Settle</Link>
          </Button>
        </div>
      )}

      {!thisYearReview && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-primary/10 border border-primary/20 p-4 text-xs text-primary">
          <div className="flex items-center gap-2.5">
            <Target className="size-5 shrink-0 text-primary" />
            <div>
              <p className="font-bold text-sm text-foreground">{currentYear} Annual Business Impact Audit</p>
              <p className="text-muted-foreground mt-0.5">
                Annual impact reporting for this calendar year is open. Submit your verified metrics to display on your public profile.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-xl shrink-0">
            <Link to="/portal/impact">Submit {currentYear} Report</Link>
          </Button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MAIN WORKSPACE: FOCUSED TWO-COLUMN LAYOUT              */}
      {/* ========================================================= */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols desktop): Business & Talent Manager */}
        <div className="space-y-6 lg:col-span-8">
          {/* Business Profile Spotlight */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">My Business Profile</h2>
                <p className="text-xs text-muted-foreground">Your enterprise footprint in the WCBN Directory.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8">
                <Link to="/portal/business">Manage Profile</Link>
              </Button>
            </div>

            {primaryBusiness ? (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{primaryBusiness.display_name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {primaryBusiness.sector} · {[primaryBusiness.city, primaryBusiness.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <Badge
                    className={`text-[11px] capitalize rounded-full ${
                      primaryBusiness.is_active
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {primaryBusiness.is_active ? "Live in Directory" : "Under Vetting"}
                  </Badge>
                </div>

                {primaryBusiness.slug && (
                  <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-3">
                    <Link
                      to="/businesses/$slug"
                      params={{ slug: primaryBusiness.slug }}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>View Public Listing</span>
                    </Link>
                    <Link
                      to="/portal/jobs"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <Briefcase className="size-3.5" />
                      <span>{jobs.length} Job Postings</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs space-y-2">
                <Building2 className="mx-auto size-8 text-muted-foreground/60" />
                <p className="font-semibold text-foreground">No business profile registered yet.</p>
                <p className="text-muted-foreground">List your enterprise to appear in the WCBN member directory.</p>
                <Button asChild size="sm" className="mt-2 rounded-xl">
                  <Link to="/portal/business">Create Business Profile</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Active Job Postings */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">Hiring & Talent</h2>
                <p className="text-xs text-muted-foreground">Active career opportunities posted to the public careers board.</p>
              </div>
              <Button asChild size="sm" className="rounded-xl text-xs h-8 gap-1">
                <Link to="/portal/jobs">
                  <Plus className="size-3.5" />
                  <span>Post Role</span>
                </Link>
              </Button>
            </div>

            {activeJobs.length ? (
              <div className="divide-y divide-border/60">
                {activeJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <strong className="text-sm font-semibold text-foreground block truncate">{job.title}</strong>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {job.department || "General"} · {job.employment_type.replace("_", " ")} · {job.location_type.replace("_", " ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      Live
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No active job postings. Tap "Post Role" to recruit qualified talent across the WCBN network.
              </p>
            )}
          </div>
        </div>

        {/* Right Column (4 cols desktop): Gatherings & Invoices */}
        <div className="space-y-6 lg:col-span-4">
          {/* Upcoming Gatherings Widget */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                <span>Upcoming Gatherings</span>
              </h3>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary">
                <Link to="/portal/events">All</Link>
              </Button>
            </div>

            {eventsData && eventsData.length > 0 ? (
              <div className="space-y-3">
                {eventsData.map((e: any) => (
                  <div key={e.id} className="rounded-2xl border border-border/70 bg-muted/20 p-3.5 space-y-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        {e.event_format === "virtual" ? "Online Virtual Session" : "In-Person Gathering"}
                      </span>
                      <Link
                        to="/portal/events/$slug"
                        params={{ slug: e.slug }}
                        className="text-xs font-bold text-foreground hover:text-primary transition line-clamp-1 mt-0.5 block"
                      >
                        {e.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{eventDate(e)}</p>
                    </div>

                    {e.virtual_url && (
                      <Button
                        asChild
                        size="sm"
                        className="w-full h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shadow-xs"
                      >
                        <a href={e.virtual_url} target="_blank" rel="noreferrer">
                          <Video className="size-3.5" />
                          <span>Connect to Online Event</span>
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No upcoming gatherings announced.</p>
            )}
          </div>

          {/* Invoices & Dues Snapshot */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CircleDollarSign className="size-4 text-primary" />
                <span>Invoices & Fees</span>
              </h3>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary">
                <Link to="/portal/contributions">Ledger</Link>
              </Button>
            </div>

            {nextDue ? (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Next Due Invoice
                </span>
                <p className="text-xl font-extrabold text-foreground">
                  {money(Number(nextDue.amount) - Number(nextDue.paid_amount), nextDue.currency_code)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {nextDue.invoice_number} · Due {new Date(nextDue.due_date).toLocaleDateString()}
                </p>
                <Button asChild size="sm" className="w-full mt-2 rounded-xl text-xs h-8">
                  <Link to="/portal/contributions">Pay Invoice</Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center">
                All membership fees are up to date.
              </p>
            )}
          </div>

          {/* Covenant Charter Card */}
          <div className="rounded-3xl border border-border/80 bg-muted/30 p-5 space-y-2.5">
            <div className="flex items-center gap-2">
              <ScrollText className="size-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Covenant Charter</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your sworn commitment to Christian ethics, business stewardship, and social impact.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs h-8">
              <Link to="/portal/covenant">Read Covenant Charter</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
