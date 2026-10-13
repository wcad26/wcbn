import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgeCheck, BarChart3, Briefcase, BriefcaseBusiness, CalendarDays, CircleDollarSign, ClipboardCheck, FileText,
  LogOut, Menu, PanelLeftClose, PanelLeftOpen, ScrollText, Settings2, UserRound, Users, X,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/wcbn";
import { AccessGuard, clearAccessGuardCache } from "./access-guard";

const memberLinks = [
  ["Overview", "/portal", BarChart3],
  ["My application", "/portal/application", ClipboardCheck],
  ["My business", "/portal/business", BriefcaseBusiness],
  ["Jobs & Hiring", "/portal/jobs", Briefcase],
  ["Annual Impact", "/portal/impact", FileText],
  ["Events & Sessions", "/portal/events", CalendarDays],
  ["News & Updates", "/portal/news", Newspaper],
  ["Finance & Invoices", "/portal/contributions", CircleDollarSign],
  ["Covenant Charter", "/portal/covenant", ScrollText],
  ["My profile", "/portal/profile", UserRound],
] as const;

const adminLinks = [
  ["Overview", "/admin", BarChart3],
  ["Applications", "/admin/applications", ClipboardCheck],
  ["Members", "/admin/members", Users],
  ["Ventures & Directory", "/admin/businesses", BriefcaseBusiness],
  ["Finance & Invoices", "/admin/contributions", CircleDollarSign],
  ["Events", "/admin/events", CalendarDays],
  ["News", "/admin/news", Newspaper],
  ["Settings", "/admin/settings", Settings2],
] as const;

export function PortalShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  // mobile/tablet drawer expanded state (clicked to expand)
  const [mobileExpanded, setMobileExpanded] = useState(false);
  // desktop manual collapse state
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
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
    clearAccessGuardCache();
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: admin ? "/auth/admin" : "/auth", replace: true });
  }

  // Common navigation items rendering
  const renderNav = (isCompact: boolean) => (
    <nav className="mt-4 space-y-1.5 px-2">
      {links.map(([label, to, Icon]) => (
        <Link
          key={to}
          to={to}
          onClick={() => setMobileExpanded(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition hover:bg-sidebar-accent hover:text-sidebar-foreground ${isCompact ? "justify-center px-2" : ""}`}
          activeProps={{ className: "bg-primary !text-white hover:bg-primary hover:!text-white shadow-sm" }}
          activeOptions={{ exact: to === "/admin" || to === "/portal" }}
          title={labelFor(label, to)}
        >
          <Icon className="size-4 shrink-0" />
          {!isCompact && <span className="truncate">{labelFor(label, to)}</span>}
        </Link>
      ))}
    </nav>
  );

  const shell = (
    <div className="flex min-h-svh w-full bg-muted/40">
      {/* 
        MOBILE & TABLET COLLAPSED RAIL (< lg):
        Exists persistently on mobile and tablet in collapsed state (width 16 / 64px).
        Clicking either the rail top button or header hamburger expands the full drawer.
      */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 lg:hidden">
        <div className="flex h-16 flex-col items-center justify-center border-b border-sidebar-border/60">
          <button
            type="button"
            onClick={() => setMobileExpanded(true)}
            title="Expand menu"
            className="grid size-9 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground shadow-sm transition hover:scale-105 active:scale-95"
          >
            W
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {renderNav(true)}
        </div>
        <div className="p-2 border-t border-sidebar-border/60 flex justify-center">
          <Button
            size="icon"
            variant="ghost"
            className="size-9 rounded-xl text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      {/* 
        MOBILE & TABLET EXPANDED FLYOUT DRAWER (< lg):
        Opens when member clicks to expand. Slides in smoothly over an overlay backdrop.
      */}
      {mobileExpanded && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileExpanded(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-200 ease-in-out lg:hidden ${
          mobileExpanded ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border/60 px-4">
          <Link
            to={admin ? "/admin" : "/portal"}
            onClick={() => setMobileExpanded(false)}
            className="flex items-center gap-2.5"
          >
            <span className="grid size-9 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground shadow-sm">
              W
            </span>
            <span className="text-sm font-bold uppercase tracking-wide text-gradient-brand">
              {admin ? "WCBN Admin" : "WCBN Member"}
            </span>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 rounded-lg"
            onClick={() => setMobileExpanded(false)}
            aria-label="Collapse menu"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {renderNav(false)}
        </div>
        <div className="p-3 border-t border-sidebar-border/60">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* 
        DESKTOP SIDEBAR (>= lg):
        Standard desktop sidebar with toggle between full width (w-64) and compact rail (w-[76px]).
      */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 lg:flex ${
          desktopCollapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border/60 px-4">
          <Link to={admin ? "/admin" : "/portal"} className={`flex items-center gap-2.5 ${desktopCollapsed ? "hidden" : "flex"}`}>
            <span className="grid size-9 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground shadow-sm">
              W
            </span>
            <span className="text-sm font-bold uppercase tracking-wide text-gradient-brand">
              {admin ? "WCBN Admin" : "WCBN Member"}
            </span>
          </Link>
          {desktopCollapsed && (
            <div className="mx-auto">
              <span className="grid size-9 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground shadow-sm">
                W
              </span>
            </div>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="size-8 rounded-lg"
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            aria-label="Toggle sidebar"
          >
            {desktopCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {renderNav(desktopCollapsed)}
        </div>
        <div className="p-3 border-t border-sidebar-border/60">
          <Button
            variant="outline"
            className={`w-full justify-start gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 ${
              desktopCollapsed ? "justify-center px-0" : ""
            }`}
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="size-4 shrink-0" />
            {!desktopCollapsed && <span>Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* 
        MAIN CONTENT CONTAINER:
        On mobile and tablet: offset by 16 (64px) for the collapsed rail.
        On desktop: offset by w-64 or w-[76px].
      */}
      <div
        className={`flex min-h-svh w-full min-w-0 flex-col pl-16 transition-all duration-200 ${
          desktopCollapsed ? "lg:pl-[76px]" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-9 rounded-xl lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileExpanded(true)}
              aria-label="Expand menu"
            >
              <Menu className="size-5" />
            </Button>
            <h2 className="text-base font-semibold">{labelFor(current, path)}</h2>
          </div>
          <div className="flex items-center gap-3">
            {identity?.wcbnMember && (
              <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline-flex">
                <BadgeCheck className="size-3.5" />
                {identity.wcbnMember.category} · {identity.wcbnMember.status}
              </span>
            )}
            <span className="hidden text-sm text-muted-foreground md:inline">{identity?.email}</span>
            <span className="grid size-9 place-items-center rounded-full gradient-brand text-xs font-bold text-primary-foreground shadow-sm">
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
