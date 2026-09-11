ALTER TABLE public.wcbn_members ADD COLUMN IF NOT EXISTS member_type text NOT NULL DEFAULT 'business';
ALTER TABLE public.wcbn_applications ADD COLUMN IF NOT EXISTS applicant_type text NOT NULL DEFAULT 'business';
ALTER TABLE public.wcbn_businesses ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'business';
ALTER TABLE public.wcbn_criteria ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'both';
ALTER TABLE public.wcbn_criteria_versions ADD COLUMN IF NOT EXISTS professional_minimum_score numeric NOT NULL DEFAULT 60;
ALTER TABLE public.wcbn_criteria_versions ADD COLUMN IF NOT EXISTS professional_strong_score numeric NOT NULL DEFAULT 80;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wcbn_members_member_type_check') THEN
    ALTER TABLE public.wcbn_members ADD CONSTRAINT wcbn_members_member_type_check CHECK (member_type IN ('business','professional'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wcbn_applications_applicant_type_check') THEN
    ALTER TABLE public.wcbn_applications ADD CONSTRAINT wcbn_applications_applicant_type_check CHECK (applicant_type IN ('business','professional'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wcbn_businesses_listing_type_check') THEN
    ALTER TABLE public.wcbn_businesses ADD CONSTRAINT wcbn_businesses_listing_type_check CHECK (listing_type IN ('business','professional'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wcbn_criteria_applies_to_check') THEN
    ALTER TABLE public.wcbn_criteria ADD CONSTRAINT wcbn_criteria_applies_to_check CHECK (applies_to IN ('business','professional','both'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wcbn_businesses_listing_type_idx ON public.wcbn_businesses (listing_type);
CREATE INDEX IF NOT EXISTS wcbn_applications_applicant_type_idx ON public.wcbn_applications (applicant_type);