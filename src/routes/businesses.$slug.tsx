import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Mail, MapPin, Phone, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/wcbn/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { SDGS } from "@/lib/wcbn";

export const Route = createFileRoute("/businesses/$slug")({
  head: () => ({ meta: [
    { title: "Business profile | WCBN" },
    { name: "description", content: "A vetted enterprise in the World Changers Business Network: story, sectors, markets and SDG contributions." },
    { property: "og:title", content: "WCBN business profile" },
    { property: "og:description", content: "A vetted enterprise in the World Changers Business Network." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: BusinessDetail,
});

function BusinessDetail() {
  const { slug } = Route.useParams();
  const { data: item, isLoading } = useQuery({
    queryKey: ["public", "business", slug],
    queryFn: async () => (await supabase
      .from("wcbn_businesses")
      .select("*, wcbn_business_sdgs(sdg_number, contribution)")
      .eq("slug", slug).eq("is_active", true).eq("vetting_status", "approved").maybeSingle()).data,
  });

  const { data: related = [] } = useQuery({
    queryKey: ["public", "related", item?.sector, item?.id],
    enabled: !!item,
    queryFn: async () => (await supabase.from("wcbn_businesses").select("id, slug, display_name, sector, country")
      .eq("is_active", true).eq("vetting_status", "approved").eq("sector", item!.sector).neq("id", item!.id).limit(3)).data ?? [],
  });

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["public", "business-impact", item?.owner_member_id],
    enabled: !!item?.owner_member_id,
    queryFn: async () => (await supabase
      .from("wcbn_annual_reviews")
      .select("review_year, jobs_created, people_trained, businesses_supported, community_initiatives, achievements")
      .eq("wcbn_member_id", item!.owner_member_id)
      .eq("status", "approved")
      .order("review_year", { ascending: false })).data ?? [],
  });

  const { data: businessJobs = [] } = useQuery({
    queryKey: ["public", "business-jobs", item?.id],
    enabled: !!item?.id,
    queryFn: async () => (await supabase
      .from("wcbn_jobs")
      .select("id, title, slug, employment_type, location_type, city, country, salary_min, salary_max, currency_code, deadline")
      .eq("business_id", item!.id)
      .eq("status", "published")).data ?? [],
  });

  if (isLoading) return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Loading business…</div>;

  if (!item) return (
    <PageShell><main className="grid min-h-[80vh] place-items-center pt-20">
      <div className="text-center"><h1 className="text-4xl font-bold">Business not found</h1>
        <Button asChild className="mt-6"><Link to="/businesses">Return to catalog</Link></Button></div>
    </main></PageShell>
  );

  const sdgs = (item.wcbn_business_sdgs as { sdg_number: number; contribution: string | null }[] | null) ?? [];

  return (
    <PageShell>
      <main className="pt-20">
        <div className="relative overflow-hidden bg-ink">
          {item.cover_url && <img src={item.cover_url} alt={`${item.display_name} cover`} className="absolute inset-0 size-full object-cover opacity-30" />}
          <div className="absolute inset-0 gradient-brand opacity-70" />
          <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8">
            <Link to="/businesses" className="inline-flex items-center gap-2 text-sm text-primary-foreground/75"><ArrowLeft className="size-4" />Business catalog</Link>
            <div className="grid items-end gap-8 py-16 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground/80">{item.sector}</p>
                <h1 className="mt-4 text-4xl font-bold text-primary-foreground md:text-6xl">{item.display_name}</h1>
                <p className="mt-5 flex items-center gap-2 text-primary-foreground/75"><MapPin className="size-4" />{item.city ? `${item.city}, ` : ""}{item.country}</p>
              </div>
              {item.website_url && <Button asChild size="lg" variant="secondary"><a href={item.website_url} target="_blank" rel="noreferrer">Visit website <ExternalLink /></a></Button>}
            </div>
          </div>
        </div>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[2fr_1fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold">About the business</h2>
            <p className="mt-5 whitespace-pre-line leading-8 text-muted-foreground">{item.description || item.summary || "This member has not published a full description yet."}</p>
            {sdgs.length > 0 && (
              <>
                <h3 className="mt-12 text-xl font-bold">Impact and SDG contributions</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {sdgs.map((s) => <span key={s.sdg_number} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{s.sdg_number}. {SDGS[s.sdg_number - 1]}</span>)}
                </div>
              </>
            )}

            {approvedReviews.length > 0 && (
              <div className="mt-12 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-4">
                  <h3 className="text-xl font-bold text-foreground">Verified Annual Impact</h3>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Verified by WCBN Leadership
                  </span>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {approvedReviews.reduce((s, r) => s + Number(r.jobs_created || 0), 0)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Jobs Created</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {approvedReviews.reduce((s, r) => s + Number(r.people_trained || 0), 0)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">People Trained</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {approvedReviews.reduce((s, r) => s + Number(r.community_initiatives || 0), 0)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Community Initiatives</p>
                  </div>
                </div>
                {approvedReviews[0]?.achievements && (
                  <div className="mt-5 rounded-2xl bg-card p-4 border border-border text-sm">
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                      Latest Annual Milestones ({approvedReviews[0].review_year})
                    </p>
                    <p className="mt-2 text-foreground/85 leading-relaxed">{approvedReviews[0].achievements}</p>
                  </div>
                )}
              </div>
            )}

            {businessJobs.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold">Open Career Opportunities ({businessJobs.length})</h3>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/jobs">All network jobs</Link>
                  </Button>
                </div>
                <div className="mt-4 grid gap-3">
                  {businessJobs.map((job) => (
                    <div key={job.id} className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                      <div>
                        <h4 className="font-semibold text-base">{job.title}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[job.employment_type?.replace("_", " "), job.location_type, job.city, job.country].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Button asChild size="sm">
                        <Link to="/jobs/$slug" params={{ slug: job.slug }}>View & Apply</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {related.length > 0 && (
              <>
                <h3 className="mt-12 text-xl font-bold">Related businesses</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {related.map((r) => (
                    <Link key={r.id} to="/businesses/$slug" params={{ slug: r.slug }} className="rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5">
                      <p className="font-semibold">{r.display_name}</p><p className="text-xs text-muted-foreground">{r.country}</p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-card">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">WCBN status</p>
            <p className="mt-2 font-semibold text-primary">Vetted and active</p>
            {item.years_operating && <><p className="mt-6 text-xs uppercase tracking-[0.12em] text-muted-foreground">Years operating</p><p className="mt-1 font-semibold">{item.years_operating}</p></>}
            {item.employee_count && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Users className="size-4" />{item.employee_count} people</p>}
            {item.email && <p className="mt-4 flex items-center gap-2 break-all text-sm text-muted-foreground"><Mail className="size-4" />{item.email}</p>}
            {item.phone && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4" />{item.phone}</p>}
          </aside>
        </section>
      </main>
    </PageShell>
  );
}
