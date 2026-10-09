import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/categories")({
  component: () => <Navigate to="/admin/settings" search={{ tab: "categories" }} replace />,
});
