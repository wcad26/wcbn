import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/payments")({
  component: () => <Navigate to="/admin/settings" search={{ tab: "payments" }} replace />,
});
