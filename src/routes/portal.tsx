import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck, Briefcase, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, CircleDollarSign,
  ExternalLink, Globe2, Receipt, ScrollText, Target, TriangleAlert, UserRound, Users,
} from "lucide-react";
import { MemberPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { money, useIdentity } from "@/lib/wcbn";
import { eventDate, eventPlace, postDate, postTypeLabel } from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal")({ component: PortalHome });

type Invoice = { id: string; invoice_number: string; amount: number; paid_amount: number; currency_code: string; status: string; due_date: string; wcbn_payments: Payment[] | null };
type Payment = { id: string; amount: number; status: string; method: string | null; reference: string | null; paid_at: string | null; created_at: string };
type Business = { id: string; display_name: string; slug: string | null; sector: string; city: string | null; country: string; vetting_status: string; is_active: boolean };
type Review = { id: string; review_year: number; status: string; jobs_created: number | null; people_trained: number | null; businesses_supported: number | null };

function PortalHome() {
  const { data: identity } = useIdentity();
  const wcbnId = identity?.wcbnMember?.id;
  const year = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "overview", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const [invoices, businesses, commitment, reviews, network, catalog, networkImpact] = await Promise.all([
        supabase.from("wcbn_invoices").select("id, invoice_number, amount, paid_amount, currency_code, status, due_date, wcbn_payments(id, amount, status, method, reference, paid_at, created_at)").eq("wcbn_member_id", wcbnId!).order("due_date", { ascending: false }),
        supabase.from("wcbn_businesses").select("id, display_name, slug, sector, city, country, vetting_status, is_active").eq("owner_member_id", wcbnId!).order("created_at"),
        supabase.from("wcbn_impact_commitments").select("id, statement, target_year, sdg_numbers, measures").eq("wcbn_member_id", wcbnId!).maybeSingle(),
        supabase.from("wcbn_annual_reviews").select("id, review_year, status, jobs_created, people_trained, businesses_supported").eq("wcbn_member_id", wcbnId!).order("review_year", { ascending: false }),
        supabase.from("wcbn_members").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("wcbn_businesses").select("id", { count: "exact", head: true }).eq("is_active", true).eq("vetting_status", "approved"),
        supabase.from("wcbn_annual_reviews").select("jobs_created, people_trained"),
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
      };
    },
  });

  const { data: feed } = useQuery({
    queryKey: ["portal", "overview-feed"],
    queryFn: async () => {
      const [events, posts] = await Promise.all([
        supabase.from("wcbn_events").select("id, title, slug, start_datetime, end_datetime, venue_name, city, country")
          .eq("status", "published").gte("start_datetime", new Date().toISOString()).order("start_datetime").limit(2),
        supabase.from("wcbn_posts").select("id, title, slug, post_type, published_at, created_at")
          .eq("status", "published").order("is_pinned", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false }).limit(3),
      ]);
      return { events: events.data ?? [], posts: posts.data ?? [] };
    },
  });

  const invoices = data?.invoices ?? [];
  const businesses = data?.businesses ?? [];
  const reviews = data?.reviews ?? [];
  const currency = invoices[0]?.currency_code ?? "XAF";
  const today = new Date().toISOString().slice(0, 10);

  const outstanding = invoices.reduce((s, i) => s + Math.max(0, Number(i.amount) - Number(i.paid_amount)), 0);
  const overdue = invoices.filter((i) => Number(i.amount) - Number(i.paid_amount) > 0 && i.due_date < today);
  const nextDue = invoices.filter((i) => Number(i.amount) - Number(i.paid_amount) > 0 && i.due_date >= today).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const payments = invoices.flatMap((i) => (i.wcbn_payments ?? []).map((p) => ({ ...p, invoice_number: i.invoice_number, currency_code: i.currency_code })))
    .sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at));
  const confirmedThisYear = payments.filter((p) => p.status === "confirmed" && (p.paid_at ?? p.created_at).startsWith(String(year))).reduce((s, p) => s + Number(p.amount), 0);

  const live = businesses.filter((b) => b.is_active).length;
  const jobs = reviews.reduce((s, r) => s + Number(r.jobs_created ?? 0), 0);
  const trained = reviews.reduce((s, r) => s + Number(r.people_trained ?? 0), 0);
  const latestReview = reviews[0] ?? null;
  const thisYearReview = reviews.find((r) => r.review_year === year) ?? null;

  const covenantOk = !!identity?.wcbnMember?.covenant_accepted_at;
  const duesOk = outstanding === 0;
  const goodStanding = covenantOk && overdue.length === 0;

  const checklist = [
    { ok: covenantOk, label: "Covenant accepted", to: "/portal/covenant" as const, action: "Accept the covenant" },
    { ok: live > 0, label: "Business live in the catalog", to: "/portal/business" as const, action: "Complete your business profile" },
    { ok: !!data?.commitment, label: "Impact commitment on file", to: "/portal/impact" as const, action: "Record your impact commitment" },
    { ok: duesOk, label: "Dues up to date", to: "/portal/contributions" as const, action: "Settle your outstanding dues" },
    { ok: !!thisYearReview, label: `${year} annual review submitted`, to: "/portal/impact" as const, action: "Submit this year's review" },
  ];

  if (isLoading) {
    return (
      <MemberPage title={`Welcome, ${identity?.fullName ?? "member"}`} description="Your WCBN membership at a glance.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3"><Skeleton className="h-96 rounded-3xl lg:col-span-2" /><Skeleton className="h-96 rounded-3xl" /></div>
      </MemberPage>
    );
  }

  return (
    <MemberPage title={`Welcome, ${identity?.fullName ?? "member"}`} description="Your standing in the World Changers Business Network: contributions, listings, impact and what needs your attention.">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><BadgeCheck className="size-3.5" />{identity?.wcbnMember?.category ?? "Member"}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${goodStanding ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
          {goodStanding ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}{goodStanding ? "Good standing" : "Attention needed"}
        </span>
        {identity?.wcbnMember?.inducted_at && <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"><CalendarDays className="size-3.5" />Member since {new Date(identity.wcbnMember.inducted_at).toLocaleDateString()}</span>}
        {identity?.wcbnMember?.next_review_date && <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"><ScrollText className="size-3.5" />Next review {new Date(identity.wcbnMember.next_review_date).toLocaleDateString()}</span>}
        {!covenantOk && <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/portal/covenant">Accept the covenant</Link></Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Membership standing" value={goodStanding ? "Good standing" : "Attention needed"} detail={`${identity?.wcbnMember?.category ?? "Member"} · ${identity?.regionName ?? "WCBN"}`} icon={BadgeCheck} />
        <MetricCard label={`Contributed in ${year}`} value={money(confirmedThisYear, currency)} detail={outstanding > 0 ? `${money(outstanding, currency)} still outstanding` : "No outstanding balance"} icon={CircleDollarSign} tone="accent" />
        <MetricCard label="Business listings" value={businesses.length} detail={`${live} live in the public catalog`} icon={BriefcaseBusiness} />
        <MetricCard label="Impact delivered" value={jobs} detail={`${jobs} job(s) created · ${trained} people trained`} icon={Target} tone="secondary" />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Dues & payments</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your contribution schedule and the latest payments on record.</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/portal/contributions"><Receipt className="size-4" />Go to contributions</Link></Button>
            </div>

            {overdue.length > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />{overdue.length} invoice(s) past due — {money(overdue.reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount)), 0), currency)} outstanding.
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-border p-4">
              {nextDue ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Next payment due</p>
                    <p className="mt-1 text-2xl font-bold">{money(Number(nextDue.amount) - Number(nextDue.paid_amount), nextDue.currency_code)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{nextDue.invoice_number} · due {new Date(nextDue.due_date).toLocaleDateString()}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{invoices.length ? "Nothing due right now — your dues are settled." : "No invoices have been issued to you yet."}</p>
              )}
            </div>

            <h3 className="mt-6 text-sm font-semibold">Recent payments</h3>
            {payments.length ? (
              <ul className="mt-3 space-y-2">
                {payments.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm">
                    <span className="font-medium">{money(Number(p.amount), p.currency_code)} <span className="font-normal text-muted-foreground">· {p.invoice_number}</span></span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "confirmed" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{p.status === "confirmed" ? "Confirmed" : "Awaiting confirmation"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No payments recorded yet. Declare a payment from the contributions page.</p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">My businesses</h2>
                <p className="mt-1 text-sm text-muted-foreground">Listings you own and their state in the public catalog.</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/portal/business"><Building2 className="size-4" />Manage listings</Link></Button>
            </div>
            {businesses.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {businesses.map((b) => (
                  <article key={b.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{b.display_name}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.is_active ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : b.vetting_status === "approved" ? "bg-primary/12 text-primary" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                        {b.is_active ? "Live" : b.vetting_status === "approved" ? "Approved" : "Under vetting"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{b.sector} · {[b.city, b.country].filter(Boolean).join(", ")}</p>
                    {b.is_active && b.slug && (
                      <Link to="/businesses/$slug" params={{ slug: b.slug }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                        <ExternalLink className="size-3.5" />View public page
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">You have not published a business profile yet.</p>
                <Button asChild className="mt-4"><Link to="/portal/business"><Briefcase className="size-4" />Create my business profile</Link></Button>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Impact snapshot</h2>
                <p className="mt-1 text-sm text-muted-foreground">{data?.commitment?.statement ?? "No impact commitment recorded yet."}</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/portal/impact"><Target className="size-4" />Impact & reviews</Link></Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Jobs created" value={latestReview?.jobs_created ?? 0} />
              <Stat label="People trained" value={latestReview?.people_trained ?? 0} />
              <Stat label="Businesses supported" value={latestReview?.businesses_supported ?? 0} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {thisYearReview ? `Your ${year} annual review is ${thisYearReview.status}.` : latestReview ? `Latest figures are from ${latestReview.review_year}. Your ${year} review has not been submitted.` : "Submit your first annual review to report your impact."}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Membership checklist</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  {item.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />}
                  <span>
                    <span className="font-medium">{item.label}</span>
                    {!item.ok && <Link to={item.to} className="block text-xs font-semibold text-primary hover:underline">{item.action}</Link>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Network pulse</h2>
            <p className="mt-1 text-sm text-muted-foreground">The network you belong to, right now.</p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <Pulse icon={Users} label="Active members" value={data?.networkMembers ?? 0} />
              <Pulse icon={Globe2} label="Live businesses" value={data?.networkBusinesses ?? 0} />
              <Pulse icon={Briefcase} label="Jobs created" value={data?.networkJobs ?? 0} />
              <Pulse icon={Target} label="People trained" value={data?.networkTrained ?? 0} />
            </dl>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Upcoming events</h2>
              <Button asChild variant="ghost" size="sm"><Link to="/portal/events">All events</Link></Button>
            </div>
            {feed?.events.length ? (
              <ul className="mt-3 space-y-2">
                {feed.events.map((e) => (
                  <li key={e.id}>
                    <Link to="/portal/events/$slug" params={{ slug: e.slug }} className="block rounded-xl border border-border px-4 py-3 text-sm transition hover:bg-muted">
                      <span className="font-medium">{e.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{eventDate(e)} · {eventPlace(e)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted-foreground">No events scheduled right now.</p>}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Latest announcements</h2>
              <Button asChild variant="ghost" size="sm"><Link to="/portal/news">All news</Link></Button>
            </div>
            {feed?.posts.length ? (
              <ul className="mt-3 space-y-2">
                {feed.posts.map((p) => (
                  <li key={p.id}>
                    <Link to="/portal/news/$slug" params={{ slug: p.slug }} className="block rounded-xl border border-border px-4 py-3 text-sm transition hover:bg-muted">
                      <span className="font-medium">{p.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{postTypeLabel(p.post_type)} · {postDate(p)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted-foreground">No announcements yet.</p>}
          </div>


          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/contributions"><CircleDollarSign />Declare a payment</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/business"><BriefcaseBusiness />Update my business</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/impact"><Target />Submit annual review</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/covenant"><ScrollText />View the covenant</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link to="/portal/profile"><UserRound />My profile</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </MemberPage>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Pulse({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <Icon className="size-4 text-primary" />
      <dd className="mt-2 text-xl font-bold">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}
