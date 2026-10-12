import { Link } from "@tanstack/react-router";
import { ArrowRight, Globe2, Mail } from "lucide-react";

const explore = [
  ["About & impact", "/about"],
  ["Membership", "/membership"],
  ["Directory", "/businesses"],
  ["Events", "/events"],
  ["News", "/news"],
  ["Contact", "/contact"],
] as const;

const tiers = ["Emerging Entrepreneur / Professional", "Business Member", "Diaspora Professional / Entrepreneur", "Mentor / Investor / Strategic"];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-ink-foreground">
      <div className="pointer-events-none absolute -top-40 right-0 size-[28rem] rounded-full gradient-brand opacity-20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-ink-foreground/10 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-2xl font-bold">Ready to build with purpose?</p>
            <p className="mt-2 text-sm text-ink-foreground/65">Active WCA members in a Destiny Care Group can apply today.</p>
          </div>
          <Link to="/membership" className="inline-flex items-center gap-2 self-start rounded-full gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft">
            Apply to WCBN <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.3fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl gradient-brand font-bold text-primary-foreground">W</span>
              <div>
                <p className="text-lg font-bold leading-none">WCBN</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-ink-foreground/55">World Changers Business Network</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-ink-foreground/65">
              Christian entrepreneurs and professionals using enterprise, influence and stewardship to transform communities and nations.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 px-3 py-1 text-xs text-ink-foreground/70">
              <Globe2 className="size-3.5 text-accent" /> A subsidiary of World Changers Association
            </span>
          </div>

          <FooterCol title="Explore">
            {explore.map(([l, to]) => <Link key={to} to={to} className="transition hover:text-ink-foreground">{l}</Link>)}
          </FooterCol>

          <FooterCol title="Membership categories">
            {tiers.map((t) => <Link key={t} to="/membership" className="transition hover:text-ink-foreground">{t}</Link>)}
          </FooterCol>

          <FooterCol title="Members">
            <Link to="/auth" className="transition hover:text-ink-foreground">Member portal</Link>
            <Link to="/contact" className="inline-flex items-center gap-2 transition hover:text-ink-foreground"><Mail className="size-3.5" /> Get support</Link>
          </FooterCol>
        </div>
      </div>
      <div className="relative border-t border-ink-foreground/10 px-5 py-6 text-center text-xs text-ink-foreground/50">
        © {new Date().getFullYear()} World Changers Business Network · Faith · Enterprise · Impact
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{title}</p>
      <div className="mt-4 grid gap-3 text-sm text-ink-foreground/65">{children}</div>
    </div>
  );
}
