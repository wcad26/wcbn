import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Receipt,
  Sparkles,
  Target,
  TriangleAlert,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { money, useIdentity } from "@/lib/wcbn";
import { eventDate, eventPlace } from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/")({ component: PortalHome });

type InvoiceRow = {
  id: string;
  amount: number;
  paid_amount: number;
  currency_code: string;
  status: string;
};

type EventRow = {
  id: string;
  title: string;
  slug: string;
  start_datetime: string;
  end_datetime: string;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  event_format: string;
  virtual_url: string | null;
};

type EventFilter = "upcoming" | "today" | "past";

export function PortalHome() {
  const { data: identity, isLoading: identityLoading } = useIdentity();
  const wcbnId = identity?.wcbnMember?.id;
  const [eventFilter, setEventFilter] = useState<EventFilter>("upcoming");

  // Query member invoices to compute active status (paid vs fees pending)
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["portal", "overview-invoices", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wcbn_invoices")
        .select("id, amount, paid_amount, currency_code, status")
        .eq("wcbn_member_id", wcbnId!);
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
  });

  // Query published events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["portal", "overview-events-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wcbn_events")
        .select("id, title, slug, start_datetime, end_datetime, venue_name, city, country, event_format, virtual_url")
        .eq("status", "published")
        .order("start_datetime", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const outstanding = invoices.reduce(
    (sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0)),
    0
  );
  const isPaid = outstanding === 0;

  // Filter events into Future / Present (Today) / Past
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const futureEvents = events.filter((e) => {
    const startStr = e.start_datetime.slice(0, 10);
    return startStr > todayStr;
  });

  const todayEvents = events.filter((e) => {
    const startStr = e.start_datetime.slice(0, 10);
    const endStr = e.end_datetime ? e.end_datetime.slice(0, 10) : startStr;
    return startStr <= todayStr && endStr >= todayStr;
  });

  const pastEvents = events
    .filter((e) => {
      const endStr = e.end_datetime ? e.end_datetime.slice(0, 10) : e.start_datetime.slice(0, 10);
      return endStr < todayStr;
    })
    .reverse(); // most recent past first

  const displayedEvents =
    eventFilter === "upcoming"
      ? futureEvents
      : eventFilter === "today"
      ? todayEvents
      : pastEvents;

  // Member info
  const firstName =
    identity?.profile?.first_name ||
    identity?.fullName?.split(" ")[0] ||
    "Member";
  const category = identity?.wcbnMember?.category || "Enterprise";
  const avatarUrl = identity?.profile?.avatar_url;
  const initial = firstName.charAt(0).toUpperCase();

  if (identityLoading || invoicesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in-50 duration-200">
      {/* ========================================================= */}
      {/* 1. PRINCIPAL HERO CARD                                    */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-card">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full gradient-brand opacity-15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 size-60 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative flex items-center justify-between gap-5">
          {/* Left: Greeting, Category & Status */}
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary font-semibold text-xs px-3 py-1">
                {category} Member
              </Badge>
              {isPaid ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs px-3 py-1 gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>Active</span>
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs px-3 py-1 gap-1">
                  <TriangleAlert className="size-3.5" />
                  <span>Fees Pending</span>
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground truncate">
                Hello, {firstName}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Welcome to your WCBN Member Portal. Connect, recruit talent, and track your kingdom enterprise impact.
              </p>
            </div>
          </div>

          {/* Right: Circular space for member image */}
          <div className="shrink-0">
            <Link
              to="/portal/profile"
              title="View and update profile"
              className="group block relative"
            >
              <div className="size-20 sm:size-24 rounded-full p-1 bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent transition-all group-hover:scale-105 shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={firstName}
                    className="size-full rounded-full object-cover bg-background"
                  />
                ) : (
                  <div className="size-full rounded-full gradient-brand grid place-items-center text-primary-foreground font-extrabold text-2xl sm:text-3xl shadow-inner">
                    {initial}
                  </div>
                )}
              </div>
              <span className="sr-only">Go to Profile</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. QUICK ACTION BUTTONS                                   */}
      {/* ========================================================= */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to="/portal/business"
            className="group relative rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
          >
            <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3 transition-transform group-hover:scale-110">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                My Business
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Profile & Directory
              </p>
            </div>
          </Link>

          <Link
            to="/portal/jobs"
            className="group relative rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
          >
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center mb-3 transition-transform group-hover:scale-110">
              <Briefcase className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                Post a Job
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Careers & Talent
              </p>
            </div>
          </Link>

          <Link
            to="/portal/impact"
            className="group relative rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
          >
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-3 transition-transform group-hover:scale-110">
              <Target className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                Annual Impact
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Reviews & Targets
              </p>
            </div>
          </Link>

          <Link
            to="/portal/contributions"
            className="group relative rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
          >
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center mb-3 transition-transform group-hover:scale-110">
              <Receipt className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                Invoices & Fees
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Billing & Receipts
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. UPCOMING EVENTS WITH FILTER + VIEW ALL BUTTON          */}
      {/* ========================================================= */}
      <section className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-card space-y-5">
        {/* Header & Segmented Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Events & Gatherings
              </h2>
              <p className="text-xs text-muted-foreground">
                Network forums, summits, and executive virtual sessions
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-xl bg-muted/60 p-1 text-xs">
            <button
              type="button"
              onClick={() => setEventFilter("upcoming")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                eventFilter === "upcoming"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Future ({futureEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setEventFilter("today")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                eventFilter === "today"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Present ({todayEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setEventFilter("past")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                eventFilter === "past"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Past ({pastEvents.length})
            </button>
          </div>
        </div>

        {/* Events List */}
        {eventsLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Calendar className="size-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">
              No {eventFilter === "upcoming" ? "future" : eventFilter === "today" ? "present" : "past"} events found.
            </p>
            <p className="text-xs text-muted-foreground">
              Check other filters or explore all network events on the events page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedEvents.slice(0, 4).map((evt) => {
              const dateObj = new Date(evt.start_datetime);
              const monthStr = dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
              const dayStr = dateObj.getDate();

              return (
                <div
                  key={evt.id}
                  className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors hover:border-primary/40"
                >
                  {/* Left: Date tile + info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary tracking-wider">{monthStr}</span>
                      <span className="text-base font-extrabold text-foreground leading-none">{dayStr}</span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold uppercase tracking-wider border-border/80"
                        >
                          {evt.event_format === "virtual" ? "Virtual" : "In-Person"}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {eventDate(evt)}
                        </span>
                      </div>
                      <Link
                        to="/portal/events/$slug"
                        params={{ slug: evt.slug }}
                        className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors block truncate"
                      >
                        {evt.title}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="size-3 shrink-0" />
                        {eventPlace(evt)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {evt.virtual_url && eventFilter !== "past" && (
                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                      >
                        <a href={evt.virtual_url} target="_blank" rel="noreferrer">
                          <Video className="size-3.5" />
                          <span>Join Online</span>
                        </a>
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-9 gap-1"
                    >
                      <Link to="/portal/events/$slug" params={{ slug: evt.slug }}>
                        <span>Details</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Events Button */}
        <div className="pt-2 flex justify-center">
          <Button
            asChild
            variant="ghost"
            className="text-xs font-semibold text-primary gap-1.5 hover:bg-primary/10 rounded-xl"
          >
            <Link to="/portal/events">
              <span>View All Network Events ({events.length})</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
