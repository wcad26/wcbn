import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/impact")({
  beforeLoad: () => { throw redirect({ to: "/about", hash: "impact", statusCode: 301 }); },
});
