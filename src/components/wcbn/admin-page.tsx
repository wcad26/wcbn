import type { ReactNode } from "react";
import { PortalShell } from "./portal-shell";

export function AdminPage({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <PortalShell admin>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">WCBN leadership</p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-8">{children}</div>
    </PortalShell>
  );
}

export function MemberPage({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <PortalShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Member portal</p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-8">{children}</div>
    </PortalShell>
  );
}
