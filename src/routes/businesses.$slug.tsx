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
