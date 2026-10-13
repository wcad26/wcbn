-- 1) Missing event columns used by the events feature
ALTER TABLE public.wcbn_events
  ADD COLUMN IF NOT EXISTS event_format text NOT NULL DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS virtual_url text,
  ADD COLUMN IF NOT EXISTS meeting_id text,
  ADD COLUMN IF NOT EXISTS meeting_passcode text;

-- 2) Jobs table
CREATE TABLE IF NOT EXISTS public.wcbn_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.wcbn_businesses(id) ON DELETE CASCADE,
  wcbn_member_id uuid NOT NULL REFERENCES public.wcbn_members(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  department text,
  employment_type text NOT NULL DEFAULT 'full_time',
  location_type text NOT NULL DEFAULT 'on_site',
  city text,
  country text NOT NULL DEFAULT 'Cameroon',
  salary_min numeric,
  salary_max numeric,
  currency_code text NOT NULL DEFAULT 'XAF',
  description text NOT NULL,
  requirements text,
  benefits text,
  application_email text,
  application_url text,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'draft',
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wcbn_jobs TO authenticated;
GRANT SELECT ON public.wcbn_jobs TO anon;
GRANT ALL ON public.wcbn_jobs TO service_role;

ALTER TABLE public.wcbn_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public and owners view jobs"
  ON public.wcbn_jobs FOR SELECT
  USING (
    status = 'published'
    OR EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_jobs.wcbn_member_id AND wm.profile_id = auth.uid())
    OR wcbn_has_permission(auth.uid(), 'businesses.manage')
  );

CREATE POLICY "Members create own jobs"
  ON public.wcbn_jobs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_jobs.wcbn_member_id AND wm.profile_id = auth.uid())
    OR wcbn_has_permission(auth.uid(), 'businesses.manage')
  );

CREATE POLICY "Members update own jobs"
  ON public.wcbn_jobs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_jobs.wcbn_member_id AND wm.profile_id = auth.uid())
    OR wcbn_has_permission(auth.uid(), 'businesses.manage')
  );

CREATE POLICY "Members delete own jobs"
  ON public.wcbn_jobs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_jobs.wcbn_member_id AND wm.profile_id = auth.uid())
    OR wcbn_has_permission(auth.uid(), 'businesses.manage')
  );

CREATE INDEX IF NOT EXISTS wcbn_jobs_business_idx ON public.wcbn_jobs(business_id);
CREATE INDEX IF NOT EXISTS wcbn_jobs_member_idx ON public.wcbn_jobs(wcbn_member_id);
CREATE INDEX IF NOT EXISTS wcbn_jobs_status_idx ON public.wcbn_jobs(status);

CREATE OR REPLACE FUNCTION public.wcbn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS wcbn_jobs_touch_updated_at ON public.wcbn_jobs;
CREATE TRIGGER wcbn_jobs_touch_updated_at
  BEFORE UPDATE ON public.wcbn_jobs
  FOR EACH ROW EXECUTE FUNCTION public.wcbn_touch_updated_at();