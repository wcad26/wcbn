import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/wcbn/portal-shell";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <PortalShell admin>
      <Outlet />
    </PortalShell>
  );
}
