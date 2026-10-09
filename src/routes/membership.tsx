import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/wcbn/public-page";
import { fetchCategories } from "@/lib/fees";
import { money } from "@/lib/wcbn";

const pillars = [
  "WCA & DCG alignment",
  "Christian character",
  "Business capacity",
  "Leadership & influence",
  "Global impact",
  "SDG alignment",
];

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "WCBN Membership | Selective Christian Business Network" },
      { name: "description", content: "Explore WCBN eligibility, validation criteria, membership categories, regional fees and covenant." },
      { property: "og:title", content: "WCBN Membership" },
      { property: "og:description", content: "A rigorous pathway for WCA members and DCG participants creating measurable impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Membership,
});

function Membership() {
  const { data: categories = [] } = useQuery({
    queryKey: ["public", "categories"],
    queryFn: () => fetchCategories(false),
  });

  return (
    <PublicPage
      eyebrow="Membership"
      title="Belonging begins with alignment."
      intro="WCA membership and active DCG participation establish eligibility. Character, capacity, leadership and measurable impact earn selection."
    >
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        {/* Core Pillars */}
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Core Selection Pillars</h2>
        <p className="mt-2 text-muted-foreground text-sm">Every applicant is vetted against our shared spiritual, professional, and economic benchmarks.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p, i) => (
            <article key={p} className="border border-border bg-card p-7 rounded-2xl">
              <span className="text-sm font-semibold text-primary">0{i + 1}</span>
              <h3 className="mt-4 text-xl font-bold">{p}</h3>
              <CheckCircle2 className="mt-5 text-primary size-5" />
            </article>
          ))}
        </div>

        {/* Dynamic Membership Categories Section */}
        <div className="mt-20">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Membership Categories & Regional Fees</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Tailored tiers designed to accelerate emerging entrepreneurs, established enterprises, diaspora professionals, and strategic mentors.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => {
              const primaryFee = c.fees?.["XAF"] ? money(Number(c.fees["XAF"]), "XAF") : c.fees?.["USD"] ? money(Number(c.fees["USD"]), "USD") : null;
              const secondaryFee = c.fees?.["USD"] && c.fees?.["XAF"] ? `${money(Number(c.fees["USD"]), "USD")}` : c.fees?.["EUR"] ? `${money(Number(c.fees["EUR"]), "EUR")}` : null;

              return (
                <div key={c.id} className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition">
                  <div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary uppercase">
                      {c.applicant_type}
                    </span>
                    <h3 className="mt-3 text-lg font-bold">{c.name}</h3>
                    {c.target_audience && <p className="text-xs text-muted-foreground mt-1">{c.target_audience}</p>}

                    <div className="mt-5 pb-5 border-b border-border">
                      <p className="text-2xl font-black text-gradient-brand">{primaryFee ?? "Dynamic fee"}</p>
                      {secondaryFee && <p className="text-xs text-muted-foreground mt-0.5">or {secondaryFee} / year</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {c.allow_installments ? "Flexible installment options" : "Annual billing"}
                      </p>
                    </div>

                    <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
                      {(c.benefits || []).slice(0, 5).map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    <Button asChild variant="outline" className="w-full text-xs" size="sm">
                      <Link to="/auth">
                        Apply in this tier <ArrowRight className="size-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 rounded-3xl bg-secondary p-8 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Already a WCA member?</h2>
            <p className="mt-2 text-muted-foreground">Sign in with your existing credentials. Your WCA and DCG credentials are automatically verified to begin your onboarding.</p>
          </div>
          <Button asChild size="lg" className="mt-6 md:mt-0">
            <Link to="/auth">Begin application</Link>
          </Button>
        </div>
      </section>
    </PublicPage>
  );
}
