import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Radio,
  Search,
  Sparkles,
  Ticket,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/wcbn";
import {
  EVENT_FIELDS,
  eventDate,
  eventPlace,
  isUpcoming,
  type WcbnEvent,
} from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/events")({ component: PortalEventsPage });

export function PortalEventsPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "online" | "in_person" | "registered" | "past">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "events", identity?.userId],
    enabled: !!identity?.userId,
    queryFn: async () => {
      const [eventsRes, regsRes] = await Promise.all([
        supabase
          .from("wcbn_events")
          .select(EVENT_FIELDS)
          .eq("status", "published")
          .order("start_datetime", { ascending: true }),
        supabase
          .from("wcbn_event_registrations")
          .select("id, event_id, status")
          .eq("user_id", identity!.userId),
      ]);
      return {
        events: (eventsRes.data ?? []) as WcbnEvent[],
        regs: regsRes.data ?? [],
      };
    },
  });

  const events = data?.events ?? [];
  const registeredSet = new Set(
    (data?.regs ?? []).filter((r) => r.status === "attending").map((r) => r.event_id)
  );

  const upcoming = events.filter(isUpcoming);
  const past = events.filter((e) => !isUpcoming(e)).reverse();
  const virtualUpcoming = upcoming.filter(
    (e) => e.event_format === "online" || e.event_format === "hybrid" || !!e.virtual_url
  );

  const rsvp = useMutation({
    mutationFn: async ({ eventId, attending }: { eventId: string; attending: boolean }) => {
      if (attending) {
        const { error } = await supabase.from("wcbn_event_registrations").upsert(
          {
            event_id: eventId,
            user_id: identity!.userId,
            wcbn_member_id: identity?.wcbnMember?.id ?? null,
            status: "attending",
          },
          { onConflict: "event_id,user_id" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wcbn_event_registrations")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", identity!.userId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.attending ? "You are registered for this gathering." : "Registration cancelled.");
      queryClient.invalidateQueries({ queryKey: ["portal", "events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getFilteredEvents = () => {
    let list: WcbnEvent[] = [];
    if (activeTab === "past") {
      list = past;
    } else if (activeTab === "online") {
      list = upcoming.filter(
        (e) => e.event_format === "online" || e.event_format === "hybrid" || !!e.virtual_url
      );
    } else if (activeTab === "in_person") {
      list = upcoming.filter((e) => e.event_format === "in_person" || (!e.virtual_url && e.venue_name));
    } else if (activeTab === "registered") {
      list = upcoming.filter((e) => registeredSet.has(e.id));
    } else {
      list = upcoming;
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.summary || "").toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.city || "").toLowerCase().includes(q)
    );
  };

  const displayedEvents = getFilteredEvents();

  return (
    <MemberPage
      title="Events & Virtual Masterclasses"
      description="Gatherings, clinics and masterclasses convened for WCBN members. Join virtual sessions directly online or register for in-person summits."
    >
      {/* Top Metrics Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          label="Upcoming Gatherings"
          value={upcoming.length}
          detail="Scheduled by leadership"
          icon={CalendarDays}
        />
        <MetricCard
          label="Virtual Sessions"
          value={virtualUpcoming.length}
          detail="Attend online from anywhere"
          icon={Video}
        />
        <MetricCard
          label="My Registrations"
          value={registeredSet.size}
          detail="Confirmed sessions"
          icon={Ticket}
        />
        <MetricCard
          label="Next Live Session"
          value={upcoming[0] ? new Date(upcoming[0].start_datetime).toLocaleDateString() : "—"}
          detail={upcoming[0]?.title ? upcoming[0].title.slice(0, 24) + "…" : "Check back soon"}
          icon={Radio}
        />
      </div>

      {/* Main Events Explorer */}
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-card space-y-6">
        {/* Filter Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: "all", label: "Upcoming (All)" },
              { id: "online", label: "Virtual Sessions" },
              { id: "in_person", label: "In-Person Summits" },
              { id: "registered", label: "My Registered" },
              { id: "past", label: "Past Archives" },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                className="rounded-xl text-xs font-semibold h-9"
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="pl-8 h-9 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Events Cards Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-3xl" />
            ))}
          </div>
        ) : displayedEvents.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedEvents.map((e) => {
              const isRegistered = registeredSet.has(e.id);
              const isOnline = e.event_format === "online" || e.event_format === "hybrid" || !!e.virtual_url;
              const isToday =
                new Date(e.start_datetime).toDateString() === new Date().toDateString();

              return (
                <article
                  key={e.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div>
                    {/* Header Image or Gradient */}
                    <div className="relative h-44 bg-muted overflow-hidden">
                      {e.image_url ? (
                        <img
                          src={e.image_url}
                          alt={e.title}
                          className="size-full object-cover transition group-hover:scale-105 duration-300"
                        />
                      ) : (
                        <div className="size-full gradient-brand opacity-90" />
                      )}

                      <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-background/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm">
                          {e.category}
                        </span>
                        {isOnline && (
                          <span className="rounded-full bg-emerald-600/90 text-white backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold shadow-sm flex items-center gap-1">
                            <Video className="size-3" /> Online
                          </span>
                        )}
                      </div>

                      {isToday && (
                        <span className="absolute right-3.5 top-3.5 rounded-full bg-rose-600 text-white px-2.5 py-1 text-[11px] font-bold animate-pulse shadow-sm flex items-center gap-1">
                          <Radio className="size-3" /> Live Today
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-primary transition line-clamp-2">
                          {e.title}
                        </h3>
                        {e.summary && (
                          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {e.summary}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-3.5 text-primary shrink-0" />
                          <span>{eventDate(e)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3.5 text-primary shrink-0" />
                          <span className="truncate">
                            {isOnline && !e.venue_name ? "Virtual Gathering (Online Link)" : eventPlace(e)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-5 pt-0 space-y-2.5">
                    {/* Dedicated Join Online Button if URL is present */}
                    {e.virtual_url && activeTab !== "past" && (
                      <Button
                        asChild
                        size="sm"
                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm h-10"
                      >
                        <a href={e.virtual_url} target="_blank" rel="noreferrer">
                          <Video className="size-4" />
                          <span>Connect to Online Event</span>
                          <ExternalLink className="size-3.5 opacity-80" />
                        </a>
                      </Button>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                      <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-9">
                        <Link to="/portal/events/$slug" params={{ slug: e.slug }}>
                          View Details
                        </Link>
                      </Button>

                      {activeTab !== "past" && e.requires_registration && (
                        <Button
                          size="sm"
                          variant={isRegistered ? "ghost" : "default"}
                          disabled={rsvp.isPending}
                          className={`rounded-xl text-xs h-9 gap-1.5 ${
                            isRegistered
                              ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                              : ""
                          }`}
                          onClick={() => rsvp.mutate({ eventId: e.id, attending: !isRegistered })}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle2 className="size-3.5" />
                              <span>Attending</span>
                            </>
                          ) : (
                            <>
                              <Ticket className="size-3.5" />
                              <span>RSVP Register</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center rounded-3xl border border-dashed border-border p-8 space-y-3">
            <CalendarDays className="mx-auto size-8 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-base">No Gatherings Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Leadership will announce the next network masterclass, clinic, or prayer session here.
            </p>
          </div>
        )}
      </div>
    </MemberPage>
  );
}
