import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, MapPin, Ticket } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/wcbn";
import { EVENT_FIELDS, eventDate, eventPlace, isUpcoming, type WcbnEvent } from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/events")({ component: PortalEvents });

function PortalEvents() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "events", identity?.userId],
    enabled: !!identity?.userId,
    queryFn: async () => {
      const [events, regs] = await Promise.all([
        supabase.from("wcbn_events").select(EVENT_FIELDS).eq("status", "published").order("start_datetime", { ascending: true }),
        supabase.from("wcbn_event_registrations").select("id, event_id, status").eq("user_id", identity!.userId),
      ]);
      return { events: (events.data ?? []) as WcbnEvent[], regs: regs.data ?? [] };
    },
  });

  const events = data?.events ?? [];
  const registered = new Set((data?.regs ?? []).filter((r) => r.status === "attending").map((r) => r.event_id));
  const upcoming = events.filter(isUpcoming);
  const past = events.filter((e) => !isUpcoming(e)).reverse();

  const rsvp = useMutation({
    mutationFn: async ({ eventId, attending }: { eventId: string; attending: boolean }) => {
      if (attending) {
        const { error } = await supabase.from("wcbn_event_registrations").upsert(
          { event_id: eventId, user_id: identity!.userId, wcbn_member_id: identity?.wcbnMember?.id ?? null, status: "attending" },
          { onConflict: "event_id,user_id" },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_event_registrations").delete().eq("event_id", eventId).eq("user_id", identity!.userId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => { toast.success(v.attending ? "You are registered for this event." : "Your registration was cancelled."); queryClient.invalidateQueries({ queryKey: ["portal", "events"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberPage title="WCBN events" description="Gatherings, clinics and masterclasses convened for members of the network.">
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Upcoming</h2>
          {upcoming.length ? (
            <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((e) => (
                <Row key={e.id} event={e} attending={registered.has(e.id)} busy={rsvp.isPending}
                  onToggle={() => rsvp.mutate({ eventId: e.id, attending: !registered.has(e.id) })} />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">No events are scheduled yet. Leadership will announce the next gathering here.</p>
          )}

          {past.length > 0 && (
            <>
              <h2 className="mt-12 text-lg font-semibold">Past events</h2>
              <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {past.map((e) => <Row key={e.id} event={e} attending={registered.has(e.id)} past />)}
              </div>
            </>
          )}
        </>
      )}
    </MemberPage>
  );
}

function Row({ event, attending, onToggle, busy, past = false }: { event: WcbnEvent; attending: boolean; onToggle?: () => void; busy?: boolean; past?: boolean }) {
  return (
    <article className={`overflow-hidden rounded-3xl border border-border bg-card shadow-card ${past ? "opacity-80" : ""}`}>
      <div className="relative h-36 bg-muted">
        {event.image_url ? <img src={event.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full gradient-brand" />}
        <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-primary">{event.category}</span>
        {event.audience === "members" && <span className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Members only</span>}
      </div>
      <div className="p-5">
        <h3 className="font-bold leading-snug">{event.title}</h3>
        <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" />{eventDate(event)}</div>
          <div className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{eventPlace(event)}</div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/portal/events/$slug" params={{ slug: event.slug }}>View details</Link></Button>
          {!past && event.requires_registration && (
            attending
              ? <Button size="sm" variant="ghost" disabled={busy} onClick={onToggle} className="text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />Attending — cancel</Button>
              : <Button size="sm" disabled={busy} onClick={onToggle}><Ticket className="size-4" />Register</Button>
          )}
        </div>
      </div>
    </article>
  );
}
