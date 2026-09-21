import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Coins, MapPin, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { money, useIdentity } from "@/lib/wcbn";
import { EVENT_FIELDS, eventDate, eventPlace, type WcbnEvent } from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/events/$slug")({ component: PortalEventDetail });

function PortalEventDetail() {
  const { slug } = Route.useParams();
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "event", slug, identity?.userId],
    enabled: !!identity?.userId,
    queryFn: async () => {
      const { data: event } = await supabase.from("wcbn_events").select(EVENT_FIELDS).eq("slug", slug).eq("status", "published").maybeSingle();
      if (!event) return { event: null as WcbnEvent | null, attending: false, count: 0 };
      const [{ data: mine }, { count }] = await Promise.all([
        supabase.from("wcbn_event_registrations").select("id, status").eq("event_id", event.id).eq("user_id", identity!.userId).maybeSingle(),
        supabase.from("wcbn_event_registrations").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "attending"),
      ]);
      return { event: event as WcbnEvent, attending: mine?.status === "attending", count: count ?? 0 };
    },
  });

  const event = data?.event ?? null;

  const rsvp = useMutation({
    mutationFn: async (attending: boolean) => {
      if (!event) return;
      if (attending) {
        const { error } = await supabase.from("wcbn_event_registrations").upsert(
          { event_id: event.id, user_id: identity!.userId, wcbn_member_id: identity?.wcbnMember?.id ?? null, status: "attending" },
          { onConflict: "event_id,user_id" },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wcbn_event_registrations").delete().eq("event_id", event.id).eq("user_id", identity!.userId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, attending) => { toast.success(attending ? "You are registered." : "Registration cancelled."); queryClient.invalidateQueries({ queryKey: ["portal", "event", slug] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <MemberPage title="Event" description="Loading the event details."><Skeleton className="h-96 rounded-3xl" /></MemberPage>;
  }

  if (!event) {
    return (
      <MemberPage title="Event not found" description="This event may have been unpublished or the link is incorrect.">
        <Button asChild><Link to="/portal/events">Back to events</Link></Button>
      </MemberPage>
    );
  }

  return (
    <MemberPage title={event.title} description={event.summary ?? "Event details"}
      action={event.requires_registration ? (
        data?.attending
          ? <Button variant="outline" disabled={rsvp.isPending} onClick={() => rsvp.mutate(false)}><CheckCircle2 className="size-4 text-emerald-600" />Attending — cancel</Button>
          : <Button disabled={rsvp.isPending} onClick={() => rsvp.mutate(true)}><Ticket className="size-4" />Register to attend</Button>
      ) : undefined}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          {event.image_url && <img src={event.image_url} alt={event.title} className="mb-6 h-64 w-full rounded-2xl object-cover" />}
          <div className="whitespace-pre-wrap text-base leading-8 text-foreground/90">{event.description ?? "Full details will be shared soon."}</div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 text-primary" /><span>{eventDate(event)}</span></div>
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 text-primary" /><span>{eventPlace(event)}{event.address ? ` — ${event.address}` : ""}</span></div>
              <div className="flex items-start gap-3"><Coins className="mt-0.5 size-4 text-primary" /><span>{Number(event.cost ?? 0) > 0 ? money(Number(event.cost), event.cost_currency_code ?? "XAF") : "Free to attend"}</span></div>
              <div className="flex items-start gap-3"><Users className="mt-0.5 size-4 text-primary" /><span>{data?.count ?? 0} member(s) registered{event.capacity ? ` of ${event.capacity} seats` : ""}</span></div>
            </dl>
            {(event.organizer_name || event.organizer_email || event.organizer_phone) && (
              <div className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Organiser</p>
                <p className="mt-1">{event.organizer_name}</p>
                {event.organizer_email && <p>{event.organizer_email}</p>}
                {event.organizer_phone && <p>{event.organizer_phone}</p>}
              </div>
            )}
          </div>
          <Button asChild variant="outline" className="w-full"><Link to="/portal/events">Back to all events</Link></Button>
        </aside>
      </div>
    </MemberPage>
  );
}
