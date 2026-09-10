import type { ReactNode } from "react";
import { PageShell } from "./page-shell";

export function PublicPage({ eyebrow, title, intro, image, children }: { eyebrow: string; title: string; intro: string; image?: string; children: ReactNode }) {
  return (
    <PageShell>
      <main className="pt-20">
        <header className="relative overflow-hidden bg-ink">
          {image && <img src={image} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
          <div className="absolute inset-0 gradient-hero opacity-90" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-ink-foreground md:text-6xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-ink-foreground/75">{intro}</p>
          </div>
        </header>
        {children}
      </main>
    </PageShell>
  );
}
