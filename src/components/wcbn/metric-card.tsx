import type { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, detail, icon: Icon, tone = "primary" }: { label: string; value: string | number; detail?: string; icon: LucideIcon; tone?: "primary" | "accent" | "secondary" }) {
  const toneClass = tone === "accent" ? "bg-accent/15 text-accent" : tone === "secondary" ? "bg-secondary/15 text-secondary" : "bg-primary/10 text-primary";
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-hover">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-bold">{value}</p>
        </div>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${toneClass}`}><Icon className="size-5" /></span>
      </div>
      {detail && <p className="mt-4 text-xs text-muted-foreground">{detail}</p>}
    </article>
  );
}
