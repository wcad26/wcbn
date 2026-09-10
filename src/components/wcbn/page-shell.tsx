import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background"><SiteHeader />{children}<SiteFooter /></div>;
}
