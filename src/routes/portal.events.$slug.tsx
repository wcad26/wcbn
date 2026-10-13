import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Globe,
  Key,
  MapPin,
  Radio,
  Share2,
  Ticket,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { money, useIdentity } from "@/lib/wcbn";
import {
  EVENT_FIELDS,
  eventDate,
  eventPlace,
  type WcbnEvent,
} from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/events/$slug")({ component: PortalEventDetailPage });

export function PortalEventDetailPage() {
  const { slug } = Route.useParams();
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "event", slug, identity?.userId],
    enabled: !!identity?.userId,
    queryFn: async () => {
      const { data: event } = await supabase
        .from("wcbn_events")
        .select(EVENT_FIELDS)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (!event) return { event: null as WcbnEvent | null, attending: false, count: 0 };

      const [{ data: mine }, { count }] = await Promise.all([
        supabase
          .from("wcbn_event_registrations")
          .select("id, status")
          .eq("event_id", event.id)
          .eq("user_id", identity!.userId)
          .maybeSingle(),
        supabase
          .from("wcbn_event_registrations")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("status", "attending"),
      ]);

      return {
        event: event as WcbnEvent,
        attending: mine?.status === "attending",
        count: count ?? 0,
      };
    },
  });

  const event = data?.event ?? null;

  const rsvp = useMutation({
    mutationFn: async (attending: boolean) => {
      if (!event) return;
      if (attending) {
        const { error } = await supabase.from("wcbn_event_registrations").upsert(
          {
            event_id: event.id,
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
          .eq("event_id", event.id)
          .eq("user_id", identity!.userId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, attending) => {
      toast.success(attending ? "You are registered for this gathering." : "Registration cancelled.");
      queryClient.invalidateQueries({ queryKey: ["portal", "event", slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <MemberPage title="Event Details" description="Loading session overview...">
        <Skeleton className="h-96 rounded-3xl" />
      </MemberPage>
    );
  }

  if (!event) {
    return (
      <MemberPage title="Event Not Found" description="This gathering may have been unpublished or removed.">
        <Button asChild>
          <Link to="/portal/events">Return to All Events</Link>
        </Button>
      </MemberPage>
    );
  }

  const isOnline = event.event_format === "online" || event.event_format === "hybrid" || !!event.virtual_url;
  const isToday = new Date(event.start_datetime).toDateString() === new Date().toDateString();

  // Google Calendar URL generator
  const createGoogleCalendarUrl = () => {
    const startIso = new Date(event.start_datetime).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endRef = event.end_datetime ? new Date(event.end_datetime) : new Date(new Date(event.start_datetime).getTime() + 2 * 3600000);
    const endIso = endRef.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const details = encodeURIComponent(
      `${event.summary || ""}\n\nJoin Online: ${event.virtual_url || ""}\nMeeting ID: ${event.meeting_id || ""}\nPasscode: ${event.meeting_passcode || ""}`
    );
    const location = encodeURIComponent(event.virtual_url || eventPlace(event));
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  return (
    <MemberPage
      title={event.title}
      description={event.summary ?? "WCBN Gathering Details"}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/portal/events">
              <ArrowLeft className="size-4" />
              <span>Back to all events</span>
            </Link>
          </Button>

          {event.requires_registration && (
            <Button
              size="sm"
              variant={data?.attending ? "outline" : "default"}
              disabled={rsvp.isPending}
              onClick={() => rsvp.mutate(!data?.attending)}
              className={data?.attending ? "text-emerald-700 dark:text-emerald-400 gap-1.5" : "gap-1.5 shadow-sm"}
            >
              {data?.attending ? (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Attending (Cancel RSVP)</span>
                </>
              ) : (
                <>
                  <Ticket className="size-4" />
                  <span>Register to Attend</span>
                </>
              )}
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Event Body & Live Connection */}
        <div className="space-y-6 lg:col-span-8">
          {/* Virtual Connection Banner */}
          {event.virtual_url && (
            <div className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/10 p-6 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                    <Video className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <span>Online Session Link Available</span>
                      {isToday && (
                        <span className="rounded-full bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 animate-pulse">
                          Live Today
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Connect directly to the virtual meeting room below.
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  size="lg"
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md px-6"
                >
                  <a href={event.virtual_url} target="_blank" rel="noreferrer">
                    <Video className="size-5" />
                    <span>Join Online Event Now</span>
                    <ExternalLink className="size-4 opacity-80" />
                  </a>
                </Button>
              </div>

              {/* Meeting Access Credentials */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-emerald-500/20 text-xs">
                {event.meeting_id && (
                  <div className="rounded-xl border border-emerald-500/20 bg-background/80 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Meeting ID:</span>
                      <strong className="text-foreground text-sm font-mono">{event.meeting_id}</strong>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={() => copyToClipboard(event.meeting_id!, "Meeting ID")}
                    >
                      {copiedField === "Meeting ID" ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    </Button>
                  </div>
                )}

                {event.meeting_passcode && (
                  <div className="rounded-xl border border-emerald-500/20 bg-background/80 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Passcode:</span>
                      <strong className="text-foreground text-sm font-mono">{event.meeting_passcode}</strong>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={() => copyToClipboard(event.meeting_passcode!, "Passcode")}
                    >
                      {copiedField === "Passcode" ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Description Card */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card space-y-6">
            {event.image_url && (
              <img
                src={event.image_url}
                alt={event.title}
                className="max-h-80 w-full rounded-2xl object-cover shadow-sm"
              />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
                {event.category}
              </Badge>
              {isOnline && (
                <Badge className="bg-emerald-600 text-white text-xs font-semibold gap-1">
                  <Video className="size-3" /> Virtual Session
                </Badge>
              )}
              {event.audience === "members" && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  WCBN Members Only
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground">Session Overview & Agenda</h3>
              <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                {event.description ?? "Full session details and speaker line-up will be announced shortly."}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Key Details & Calendar Integration */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-5">
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground pb-3 border-b border-border/60">
              Gathering Information
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 text-primary shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Date & Time</span>
                  <strong className="text-foreground text-sm block mt-0.5">{eventDate(event)}</strong>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-border/60">
                <MapPin className="mt-0.5 size-4 text-primary shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Venue / Location</span>
                  <strong className="text-foreground text-sm block mt-0.5">
                    {isOnline && !event.venue_name ? "Virtual Gathering (Online Stream)" : eventPlace(event)}
                  </strong>
                  {event.address && <p className="text-muted-foreground mt-0.5">{event.address}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-border/60">
                <Coins className="mt-0.5 size-4 text-primary shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Investment / Fee</span>
                  <strong className="text-foreground text-sm block mt-0.5">
                    {Number(event.cost ?? 0) > 0
                      ? money(Number(event.cost), event.cost_currency_code ?? "XAF")
                      : "Complimentary for Members"}
                  </strong>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-border/60">
                <Users className="mt-0.5 size-4 text-primary shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Attendance</span>
                  <strong className="text-foreground text-sm block mt-0.5">
                    {data?.count ?? 0} registered
                    {event.capacity ? ` (Capacity: ${event.capacity} seats)` : ""}
                  </strong>
                </div>
              </div>
            </div>

            {/* Calendar Integration Button */}
            <div className="pt-4 border-t border-border/60 space-y-2">
              <Button asChild variant="outline" className="w-full rounded-xl gap-2 text-xs">
                <a href={createGoogleCalendarUrl()} target="_blank" rel="noreferrer">
                  <Calendar className="size-4 text-primary" />
                  <span>Add to Google Calendar</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Organiser Information */}
          {(event.organizer_name || event.organizer_email || event.organizer_phone) && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Session Convener</h4>
              <div className="space-y-1 text-xs">
                <strong className="text-sm text-foreground block">{event.organizer_name || "WCBN Leadership"}</strong>
                {event.organizer_email && <p className="text-muted-foreground">{event.organizer_email}</p>}
                {event.organizer_phone && <p className="text-muted-foreground">{event.organizer_phone}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </MemberPage>
  );
}
