import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/roles")({
  component: () => <Navigate to="/admin/settings" search={{ tab: "roles" }} replace />,
});
