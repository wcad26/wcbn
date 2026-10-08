import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgeCheck, BarChart3, BriefcaseBusiness, CalendarDays, CircleDollarSign, ClipboardCheck, FileText, Newspaper,
  LogOut, Menu, PanelLeftClose, PanelLeftOpen, ScrollText, Settings2, ShieldCheck, UserRound, Users, X,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/wcbn";
import { AccessGuard } from "./access-guard";

const memberLinks = [
  ["Overview", "/portal", BarChart3],
  ["My application", "/portal/application", ClipboardCheck],
  ["My business", "/portal/business", BriefcaseBusiness],
  ["Events", "/portal/events", CalendarDays],
  ["News", "/portal/news", Newspaper],
  ["Membership fees", "/portal/contributions", CircleDollarSign],
  ["Impact", "/portal/impact", FileText],
  ["Covenant", "/portal/covenant", ScrollText],
  ["My profile", "/portal/profile", UserRound],
] as const;

const adminLinks = [
  ["Overview", "/admin", BarChart3],
  ["Applications", "/admin/applications", ClipboardCheck],
  ["Members", "/admin/members", Users],
  ["Businesses", "/admin/businesses", BriefcaseBusiness],
  ["Events", "/admin/events", CalendarDays],
  ["News", "/admin/news", Newspaper],
  ["Fees & invoices", "/admin/contributions", CircleDollarSign],
  ["Criteria", "/admin/criteria", Settings2],
  ["Roles & access", "/admin/roles", ShieldCheck],
] as const;

export function PortalShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // A member only sees the full portal once leadership has validated and activated them.
  const activated = identity?.wcbnMember?.status === "active";
  const professional = identity?.wcbnMember?.member_type === "professional";
  const memberNav = activated
    ? memberLinks.filter(([, to]) => to !== "/portal/application")
    : ([["My application", "/portal/application", ClipboardCheck]] as const);
  const links = admin ? adminLinks : memberNav;
  // Professionals do not own a business listing — the same page is presented as their professional profile.
  const labelFor = (label: string, to: string) =>
    professional && to === "/portal/business" ? "My professional profile" : label;
  const current = [...links].find(([, to]) => to === path)?.[0] ?? (admin ? "Leadership" : "Member portal");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: admin ? "/auth/admin" : "/auth", replace: true });
  }

  const nav = (
    <nav className="mt-6 space-y-1 px-2">
      {links.map(([label, to, Icon]) => (
        <Link
          key={to}
          to={to}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
          activeProps={{ className: "bg-primary !text-white hover:bg-primary hover:!text-white" }}
          activeOptions={{ exact: to === "/admin" || to === "/portal" }}
          title={labelFor(label, to)}
        >
          <Icon className="size-4 shrink-0" />
          <span className={collapsed ? "lg:hidden" : ""}>{labelFor(label, to)}</span>
        </Link>
      ))}
    </nav>
  );

  const shell = (
    <div className="flex min-h-svh w-full bg-muted/40">
        <aside className={`fixed inset-y-0 left-0 z-50 flex ${collapsed ? "w-64 lg:w-[76px]" : "w-64"} flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-16 items-center justify-between gap-2 px-4">
            <Link to={admin ? "/admin" : "/portal"} className={`flex items-center gap-2 ${collapsed ? "lg:hidden" : ""}`}>
              <span className="grid size-9 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground">W</span>
              <span className="text-sm font-bold uppercase tracking-wide text-gradient-brand">{admin ? "WCBN Admin" : "WCBN Member"}</span>
            </Link>
            <Button size="icon" variant="ghost" className="hidden lg:inline-flex" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X /></Button>
          </div>
          {nav}
          <div className="mt-auto p-3">
            <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" onClick={signOut}>
              <LogOut className="size-4" /><span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
            </Button>
          </div>
        </aside>

        {mobileOpen && <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

        <div className={`flex min-h-svh w-full min-w-0 flex-col ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></Button>
              <h2 className="text-base font-semibold">{labelFor(current, path)}</h2>
            </div>
            <div className="flex items-center gap-3">
              {identity?.wcbnMember && (
                <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline-flex">
                  <BadgeCheck className="size-3.5" />{identity.wcbnMember.category} · {identity.wcbnMember.status}
                </span>
              )}
              <span className="hidden text-sm text-muted-foreground md:inline">{identity?.email}</span>
              <span className="grid size-9 place-items-center rounded-full gradient-brand text-xs font-bold text-primary-foreground">
                {(identity?.fullName ?? "W").slice(0, 1).toUpperCase()}
              </span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1500px] flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
    </div>
  );

  return admin ? <AccessGuard admin>{shell}</AccessGuard> : shell;
}
