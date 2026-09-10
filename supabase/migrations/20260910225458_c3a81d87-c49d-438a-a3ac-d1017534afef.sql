
-- 1. Allow owners to edit / withdraw their own listings while pending
DROP POLICY IF EXISTS "Members update own unapproved businesses" ON public.wcbn_businesses;
CREATE POLICY "Members update own unapproved businesses"
ON public.wcbn_businesses FOR UPDATE TO authenticated
USING (
  ((vetting_status = ANY (ARRAY['draft','pending','submitted','changes_requested'])) AND EXISTS (
    SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_businesses.owner_member_id AND wm.profile_id = auth.uid()))
  OR public.wcbn_has_permission(auth.uid(), 'businesses.manage')
)
WITH CHECK (
  ((vetting_status = ANY (ARRAY['draft','pending','submitted','changes_requested'])) AND EXISTS (
    SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_businesses.owner_member_id AND wm.profile_id = auth.uid()))
  OR public.wcbn_has_permission(auth.uid(), 'businesses.manage')
);

DROP POLICY IF EXISTS "Members delete own draft businesses" ON public.wcbn_businesses;
CREATE POLICY "Members delete own draft businesses"
ON public.wcbn_businesses FOR DELETE TO authenticated
USING (
  ((vetting_status = ANY (ARRAY['draft','pending','changes_requested'])) AND EXISTS (
    SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_businesses.owner_member_id AND wm.profile_id = auth.uid()))
  OR public.wcbn_has_permission(auth.uid(), 'businesses.manage')
);

-- 2. Covenant acceptance
ALTER TABLE public.wcbn_members ADD COLUMN IF NOT EXISTS covenant_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.wcbn_accept_covenant()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ts timestamptz := now();
BEGIN
  UPDATE public.wcbn_members
     SET covenant_accepted_at = COALESCE(covenant_accepted_at, _ts), updated_at = now()
   WHERE profile_id = auth.uid()
  RETURNING covenant_accepted_at INTO _ts;
  IF _ts IS NULL THEN RAISE EXCEPTION 'No WCBN membership record found for this account'; END IF;
  RETURN _ts;
END;
$$;
REVOKE ALL ON FUNCTION public.wcbn_accept_covenant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wcbn_accept_covenant() TO authenticated;

-- 3. Application submission
CREATE OR REPLACE FUNCTION public.wcbn_submit_application(_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _member uuid;
BEGIN
  SELECT wm.id INTO _member
    FROM public.wcbn_applications a
    JOIN public.wcbn_members wm ON wm.id = a.wcbn_member_id
   WHERE a.id = _application_id AND wm.profile_id = auth.uid();
  IF _member IS NULL THEN RAISE EXCEPTION 'Application not found for this account'; END IF;

  UPDATE public.wcbn_applications
     SET status = 'submitted', current_stage = 'applied', submitted_at = COALESCE(submitted_at, now()), updated_at = now()
   WHERE id = _application_id AND status = 'draft';

  INSERT INTO public.wcbn_application_stages (application_id, stage_code, status, notes, completed_at)
  SELECT _application_id, 'applied', 'completed', 'Application submitted by the member', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.wcbn_application_stages s WHERE s.application_id = _application_id AND s.stage_code = 'applied');

  UPDATE public.wcbn_members
     SET status = CASE WHEN status IN ('prospect','applicant') THEN 'applicant' ELSE status END, updated_at = now()
   WHERE id = _member;

  RETURN _application_id;
END;
$$;
REVOKE ALL ON FUNCTION public.wcbn_submit_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wcbn_submit_application(uuid) TO authenticated;

-- 4. Member documents
CREATE TABLE IF NOT EXISTS public.wcbn_member_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wcbn_member_id uuid NOT NULL REFERENCES public.wcbn_members(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  kind text NOT NULL DEFAULT 'application',
  label text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wcbn_member_documents TO authenticated;
GRANT ALL ON public.wcbn_member_documents TO service_role;

ALTER TABLE public.wcbn_member_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage own documents" ON public.wcbn_member_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_documents.wcbn_member_id AND wm.profile_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_documents.wcbn_member_id AND wm.profile_id = auth.uid()));

CREATE POLICY "WCBN staff view member documents" ON public.wcbn_member_documents FOR SELECT TO authenticated
USING (public.wcbn_has_permission(auth.uid(), 'applications.view'));

CREATE TRIGGER wcbn_member_documents_updated_at
BEFORE UPDATE ON public.wcbn_member_documents
FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
