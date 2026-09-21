import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { PortalShell } from "@/components/wcbn/portal-shell";
import { useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal")({
  component: PortalGate,
});

function PortalGate() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { data: identity, isPending, isFetching } = useIdentity();
  const activated = identity?.wcbnMember?.status === "active";
  const onApplication = path === "/portal/application";
  const correctDestination = !!identity && ((activated && !onApplication) || (!activated && onApplication));

  useEffect(() => {
    if (isPending || isFetching) return;
    if (!identity) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (!activated && !onApplication) navigate({ to: "/portal/application", replace: true });
    if (activated && onApplication) navigate({ to: "/portal", replace: true });
  }, [activated, identity, isFetching, isPending, navigate, onApplication]);

  if (isPending || isFetching || !correctDestination) return <PortalLoading />;
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