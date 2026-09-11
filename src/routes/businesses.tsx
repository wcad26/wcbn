import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { PublicPage } from "@/components/wcbn/public-page";
import { supabase } from "@/integrations/supabase/client";
import { SDGS } from "@/lib/wcbn";

export const Route = createFileRoute("/businesses")({
  head: () => ({ meta: [
    { title: "Vetted Business Catalog | WCBN" },
    { name: "description", content: "Discover trusted businesses led by validated members of the World Changers Business Network." },
    { property: "og:title", content: "WCBN Business Catalog" },
    { property: "og:description", content: "Explore vetted enterprises creating ethical and measurable impact." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Businesses,
});

function Businesses() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("");
  const [sdg, setSdg] = useState("");
  const [listing, setListing] = useState<"business" | "professional">("business");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["public", "businesses"],
    queryFn: async () => (await supabase
      .from("wcbn_businesses")
      .select("id, slug, display_name, sector, country, city, summary, cover_url, logo_url, is_featured, listing_type, wcbn_business_sdgs(sdg_number)")
      .eq("is_active", true).eq("vetting_status", "approved")
      .order("is_featured", { ascending: false })).data ?? [],
  });

  const inTrack = items.filter((i) => (i.listing_type ?? "business") === listing);
  const sectors = [...new Set(inTrack.map((i) => i.sector))].sort();
  const countries = [...new Set(inTrack.map((i) => i.country))].sort();

  const filtered = useMemo(() => inTrack.filter((x) => {
    const sdgs = (x.wcbn_business_sdgs as { sdg_number: number }[] | null)?.map((s) => s.sdg_number) ?? [];
    return `${x.display_name} ${x.sector} ${x.country}`.toLowerCase().includes(query.toLowerCase())
      && (!sector || x.sector === sector) && (!country || x.country === country) && (!sdg || sdgs.includes(Number(sdg)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, listing, query, sector, country, sdg]);

  return (
    <PublicPage eyebrow="Directory" title="Trusted enterprises. Trusted professionals." intro="Every listing here belongs to a validated WCBN member and is vetted for legitimacy, integrity, excellence and contribution.">
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {([["business", "Businesses"], ["professional", "Professionals"]] as const).map(([value, label]) => (
            <button key={value} onClick={() => { setListing(value); setSector(""); setCountry(""); }}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${listing === value ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 rounded-2xl pl-11" placeholder={listing === "professional" ? "Search professionals, fields or countries" : "Search businesses, sectors or countries"} />
          </div>
          <select value={sector} onChange={(e) => setSector(e.target.value)} className="h-12 rounded-2xl border border-input bg-background px-4 text-sm"><option value="">{listing === "professional" ? "All fields" : "All sectors"}</option>{sectors.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-12 rounded-2xl border border-input bg-background px-4 text-sm"><option value="">All countries</option>{countries.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={sdg} onChange={(e) => setSdg(e.target.value)} className="h-12 rounded-2xl border border-input bg-background px-4 text-sm"><option value="">All SDGs</option>{SDGS.map((l, i) => <option key={l} value={i + 1}>{i + 1}. {l}</option>)}</select>
        </div>

        {isLoading && <p className="mt-12 text-sm text-muted-foreground">Loading the catalog…</p>}

        {!isLoading && (filtered.length ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((x) => (
              <Link key={x.id} to="/businesses/$slug" params={{ slug: x.slug }} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1">
                <div className="aspect-[16/9] overflow-hidden bg-secondary">
                  {x.cover_url ? <img src={x.cover_url} alt={`${x.display_name} cover`} className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /> : <div className="size-full gradient-brand opacity-80" />}
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{x.sector}</p>
                  <h2 className="mt-3 text-xl font-bold">{x.display_name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{x.city ? `${x.city}, ` : ""}{x.country}</p>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{x.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-16 rounded-3xl border border-border bg-card py-20 text-center shadow-card">
            <h2 className="text-2xl font-bold">This directory is being curated.</h2>
            <p className="mt-3 text-muted-foreground">Vetted and activated member {listing === "professional" ? "professionals" : "businesses"} will appear here.</p>
          </div>
        ))}
      </section>
    </PublicPage>
  );
}
