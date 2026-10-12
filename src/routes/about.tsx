import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Briefcase, HeartHandshake, ShieldCheck, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/wcbn/public-page";
import { supabase } from "@/integrations/supabase/client";
import leadershipImage from "@/assets/wcbn-leadership.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About WCBN & Our Impact | World Changers Business Network" },
    { name: "description", content: "WCBN mobilizes Christian entrepreneurs and professionals for measurable economic, social and spiritual impact." },
    { property: "og:title", content: "About WCBN & Our Impact" },
    { property: "og:description", content: "Faith, character, enterprise and measurable impact in one network." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: About,
});

const pillars = [
  { icon: HeartHandshake, t: "WIN", c: "Rooted in the WCA family and a shared Christian mission." },
  { icon: Briefcase, t: "BUILD", c: "Strengthening character, capacity and sustainable enterprise." },
  { icon: Users, t: "TRANSFORM", c: "Developing leaders who create opportunity for others." },
  { icon: Target, t: "IMPACT", c: "Measuring change across communities and nations." },
];

const eligibility = [
  ["Active WCA membership", "Verified automatically from your WCA account — no new sign-up."],
  ["Active Destiny Care Group (DCG)", "Every member is rooted in an active DCG."],
  ["Covenant acceptance", "Members commit to the WCBN covenant of integrity and stewardship."],
];

function About() {
  const { data } = useQuery({
    queryKey: ["public", "impact"],
    queryFn: async () => {
      const [m, b, r] = await Promise.all([
        supabase.from("wcbn_members").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("wcbn_businesses").select("id", { count: "exact", head: true }).eq("is_active", true).eq("vetting_status", "approved"),
        supabase.from("wcbn_annual_reviews").select("jobs_created, people_trained"),
      ]);
      const rows = r.data ?? [];
      return {
        members: m.count ?? 0,
        listings: b.count ?? 0,
        jobs: rows.reduce((s, x) => s + (x.jobs_created ?? 0), 0),
        trained: rows.reduce((s, x) => s + (x.people_trained ?? 0), 0),
      };
    },
  });

  const stats: [number, string][] = [
    [data?.members ?? 0, "Active members"],
    [data?.listings ?? 0, "Vetted listings"],
    [data?.jobs ?? 0, "Jobs reported"],
    [data?.trained ?? 0, "People trained"],
  ];

  return (
    <PublicPage eyebrow="About WCBN" title="The marketplace expression of the WCA mandate." intro="WCBN brings together Christian entrepreneurs and professionals whose work advances spiritual, intellectual and economic transformation." image={leadershipImage}>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 lg:px-8">
        <h2 className="text-3xl font-bold md:text-4xl">WCA foundation. Marketplace expression.</h2>
        <div className="space-y-5 leading-8 text-muted-foreground">
          <p>World Changers Association provides the spiritual and leadership foundation. WCBN channels it into ethical enterprise, professional excellence and public impact.</p>
          <p>We are not simply a referral club. We are a selective network built on faith, character, capacity, leadership and measurable contribution.</p>
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Our pillars</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {pillars.map(({ icon: Icon, t, c }) => (
              <article key={t} className="rounded-3xl border border-border bg-card p-7 shadow-card">
                <span className="grid size-11 place-items-center rounded-2xl gradient-brand text-primary-foreground"><Icon className="size-5" /></span>
                <h3 className="mt-6 text-xl font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{c}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Who can join</p>
        <h2 className="mt-3 text-3xl font-bold">Membership rests on three foundations.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {eligibility.map(([t, c]) => (
            <div key={t} className="rounded-3xl border border-border bg-card p-7">
              <BadgeCheck className="text-accent" />
              <h3 className="mt-4 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{c}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Membership is confirmed once the first fee payment is received.</p>
      </section>

      <section id="impact" className="scroll-mt-24 bg-ink py-20 text-ink-foreground">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Impact</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold md:text-4xl">What gets measured can transform.</h2>
          <p className="mt-4 max-w-2xl leading-7 text-ink-foreground/70">Every member makes an impact commitment aligned to the Sustainable Development Goals and reports progress each year.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(([n, l]) => (
              <div key={l} className="rounded-3xl border border-ink-foreground/10 bg-ink-foreground/5 p-7">
                <strong className="text-4xl font-bold text-accent">{n.toLocaleString()}</strong>
                <p className="mt-2 text-sm text-ink-foreground/65">{l}</p>
              </div>
            ))}
          </div>
          <Button asChild size="lg" className="mt-10 rounded-full gradient-brand"><Link to="/membership">Explore membership <ArrowRight /></Link></Button>
        </div>
      </section>
    </PublicPage>
  );
}
