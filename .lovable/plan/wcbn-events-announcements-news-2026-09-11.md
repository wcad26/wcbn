# WCBN Events, Announcements & News

Give WCBN its own events and news, created by leadership and visible on the public site and in the member portal.

## What leadership gets

New "Events" section in the WCBN admin portal:
- List of all events with status (draft, upcoming, completed, cancelled), date, location, audience and registration count.
- Create/edit form modelled on the WCA event manager: title, summary, full description, category, start/end date and time, venue name and address, cover image upload, capacity, cost, organiser contact, RSVP on/off, featured toggle, and audience (public website + members, or members only).
- Publish/unpublish, cancel and delete actions.
- View who has registered for each event, with export-friendly list.

New "News & announcements" section:
- Create posts with type (announcement, news, blog), title, summary, rich body, cover image, tags, pin-to-top, audience (public + members, or members only), and publish date.
- Draft/published states, edit and delete.

## What members get

- "Events" page in the member portal: upcoming events as cards, past events below, each opening a detail page with full information, map-friendly address, organiser contact and an RSVP button ("I'll attend" / cancel RSVP) when registration is enabled.
- "News & announcements" page: pinned items first, then latest posts, each opening a detail page.
- The portal overview gains two compact panels: next upcoming event and the three latest announcements.

## What the public website gets

- `/events` listing upcoming and past public events, and `/events/{slug}` detail pages with a call to sign in or apply for members-only actions.
- `/news` listing public posts and `/news/{slug}` detail pages.
- Header navigation gains Events and News; the homepage gains a short upcoming-events strip and latest-news strip.

## Access rules

- Public site shows only published items marked public.
- Member portal shows published items for members (public + members-only), and only to activated members; members awaiting validation continue to see just their application page.
- Only leadership with the events/content permission can create or edit.

## Technical notes

- New tables `wcbn_events`, `wcbn_event_registrations`, `wcbn_posts`, mirroring the WCA `events` shape (slug, category, start/end datetime, venue, image, capacity, cost, organiser fields, status, is_featured) but scoped to WCBN and free of region/DCG coupling. Public read policies for published + public rows via `anon`, member read for published rows, write restricted through `wcbn_has_permission`. Explicit `GRANT`s on each new table.
- New public storage bucket for event and post cover images.
- Routes added: `src/routes/events.tsx`, `events.$slug.tsx`, `news.tsx`, `news.$slug.tsx`, `portal_.events.tsx`, `portal_.events.$slug.tsx`, `portal_.news.tsx`, `portal_.news.$slug.tsx`, `admin_.events.tsx`, `admin_.events.$id.tsx`, `admin_.news.tsx`.
- Data access via React Query and the existing browser Supabase client, matching current portal pages; slug generation reuses `slugify` in `src/lib/wcbn.ts`.
- Nav entries added to `portal-shell.tsx` (member and admin lists) and `site-header.tsx`; each route gets its own head metadata.
