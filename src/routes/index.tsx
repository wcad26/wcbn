import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Globe2, Handshake, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/wcbn/page-shell";
import { SectionHeading } from "@/components/wcbn/section-heading";
import heroImage from "@/assets/wcbn-hero.jpg";

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

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return <PageShell><main>
    <section className="relative flex min-h-[92svh] items-end overflow-hidden pt-20">
      <img src={heroImage} width={1920} height={1080} alt="African business leaders gathered in a modern executive setting" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--ink)_0%,color-mix(in_oklab,var(--ink)_88%,transparent)_38%,color-mix(in_oklab,var(--ink)_20%,transparent)_72%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-32 lg:px-8 lg:pb-20"><div className="max-w-3xl"><p className="mb-5 inline-flex items-center gap-2 border-l-2 border-gold pl-3 text-xs font-bold uppercase tracking-[0.18em] text-gold"><Sparkles className="size-4" />Faith · Enterprise · Impact</p><h1 className="font-display text-5xl font-bold leading-[1.03] text-primary-foreground md:text-7xl lg:text-8xl">Building enterprises that change the world.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-primary-foreground/75 md:text-lg">A selective community of Christian business leaders mobilizing enterprise, influence and stewardship for measurable transformation.</p><div className="mt-9 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/membership">Explore membership <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline" className="border-primary-foreground/35 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"><Link to="/businesses">Discover businesses</Link></Button></div></div></div>
    </section>
    <section className="border-b border-border bg-primary text-primary-foreground"><div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4"><Stat number="500+" label="Business leaders" /><Stat number="12" label="Countries represented" /><Stat number="430" label="Vetted enterprises" /><Stat number="13" label="SDGs advanced" /></div></section>
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32"><SectionHeading eyebrow="Our mandate" title="More than a network. A force for transformation." copy="WCBN identifies, connects, equips and mobilizes leaders whose enterprises create enduring economic, social and spiritual impact." /><div className="mt-14 grid gap-px overflow-hidden rounded-md bg-border md:grid-cols-4">{[["01","WIN","Rooted in the WCA family and a shared Christian mission."],["02","BUILD","Strengthening character, capacity and sustainable enterprise."],["03","TRANSFORM","Developing leaders who create opportunity for others."],["04","IMPACT","Measuring change across communities and nations."]].map(([n,t,c])=><div className="bg-background p-7" key={n}><span className="font-display text-sm text-gold">{n}</span><h3 className="mt-8 font-display text-2xl font-bold">{t}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{c}</p></div>)}</div></section>
    <section className="bg-ink py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><SectionHeading light eyebrow="A credible business community" title="Trust is earned. Impact is measured." copy="Every member passes a rigorous, values-led validation process grounded in active WCA and DCG membership, Christian character, business integrity and measurable impact." /><div className="mt-14 grid gap-5 md:grid-cols-3"><Feature icon={<Building2 />} title="Vetted businesses" copy="Discover enterprises reviewed for legitimacy, integrity and excellence."/><Feature icon={<Globe2 />} title="Global impact" copy="See how members advance practical outcomes aligned to the SDGs."/><Feature icon={<Handshake />} title="Purposeful connection" copy="Build partnerships among leaders committed to contribution, not just access."/></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="grid items-end gap-10 border-b border-border pb-12 md:grid-cols-[1fr_auto]"><SectionHeading eyebrow="The network" title="Find trusted businesses changing their industries."/><Button asChild variant="outline"><Link to="/businesses">View business catalog <ArrowRight /></Link></Button></div><div className="py-16 text-center"><p className="text-muted-foreground">Approved businesses will appear here as WCBN leadership activates them.</p></div></section>
  </main></PageShell>;
}

function Stat({ number, label }: { number: string; label: string }) { return <div className="border-r border-primary-foreground/15 px-5 py-8 text-center"><strong className="block font-display text-3xl md:text-4xl">{number}</strong><span className="mt-2 block text-xs uppercase tracking-[0.12em] text-primary-foreground/60">{label}</span></div>; }
function Feature({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) { return <article className="border border-primary-foreground/15 p-7 text-primary-foreground"><span className="grid size-11 place-items-center rounded-md bg-gold text-ink">{icon}</span><h3 className="mt-8 font-display text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-primary-foreground/60">{copy}</p></article>; }
