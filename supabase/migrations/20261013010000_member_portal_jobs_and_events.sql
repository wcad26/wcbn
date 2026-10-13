-- Migration: Member Portal Jobs, Virtual Events, and Impact Review Workflow
-- Created: 2026-10-13

-- 1. Create wcbn_jobs table
CREATE TABLE IF NOT EXISTS public.wcbn_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.wcbn_businesses(id) ON DELETE CASCADE,
  wcbn_member_id uuid REFERENCES public.wcbn_members(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  department text,
  employment_type text NOT NULL DEFAULT 'full_time',
  location_type text NOT NULL DEFAULT 'on_site',
  city text,
  country text DEFAULT 'Cameroon',
  salary_min numeric,
  salary_max numeric,
  currency_code text DEFAULT 'XAF',
  description text NOT NULL,
  requirements text,
  benefits text,
  application_email text,
  application_url text,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'published',
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for public lookup
CREATE INDEX IF NOT EXISTS idx_wcbn_jobs_status ON public.wcbn_jobs(status);
CREATE INDEX IF NOT EXISTS idx_wcbn_jobs_business ON public.wcbn_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_wcbn_jobs_member ON public.wcbn_jobs(wcbn_member_id);

-- Grants & RLS for wcbn_jobs
GRANT SELECT ON public.wcbn_jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wcbn_jobs TO authenticated;
GRANT ALL ON public.wcbn_jobs TO service_role;

ALTER TABLE public.wcbn_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published jobs" ON public.wcbn_jobs
  FOR SELECT TO public
  USING (status = 'published');

CREATE POLICY "Members can view own jobs" ON public.wcbn_jobs
  FOR SELECT TO authenticated
  USING (
    wcbn_member_id IN (
      SELECT id FROM public.wcbn_members WHERE user_id = auth.uid()
    )
    OR public.wcbn_has_permission(auth.uid(), 'content_manage')
  );

CREATE POLICY "Members can create jobs" ON public.wcbn_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    wcbn_member_id IN (
      SELECT id FROM public.wcbn_members WHERE user_id = auth.uid()
    )
    OR public.wcbn_has_permission(auth.uid(), 'content_manage')
  );

CREATE POLICY "Members can update own jobs" ON public.wcbn_jobs
  FOR UPDATE TO authenticated
  USING (
    wcbn_member_id IN (
      SELECT id FROM public.wcbn_members WHERE user_id = auth.uid()
    )
    OR public.wcbn_has_permission(auth.uid(), 'content_manage')
  );

CREATE POLICY "Members can delete own jobs" ON public.wcbn_jobs
  FOR DELETE TO authenticated
  USING (
    wcbn_member_id IN (
      SELECT id FROM public.wcbn_members WHERE user_id = auth.uid()
    )
    OR public.wcbn_has_permission(auth.uid(), 'content_manage')
  );

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER wcbn_jobs_set_updated_at
  BEFORE UPDATE ON public.wcbn_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.wcbn_set_updated_at();

-- 2. Enhance wcbn_events for virtual / online attendance
ALTER TABLE public.wcbn_events
  ADD COLUMN IF NOT EXISTS event_format text DEFAULT 'hybrid',
  ADD COLUMN IF NOT EXISTS virtual_url text,
  ADD COLUMN IF NOT EXISTS meeting_id text,
  ADD COLUMN IF NOT EXISTS meeting_passcode text;

-- 3. Enhance wcbn_annual_reviews for admin review workflow
ALTER TABLE public.wcbn_annual_reviews
  ADD COLUMN IF NOT EXISTS review_feedback text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
