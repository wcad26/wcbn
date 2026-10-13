import type { ReactNode } from "react";

export function AdminPage({ action, children }: { title?: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-150">
      {action ? <div className="flex flex-wrap justify-end gap-2">{action}</div> : null}
      <div>{children}</div>
    </div>
  );
}

export function MemberPage({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Member Portal</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
