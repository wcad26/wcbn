import type { LucideIcon } from "lucide-react";

/**
 * Compact KPI tile for the member portal.
 * Icon and label share the first row, the value truncates instead of overflowing,
 * and the detail clamps to two lines, so content always stays inside the card on phones.
 */
export function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: "primary" | "emerald" | "amber" | "blue";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  } as const;

  return (
    <article className="min-w-0 rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon className="size-3.5" />
        </span>
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2.5 truncate text-xl font-bold leading-none tracking-tight text-foreground sm:text-2xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{detail}</p>
      ) : null}
    </article>
  );
}
