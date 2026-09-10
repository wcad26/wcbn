export function SectionHeading({ eyebrow, title, copy, light = false, center = false }: { eyebrow?: string; title: string; copy?: string; light?: boolean; center?: boolean }) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-3xl`}>
      {eyebrow && <p className={`text-xs font-bold uppercase tracking-[0.18em] ${light ? "text-accent" : "text-primary"}`}>{eyebrow}</p>}
      <h2 className={`mt-4 text-3xl font-bold leading-tight md:text-4xl lg:text-5xl ${light ? "text-ink-foreground" : "text-foreground"}`}>{title}</h2>
      {copy && <p className={`mt-5 text-base leading-8 ${light ? "text-ink-foreground/70" : "text-muted-foreground"}`}>{copy}</p>}
    </div>
  );
}
