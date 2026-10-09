-- Migration: Align categories, applications, and members with Entrepreneur and Investor/Mentor archetypes.
-- Allows 'entrepreneur' and 'investor_mentor' in addition to legacy 'business' and 'professional'.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wcbn_membership_categories_applicant_type_check') THEN
    ALTER TABLE public.wcbn_membership_categories DROP CONSTRAINT wcbn_membership_categories_applicant_type_check;
  END IF;
  ALTER TABLE public.wcbn_membership_categories ADD CONSTRAINT wcbn_membership_categories_applicant_type_check
    CHECK (applicant_type IN ('entrepreneur', 'investor_mentor', 'business', 'professional', 'any'));

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wcbn_applications_applicant_type_check') THEN
    ALTER TABLE public.wcbn_applications DROP CONSTRAINT wcbn_applications_applicant_type_check;
  END IF;
  ALTER TABLE public.wcbn_applications ADD CONSTRAINT wcbn_applications_applicant_type_check
    CHECK (applicant_type IN ('entrepreneur', 'investor_mentor', 'business', 'professional'));

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wcbn_members_member_type_check') THEN
    ALTER TABLE public.wcbn_members DROP CONSTRAINT wcbn_members_member_type_check;
  END IF;
  ALTER TABLE public.wcbn_members ADD CONSTRAINT wcbn_members_member_type_check
    CHECK (member_type IN ('entrepreneur', 'investor_mentor', 'business', 'professional'));
END $$;
