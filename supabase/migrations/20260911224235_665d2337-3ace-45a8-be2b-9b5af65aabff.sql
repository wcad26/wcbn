CREATE TABLE public.wcbn_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text,
  description text,
  category text NOT NULL DEFAULT 'Networking',
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  venue_name text,
  address text,
  city text,
  country text,
  image_url text,
  capacity integer,
  cost numeric DEFAULT 0,
  cost_currency_code text DEFAULT 'XAF',
  organizer_name text,
  organizer_email text,
  organizer_phone text,
  requires_registration boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  audience text NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wcbn_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wcbn_events TO authenticated;
GRANT ALL ON public.wcbn_events TO service_role;
ALTER TABLE public.wcbn_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published public events" ON public.wcbn_events
  FOR SELECT TO anon USING (status = 'published' AND audience = 'public');
CREATE POLICY "Members can view published events" ON public.wcbn_events
  FOR SELECT TO authenticated USING (status = 'published' OR public.wcbn_has_permission(auth.uid(), 'content_manage'));
CREATE POLICY "Leadership manage events" ON public.wcbn_events
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'content_manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'content_manage'));

CREATE TRIGGER wcbn_events_updated BEFORE UPDATE ON public.wcbn_events
  FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();

CREATE TABLE public.wcbn_event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.wcbn_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  wcbn_member_id uuid REFERENCES public.wcbn_members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'attending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wcbn_event_registrations TO authenticated;
GRANT ALL ON public.wcbn_event_registrations TO service_role;
ALTER TABLE public.wcbn_event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own registrations" ON public.wcbn_event_registrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.wcbn_has_permission(auth.uid(), 'content_manage'));
CREATE POLICY "Members register themselves" ON public.wcbn_event_registrations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members update own registration" ON public.wcbn_event_registrations
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members delete own registration" ON public.wcbn_event_registrations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.wcbn_has_permission(auth.uid(), 'content_manage'));

CREATE TRIGGER wcbn_event_registrations_updated BEFORE UPDATE ON public.wcbn_event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();

CREATE TABLE public.wcbn_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type text NOT NULL DEFAULT 'announcement',
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text,
  body text,
  image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  is_pinned boolean NOT NULL DEFAULT false,
  audience text NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wcbn_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wcbn_posts TO authenticated;
GRANT ALL ON public.wcbn_posts TO service_role;
ALTER TABLE public.wcbn_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published public posts" ON public.wcbn_posts
  FOR SELECT TO anon USING (status = 'published' AND audience = 'public');
CREATE POLICY "Members can view published posts" ON public.wcbn_posts
  FOR SELECT TO authenticated USING (status = 'published' OR public.wcbn_has_permission(auth.uid(), 'content_manage'));
CREATE POLICY "Leadership manage posts" ON public.wcbn_posts
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'content_manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'content_manage'));

CREATE TRIGGER wcbn_posts_updated BEFORE UPDATE ON public.wcbn_posts
  FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();

CREATE INDEX wcbn_events_start_idx ON public.wcbn_events (start_datetime DESC);
CREATE INDEX wcbn_posts_published_idx ON public.wcbn_posts (published_at DESC);