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
    <div className="space-y-8 animate-in fade-in-50 duration-150">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Member portal</p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}
