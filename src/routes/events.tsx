import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { PublicPage } from "@/components/wcbn/public-page";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_FIELDS, eventDate, eventPlace, isUpcoming, type WcbnEvent } from "@/lib/wcbn-content";
import gradient from "@/assets/wcbn-gradient.jpg";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [
    { title: "WCBN Events & Gatherings" },
    { name: "description", content: "Conferences, masterclasses and networking gatherings hosted by the World Changers Business Network." },
    { property: "og:title", content: "WCBN Events & Gatherings" },
    { property: "og:description", content: "See what the World Changers Business Network is convening next." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: EventsPage,
});

function EventsPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["public", "events"],
    queryFn: async () => (await supabase.from("wcbn_events").select(EVENT_FIELDS)
      .eq("status", "published").eq("audience", "public")
      .order("start_datetime", { ascending: true })).data as WcbnEvent[] ?? [],
  });

  const upcoming = events.filter(isUpcoming);
  const past = events.filter((e) => !isUpcoming(e)).reverse();

  return (
    <PublicPage eyebrow="Gatherings" title="WCBN events" image={gradient}
      intro="Business clinics, masterclasses, trade gatherings and prayer meetings that sharpen world changers in the marketplace.">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold">Upcoming</h2>
        {isLoading ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-3xl" />)}</div>
        ) : upcoming.length ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{upcoming.map((e) => <EventCard key={e.id} event={e} />)}</div>
        ) : (
          <p className="mt-6 rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">No public events are scheduled right now. Please check back soon.</p>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-16 text-2xl font-bold">Past events</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{past.map((e) => <EventCard key={e.id} event={e} muted />)}</div>
          </>
        )}
      </section>
    </PublicPage>
  );
}

export function EventCard({ event, muted = false, to = "/events/$slug" as const }: { event: WcbnEvent; muted?: boolean; to?: "/events/$slug" | "/portal/events/$slug" }) {
  return (
    <Link to={to} params={{ slug: event.slug }} className={`group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-lg ${muted ? "opacity-80" : ""}`}>
      <div className="relative h-44 overflow-hidden bg-muted">
        {event.image_url
          ? <img src={event.image_url} alt={event.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
          : <div className="h-full w-full gradient-brand" />}
        <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-primary">{event.category}</span>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold leading-snug">{event.title}</h3>
        {event.summary && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.summary}</p>}
        <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" />{eventDate(event)}</div>
          <div className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{eventPlace(event)}</div>
          {event.requires_registration && <div className="flex items-center gap-2"><Ticket className="size-4 text-primary" />Registration required</div>}
        </dl>
      </div>
    </Link>
  );
}
