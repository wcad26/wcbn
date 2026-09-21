import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { PortalShell } from "@/components/wcbn/portal-shell";
import { identityQueryOptions } from "@/lib/wcbn";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const identity = await context.queryClient.fetchQuery(identityQueryOptions);
    if (!identity) throw redirect({ to: "/auth", replace: true });

    const activated = identity.wcbnMember?.status === "active";
    const onApplication = location.pathname === "/portal/application";
    if (!activated && !onApplication) throw redirect({ to: "/portal/application", replace: true });
    if (activated && onApplication) throw redirect({ to: "/portal", replace: true });

    return { identity };
  },
  pendingMs: 0,
  pendingMinMs: 250,
  pendingComponent: PortalLoading,
  component: PortalLayout,
});

function PortalLayout() {
  return <PortalShell><Outlet /></PortalShell>;
}

function PortalLoading() {
  return (
    <div className="grid min-h-svh place-items-center bg-muted/40 px-5">
      <div className="w-full max-w-md space-y-4 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground">W</span>
        <p className="text-sm font-medium text-muted-foreground">Opening your member portal…</p>
        <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 animate-pulse rounded-full gradient-brand" />
        </div>
      </div>
    </div>
  );
}