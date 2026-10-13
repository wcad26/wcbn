import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  LogOut,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings2,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/wcbn";
import { AccessGuard, clearAccessGuardCache } from "./access-guard";

const memberLinks = [
  { section: "Core", label: "Overview", to: "/portal", icon: BarChart3 },
  { section: "Core", label: "My business", to: "/portal/business", icon: BriefcaseBusiness },
  { section: "Core", label: "Jobs & Hiring", to: "/portal/jobs", icon: Briefcase },
  { section: "Core", label: "Annual Impact", to: "/portal/impact", icon: FileText },
  { section: "Gatherings", label: "Events & Sessions", to: "/portal/events", icon: CalendarDays },
  { section: "Gatherings", label: "News & Updates", to: "/portal/news", icon: Newspaper },
  { section: "Account", label: "Finance & Invoices", to: "/portal/contributions", icon: CircleDollarSign },
  { section: "Account", label: "Covenant Charter", to: "/portal/covenant", icon: ScrollText },
  { section: "Account", label: "My profile", to: "/portal/profile", icon: UserRound },
] as const;

const adminLinks = [
  { section: "Dossier", label: "Overview", to: "/admin", icon: BarChart3 },
  { section: "Dossier", label: "Applications", to: "/admin/applications", icon: ClipboardCheck },
  { section: "Dossier", label: "Members", to: "/admin/members", icon: Users },
  { section: "Dossier", label: "Ventures & Directory", to: "/admin/businesses", icon: BriefcaseBusiness },
  { section: "Operations", label: "Finance & Invoices", to: "/admin/contributions", icon: CircleDollarSign },
  { section: "Operations", label: "Events", to: "/admin/events", icon: CalendarDays },
  { section: "Operations", label: "News", to: "/admin/news", icon: Newspaper },
  { section: "Operations", label: "Settings", to: "/admin/settings", icon: Settings2 },
] as const;

export function PortalShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  // Mobile / tablet off-canvas drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // Desktop sidebar collapse state
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const activated = identity?.wcbnMember?.status === "active";
  const professional = identity?.wcbnMember?.member_type === "professional";

  const memberNav = activated
    ? memberLinks
    : [
        {
          section: "Core",
          label: "My application",
          to: "/portal/application" as const,
          icon: ClipboardCheck,
        },
      ];

  const links = admin ? adminLinks : memberNav;

  const labelFor = (label: string, to: string) =>
    professional && to === "/portal/business" ? "My professional profile" : label;

  const currentItem = links.find((l) => l.to === path);
  const currentTitle = currentItem ? labelFor(currentItem.label, currentItem.to) : admin ? "Leadership" : "Member Portal";

  async function signOut() {
    clearAccessGuardCache();
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: admin ? "/auth/admin" : "/auth", replace: true });
  }

  const memberInitials = (identity?.fullName || identity?.email || "W")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberCategory = identity?.wcbnMember?.category || (admin ? "Leadership" : "Enterprise");
  const memberStanding = identity?.wcbnMember?.status === "active" ? "Good Standing" : "In Review";

  // Group links by section
  const sections = Array.from(new Set(links.map((l) => l.section)));

  const renderNavList = (isCompact = false, onNavigate?: () => void) => (
    <div className="space-y-4 px-2 py-2">
      {sections.map((sectionName) => {
        const sectionLinks = links.filter((l) => l.section === sectionName);
        return (
          <div key={sectionName} className="space-y-1">
            {!isCompact && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {sectionName}
              </p>
            )}
            {sectionLinks.map(({ label, to, icon: Icon }) => {
              const active = path === to || (to !== "/admin" && to !== "/portal" && path.startsWith(`${to}/`));
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => onNavigate?.()}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isCompact ? "justify-center px-2" : ""
                  } ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                  title={labelFor(label, to)}
                >
                  <Icon className={`size-4 shrink-0 transition-transform group-hover:scale-105 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {!isCompact && <span className="truncate">{labelFor(label, to)}</span>}
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  const shell = (
    <div className="flex min-h-svh w-full bg-background selection:bg-primary/20">
      {/* ========================================================= */}
      {/* MOBILE & TABLET SLIDE-OVER DRAWER (< lg)                   */}
      {/* ========================================================= */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] sm:w-[320px] max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl transition-transform duration-250 ease-out lg:hidden ${
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation drawer"
      >
        {/* Drawer Header with Member Dossier */}
        <div className="border-b border-border/80 p-5 bg-muted/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl gradient-brand text-sm font-bold text-primary-foreground shadow-sm">
                {memberInitials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {identity?.fullName || "Member"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {identity?.email}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-full text-muted-foreground hover:bg-muted"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <BadgeCheck className="size-3" />
              {memberCategory} Track
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {memberStanding}
            </span>
          </div>
        </div>

        {/* Drawer Navigation Links */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-3">
          {renderNavList(false, () => setMobileDrawerOpen(false))}
        </div>

        {/* Drawer Footer Actions */}
        <div className="border-t border-border/80 p-4 bg-muted/20">
          <Button
            variant="outline"
            className="w-full justify-center gap-2 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR (>= lg)                                   */}
      {/* ========================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card/95 backdrop-blur transition-all duration-200 lg:flex ${
          desktopCollapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {/* Desktop Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/80 px-4">
          <Link
            to={admin ? "/admin" : "/portal"}
            className={`flex items-center gap-2.5 ${desktopCollapsed ? "hidden" : "flex"}`}
          >
            <span className="grid size-9 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground shadow-sm">
              W
            </span>
            <div>
              <span className="block text-sm font-bold tracking-tight text-foreground leading-none">
                {admin ? "WCBN Admin" : "WCBN Portal"}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {admin ? "Leadership" : "Executive Suite"}
              </span>
            </div>
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
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            aria-label="Toggle sidebar width"
          >
            {desktopCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>

        {/* Desktop Nav Links */}
        <div className="flex-1 overflow-y-auto py-3">
          {renderNavList(desktopCollapsed)}
        </div>

        {/* Desktop Member Profile Card in Sidebar */}
        <div className="border-t border-border/80 p-3 bg-muted/20">
          {!desktopCollapsed ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 rounded-xl bg-card border border-border/60 p-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg gradient-brand text-xs font-bold text-primary-foreground">
                  {memberInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground leading-tight">
                    {identity?.fullName || "Member"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {memberCategory}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8"
                onClick={signOut}
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span
                className="grid size-9 place-items-center rounded-xl gradient-brand text-xs font-bold text-primary-foreground"
                title={identity?.fullName || "Member"}
              >
                {memberInitials}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                onClick={signOut}
                title="Sign out"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA: FULL WIDTH ON MOBILE & TABLET          */}
      {/* ========================================================= */}
      <div
        className={`flex min-h-svh w-full min-w-0 flex-col pl-0 transition-all duration-200 ${
          desktopCollapsed ? "lg:pl-[76px]" : "lg:pl-64"
        }`}
      >
        {/* Sticky App Header */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-3 border-b border-border/80 bg-background/90 px-4 sm:px-6 backdrop-blur-md">
          {/* Left: Mobile menu button + Title */}
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              className="size-9 rounded-xl lg:hidden text-foreground border-border/80 shadow-xs"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg gradient-brand text-xs font-bold text-primary-foreground lg:hidden">
                W
              </span>
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
                {currentTitle}
              </h1>
            </div>
          </div>

          {/* Right: Member pills & quick actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 sm:px-3 py-1 text-xs font-semibold text-primary">
              <BadgeCheck className="size-3 sm:size-3.5" />
              <span className="hidden sm:inline">{memberCategory} Track</span>
              <span className="sm:hidden">{memberCategory}</span>
            </span>

            <Button
              variant="ghost"
              size="sm"
              className="size-8 sm:size-9 rounded-full p-0"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Account details"
            >
              <span className="grid size-8 sm:size-9 place-items-center rounded-full gradient-brand text-xs font-bold text-primary-foreground shadow-xs">
                {memberInitials}
              </span>
            </Button>
          </div>
        </header>

        {/* Page Content: Mobile-padded at bottom for bottom navigation bar */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* ========================================================= */}
      {/* MOBILE THUMB BOTTOM NAVIGATION BAR (< lg)                 */}
      {/* ========================================================= */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-xl px-2 py-1.5 shadow-2xl lg:hidden"
        aria-label="Bottom mobile navigation"
      >
        <div className="mx-auto flex max-w-md items-center justify-around">
          {!admin ? (
            <>
              {/* 1. Dashboard */}
              <Link
                to="/portal"
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  path === "/portal" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="size-5" />
                <span>Home</span>
              </Link>

              {/* 2. My Business */}
              <Link
                to="/portal/business"
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  path.startsWith("/portal/business") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="size-5" />
                <span>Business</span>
              </Link>

              {/* 3. Jobs */}
              <Link
                to="/portal/jobs"
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  path.startsWith("/portal/jobs") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="size-5" />
                <span>Jobs</span>
              </Link>

              {/* 4. Impact */}
              <Link
                to="/portal/impact"
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  path.startsWith("/portal/impact") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Target className="size-5" />
                <span>Impact</span>
              </Link>

              {/* 5. More / Menu */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition"
              >
                <Menu className="size-5" />
                <span>More</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/admin"
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  path === "/admin" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="size-5" />
                <span>Overview</span>
              </Link>
              <Link
                to="/admin/applications"
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  path.startsWith("/admin/applications") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ClipboardCheck className="size-5" />
                <span>Vetting</span>
              </Link>
              <Link
                to="/admin/businesses"
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  path.startsWith("/admin/businesses") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="size-5" />
                <span>Ventures</span>
              </Link>
              <Link
                to="/admin/members"
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  path.startsWith("/admin/members") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="size-5" />
                <span>Members</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition"
              >
                <Menu className="size-5" />
                <span>More</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );

  return admin ? <AccessGuard admin>{shell}</AccessGuard> : shell;
}
