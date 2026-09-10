import type { ReactNode } from "react";
import { PageShell } from "./page-shell";

export function PublicPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <PageShell><main className="pt-20"><header className="bg-ink"><div className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32"><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{eyebrow}</p><h1 className="mt-5 max-w-5xl font-display text-5xl font-bold leading-tight text-primary-foreground md:text-7xl">{title}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-primary-foreground/65">{intro}</p></div></header>{children}</main></PageShell>;
}
