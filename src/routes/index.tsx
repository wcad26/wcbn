import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Globe2, Handshake, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/wcbn/page-shell";
import { SectionHeading } from "@/components/wcbn/section-heading";
import { supabase } from "@/integrations/supabase/client";
import { eventDate, eventPlace, postDate, postTypeLabel } from "@/lib/wcbn-content";
import heroImage from "@/assets/wcbn-hero.jpg";
import enterpriseImage from "@/assets/wcbn-enterprise.jpg";
import leadershipImage from "@/assets/wcbn-leadership.jpg";
import impactImage from "@/assets/wcbn-impact.jpg";
import networkImage from "@/assets/wcbn-network.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "WCBN | Christian Business Leaders Creating Impact" },
    { name: "description", content: "World Changers Business Network connects Christian leaders building ethical enterprises and measurable global impact." },
    { property: "og:title", content: "World Changers Business Network" },
    { property: "og:description", content: "Faith, enterprise and influence mobilized for global transformation." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Index,
});

function Index() {
  const { data: stats } = useQuery({
    queryKey: ["public", "stats"],
    queryFn: async () => {
      const [businesses, members, reviews] = await Promise.all([
        supabase.from("wcbn_businesses").select("id, country, sector, slug, display_name, summary, cover_url, is_featured").eq("is_active", true).eq("vetting_status", "approved"),
        supabase.from("wcbn_members").select("id").eq("status", "active"),
        supabase.from("wcbn_annual_reviews").select("jobs_created, people_trained"),
      ]);
      const list = businesses.data ?? [];
      return {
        businesses: list,
        countries: new Set(list.map((b) => b.country)).size,
        members: members.data?.length ?? 0,
        jobs: (reviews.data ?? []).reduce((s, r) => s + r.jobs_created, 0),
        trained: (reviews.data ?? []).reduce((s, r) => s + r.people_trained, 0),
      };
    },
  });

  const featured = (stats?.businesses ?? []).slice(0, 3);

  const { data: feed } = useQuery({
    queryKey: ["public", "home-feed"],
    queryFn: async () => {
      const [events, posts] = await Promise.all([
        supabase.from("wcbn_events").select("id, title, slug, summary, image_url, category, start_datetime, end_datetime, venue_name, city, country")
          .eq("status", "published").eq("audience", "public").gte("start_datetime", new Date().toISOString()).order("start_datetime").limit(3),
        supabase.from("wcbn_posts").select("id, title, slug, summary, image_url, post_type, published_at, created_at")
          .eq("status", "published").eq("audience", "public").order("is_pinned", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false }).limit(3),
      ]);
      return { events: events.data ?? [], posts: posts.data ?? [] };
    },
  });

  return (
    <PageShell><main>
      <section className="relative flex min-h-[92svh] items-end overflow-hidden pt-20">
        <img src={heroImage} width={1920} height={1080} alt="African business leaders gathered in a modern executive setting" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(276_40%_12%)_0%,hsl(276_40%_12%_/_0.85)_40%,hsl(276_40%_12%_/_0.25)_75%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-32 lg:px-8 lg:pb-24">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground backdrop-blur"><Sparkles className="size-4" />Faith · Enterprise · Impact</p>
            <h1 className="text-5xl font-bold leading-[1.05] text-primary-foreground md:text-7xl">Building enterprises that change the world.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-primary-foreground/80 md:text-lg">A selective community of Christian business leaders mobilizing enterprise, influence and stewardship for measurable transformation.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/membership">Explore membership <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/35 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"><Link to="/businesses">Discover businesses</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="gradient-brand text-primary-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
          <Stat number={String(stats?.members ?? 0)} label="Active members" />
          <Stat number={String(stats?.countries ?? 0)} label="Countries represented" />
          <Stat number={String(stats?.businesses.length ?? 0)} label="Vetted enterprises" />
          <Stat number={String(stats?.jobs ?? 0)} label="Jobs reported" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
        <SectionHeading eyebrow="Our mandate" title="More than a network. A force for transformation." copy="WCBN identifies, connects, equips and mobilizes leaders whose enterprises create enduring economic, social and spiritual impact." />
        <div className="mt-14 grid gap-5 md:grid-cols-4">
          {[["01", "WIN", "Rooted in the WCA family and a shared Christian mission."], ["02", "BUILD", "Strengthening character, capacity and sustainable enterprise."], ["03", "TRANSFORM", "Developing leaders who create opportunity for others."], ["04", "IMPACT", "Measuring change across communities and nations."]].map(([n, t, c]) => (
            <div className="rounded-3xl border border-border bg-card p-7 shadow-card" key={n}>
              <span className="text-sm font-bold text-gradient-brand">{n}</span>
              <h3 className="mt-8 text-2xl font-bold">{t}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{c}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading light eyebrow="A credible business community" title="Trust is earned. Impact is measured." copy="Every member passes a rigorous, values-led validation grounded in active WCA and Destiny Care Group (DCG) membership, Christian character, business integrity and measurable impact." />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <Feature image={enterpriseImage} icon={<Building2 />} title="Vetted businesses" copy="Discover enterprises reviewed for legitimacy, integrity and excellence." />
            <Feature image={impactImage} icon={<Globe2 />} title="Global impact" copy="See how members advance practical outcomes aligned to the SDGs." />
            <Feature image={leadershipImage} icon={<Handshake />} title="Purposeful connection" copy="Build partnerships among leaders committed to contribution, not just access." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid items-end gap-10 border-b border-border pb-12 md:grid-cols-[1fr_auto]">
          <SectionHeading eyebrow="The network" title="Find trusted businesses changing their industries." />
          <Button asChild variant="outline"><Link to="/businesses">View business catalog <ArrowRight /></Link></Button>
        </div>
        {featured.length ? (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {featured.map((b) => (
              <Link key={b.id} to="/businesses/$slug" params={{ slug: b.slug }} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1">
                <div className="aspect-[16/9] overflow-hidden bg-secondary">{b.cover_url ? <img src={b.cover_url} alt={`${b.display_name}`} className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /> : <div className="size-full gradient-brand opacity-80" />}</div>
                <div className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{b.sector}</p><h3 className="mt-2 text-xl font-bold">{b.display_name}</h3><p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{b.summary}</p></div>
              </Link>
            ))}
          </div>
        ) : <p className="py-16 text-center text-muted-foreground">Approved businesses will appear here as WCBN leadership activates them.</p>}
      </section>

      {(feed?.events.length || feed?.posts.length) ? (
        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-2">
            {feed?.events.length ? (
              <div>
                <div className="flex items-end justify-between gap-4 border-b border-border pb-6">
                  <SectionHeading eyebrow="Diary" title="Upcoming events" />
                  <Button asChild variant="outline"><Link to="/events">All events <ArrowRight /></Link></Button>
                </div>
                <ul className="mt-8 space-y-4">
                  {feed.events.map((e) => (
                    <li key={e.id}>
                      <Link to="/events/$slug" params={{ slug: e.slug }} className="flex gap-4 rounded-2xl border border-border p-4 transition hover:bg-muted">
                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-secondary">
                          {e.image_url ? <img src={e.image_url} alt="" loading="lazy" className="size-full object-cover" /> : <div className="size-full gradient-brand opacity-80" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{e.category}</p>
                          <h3 className="mt-1 font-bold leading-snug">{e.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{eventDate(e)} · {eventPlace(e)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {feed?.posts.length ? (
              <div>
                <div className="flex items-end justify-between gap-4 border-b border-border pb-6">
                  <SectionHeading eyebrow="Newsroom" title="Latest news" />
                  <Button asChild variant="outline"><Link to="/news">All news <ArrowRight /></Link></Button>
                </div>
                <ul className="mt-8 space-y-4">
                  {feed.posts.map((p) => (
                    <li key={p.id}>
                      <Link to="/news/$slug" params={{ slug: p.slug }} className="flex gap-4 rounded-2xl border border-border p-4 transition hover:bg-muted">
                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-secondary">
                          {p.image_url ? <img src={p.image_url} alt="" loading="lazy" className="size-full object-cover" /> : <div className="size-full gradient-brand opacity-80" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{postTypeLabel(p.post_type)}</p>
                          <h3 className="mt-1 font-bold leading-snug">{p.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{postDate(p)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}


      <section className="relative overflow-hidden">
        <img src={networkImage} alt="World Changers members networking at a business gathering" className="absolute inset-0 size-full object-cover" loading="lazy" />
        <div className="absolute inset-0 gradient-brand opacity-90" />
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center text-primary-foreground lg:px-8">
          <h2 className="text-4xl font-bold md:text-5xl">Already a World Changers Association member?</h2>
          <p className="mt-5 text-primary-foreground/85">You do not create a new account. Sign in with the credentials you already have and your membership, region and Destiny Care Group (DCG) are verified for you.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary"><Link to="/auth">Member sign in</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"><Link to="/membership">How membership works</Link></Button>
          </div>
        </div>
      </section>
    </main></PageShell>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return <div className="border-r border-primary-foreground/15 px-5 py-10 text-center"><strong className="block text-3xl font-bold md:text-4xl">{number}</strong><span className="mt-2 block text-xs uppercase tracking-[0.12em] text-primary-foreground/70">{label}</span></div>;
}

function Feature({ icon, title, copy, image }: { icon: ReactNode; title: string; copy: string; image: string }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-primary-foreground/15 bg-primary-foreground/5 text-primary-foreground">
      <img src={image} alt={title} className="h-44 w-full object-cover" loading="lazy" />
      <div className="p-7">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary-foreground/15">{icon}</span>
        <h3 className="mt-6 text-xl font-bold">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-primary-foreground/70">{copy}</p>
      </div>
    </article>
  );
}
