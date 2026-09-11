import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WcbnEvent = Tables<"wcbn_events">;
export type WcbnPost = Tables<"wcbn_posts">;

export const EVENT_CATEGORIES = [
  "Networking", "Conference", "Masterclass", "Training", "Mentorship", "Business Clinic",
  "Trade Fair", "Prayer & Worship", "Outreach", "Annual General Meeting", "Other",
] as const;

export const EVENT_STATUSES = ["draft", "published", "cancelled", "completed"] as const;
export const POST_TYPES = ["announcement", "news", "blog"] as const;
export const AUDIENCES = [
  { value: "public", label: "Public website & members" },
  { value: "members", label: "Members only" },
] as const;

/** Public bucket shared with the WCA platform for cover imagery. */
export const MEDIA_BUCKET = "event-images";

export async function uploadCover(folder: string, file: File) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const path = `wcbn/${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function eventDate(event: Pick<WcbnEvent, "start_datetime" | "end_datetime">) {
  const start = new Date(event.start_datetime);
  const date = start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const end = event.end_datetime ? new Date(event.end_datetime) : null;
  const endTime = end ? end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : null;
  return endTime ? `${date} · ${time} – ${endTime}` : `${date} · ${time}`;
}

export function eventPlace(event: Pick<WcbnEvent, "venue_name" | "city" | "country">) {
  return [event.venue_name, event.city, event.country].filter(Boolean).join(", ") || "Venue to be announced";
}

export function isUpcoming(event: Pick<WcbnEvent, "start_datetime" | "end_datetime">) {
  const ref = event.end_datetime ?? event.start_datetime;
  return new Date(ref).getTime() >= Date.now();
}

export function postDate(post: Pick<WcbnPost, "published_at" | "created_at">) {
  return new Date(post.published_at ?? post.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function postTypeLabel(type: string) {
  return type === "news" ? "News" : type === "blog" ? "Blog" : "Announcement";
}

export const EVENT_FIELDS =
  "id, title, slug, summary, description, category, start_datetime, end_datetime, venue_name, address, city, country, image_url, capacity, cost, cost_currency_code, organizer_name, organizer_email, organizer_phone, requires_registration, is_featured, audience, status, created_at, updated_at";

export const POST_FIELDS =
  "id, post_type, title, slug, summary, body, image_url, tags, is_pinned, audience, status, published_at, created_at, updated_at";
