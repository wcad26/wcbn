export function SectionHeading({ eyebrow, title, copy, light = false }: { eyebrow: string; title: string; copy?: string; light?: boolean }) {
  return <div className="max-w-3xl"><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-gold">{eyebrow}</p><h2 className={`font-display text-4xl font-bold leading-tight md:text-6xl ${light ? "text-primary-foreground" : "text-foreground"}`}>{title}</h2>{copy && <p className={`mt-5 max-w-2xl text-base leading-8 ${light ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{copy}</p>}</div>;
}
