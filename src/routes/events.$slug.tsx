import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Coins, MapPin, Users } from "lucide-react";
import { PageShell } from "@/components/wcbn/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_FIELDS, eventDate, eventPlace, type WcbnEvent } from "@/lib/wcbn-content";
import { money } from "@/lib/wcbn";

export const Route = createFileRoute("/events/$slug")({ component: EventDetail });

function EventDetail() {
  const { slug } = Route.useParams();
  const { data: event, isLoading } = useQuery({
    queryKey: ["public", "event", slug],
    queryFn: async () => (await supabase.from("wcbn_events").select(EVENT_FIELDS)
      .eq("slug", slug).eq("status", "published").maybeSingle()).data as WcbnEvent | null,
  });

  return (
    <PageShell>
      <main className="pt-20">
        {isLoading ? (
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6"><Skeleton className="h-96 rounded-3xl" /></div>
        ) : !event ? (
          <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
            <h1 className="text-3xl font-bold">Event not found</h1>
            <p className="mt-3 text-muted-foreground">This event may have been unpublished or the link is incorrect.</p>
            <Button asChild className="mt-6 rounded-full"><Link to="/events">Back to events</Link></Button>
          </div>
        ) : (
          <article>
            <header className="relative overflow-hidden bg-ink">
              {event.image_url && <img src={event.image_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
              <div className="absolute inset-0 gradient-hero opacity-90" />
              <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-24">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{event.category}</p>
                <h1 className="mt-4 text-4xl font-bold leading-tight text-ink-foreground md:text-5xl">{event.title}</h1>
                {event.summary && <p className="mt-5 max-w-2xl text-base leading-8 text-ink-foreground/75">{event.summary}</p>}
              </div>
            </header>

            <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_320px]">
              <div className="prose-sm max-w-none whitespace-pre-wrap text-base leading-8 text-foreground/90">
                {event.description ?? "Full details will be shared soon."}
              </div>
              <aside className="space-y-4">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 text-primary" /><span>{eventDate(event)}</span></div>
                    <div className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 text-primary" /><span>{eventPlace(event)}{event.address ? ` — ${event.address}` : ""}</span></div>
                    {event.capacity ? <div className="flex items-start gap-3"><Users className="mt-0.5 size-4 text-primary" /><span>{event.capacity} seats</span></div> : null}
                    <div className="flex items-start gap-3"><Coins className="mt-0.5 size-4 text-primary" /><span>{Number(event.cost ?? 0) > 0 ? money(Number(event.cost), event.cost_currency_code ?? "XAF") : "Free to attend"}</span></div>
                  </dl>
                  {(event.organizer_name || event.organizer_email || event.organizer_phone) && (
                    <div className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground">Organiser</p>
                      <p className="mt-1">{event.organizer_name}</p>
                      {event.organizer_email && <p>{event.organizer_email}</p>}
                      {event.organizer_phone && <p>{event.organizer_phone}</p>}
                    </div>
                  )}
                  <Button asChild className="mt-6 w-full rounded-full gradient-brand"><Link to="/portal/events">Members: register in the portal</Link></Button>
                  <Button asChild variant="outline" className="mt-2 w-full rounded-full"><Link to="/membership">Not a member yet? Apply</Link></Button>
                </div>
              </aside>
            </div>
          </article>
        )}
      </main>
    </PageShell>
  );
}
