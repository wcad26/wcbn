CREATE TABLE public.wcbn_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'applicant',
  status text NOT NULL DEFAULT 'applicant',
  inducted_at timestamptz,
  next_review_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wcbn_members TO authenticated;
GRANT ALL ON public.wcbn_members TO service_role;
ALTER TABLE public.wcbn_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wcbn_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wcbn_roles TO authenticated;
GRANT ALL ON public.wcbn_roles TO service_role;
ALTER TABLE public.wcbn_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wcbn_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.wcbn_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);
GRANT SELECT ON public.wcbn_user_roles TO authenticated;
GRANT ALL ON public.wcbn_user_roles TO service_role;
ALTER TABLE public.wcbn_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.wcbn_has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wcbn_user_roles ur
    JOIN public.wcbn_roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id::uuid
      AND ur.is_active = true
      AND r.is_active = true
      AND (r.permissions ? '*' OR r.permissions ? _permission)
  )
$$;
GRANT EXECUTE ON FUNCTION public.wcbn_has_permission(uuid, text) TO authenticated;

CREATE POLICY "Members view own WCBN membership" ON public.wcbn_members FOR SELECT TO authenticated USING (profile_id = auth.uid()::uuid OR public.wcbn_has_permission(auth.uid()::uuid, 'members.view'));
CREATE POLICY "Members create own WCBN membership" ON public.wcbn_members FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid()::uuid AND EXISTS (SELECT 1 FROM public.members m WHERE m.id = wcbn_members.member_id AND m.profile_id = auth.uid()::uuid AND m.status = 'active'::public.member_status));
CREATE POLICY "WCBN leaders manage memberships" ON public.wcbn_members FOR UPDATE TO authenticated USING (public.wcbn_has_permission(auth.uid(), 'members.manage')) WITH CHECK (public.wcbn_has_permission(auth.uid(), 'members.manage'));
CREATE POLICY "Authenticated users view active WCBN roles" ON public.wcbn_roles FOR SELECT TO authenticated USING (is_active = true OR public.wcbn_has_permission(auth.uid(), 'settings.manage'));
CREATE POLICY "Users view own role assignments" ON public.wcbn_user_roles FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid OR public.wcbn_has_permission(auth.uid()::uuid, 'settings.manage'));

CREATE TABLE public.wcbn_criteria_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number integer NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  minimum_score numeric(5,2) NOT NULL DEFAULT 70,
  strong_score numeric(5,2) NOT NULL DEFAULT 80,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wcbn_criteria_versions TO authenticated;
GRANT ALL ON public.wcbn_criteria_versions TO service_role;
ALTER TABLE public.wcbn_criteria_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view criteria versions" ON public.wcbn_criteria_versions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.wcbn_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.wcbn_criteria_versions(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  description text,
  section text NOT NULL,
  weight numeric(5,2) NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  is_disqualifying boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(version_id, code)
);
GRANT SELECT ON public.wcbn_criteria TO authenticated;
GRANT ALL ON public.wcbn_criteria TO service_role;
ALTER TABLE public.wcbn_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view criteria" ON public.wcbn_criteria FOR SELECT TO authenticated USING (true);

CREATE TABLE public.wcbn_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wcbn_member_id uuid NOT NULL REFERENCES public.wcbn_members(id) ON DELETE CASCADE,
  criteria_version_id uuid NOT NULL REFERENCES public.wcbn_criteria_versions(id),
  status text NOT NULL DEFAULT 'draft',
  current_stage text NOT NULL DEFAULT 'applied',
  wca_verified boolean NOT NULL DEFAULT false,
  dcg_verified boolean NOT NULL DEFAULT false,
  applicant_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid REFERENCES public.profiles(id),
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wcbn_applications TO authenticated;
GRANT ALL ON public.wcbn_applications TO service_role;
ALTER TABLE public.wcbn_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own applications" ON public.wcbn_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'applications.view'));
CREATE POLICY "Members create own applications" ON public.wcbn_applications FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid()));
CREATE POLICY "Members update draft applications" ON public.wcbn_applications FOR UPDATE TO authenticated USING ((status = 'draft' AND EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid())) OR public.wcbn_has_permission(auth.uid(), 'applications.manage')) WITH CHECK ((status IN ('draft','submitted') AND EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid())) OR public.wcbn_has_permission(auth.uid(), 'applications.manage'));

CREATE TABLE public.wcbn_application_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.wcbn_applications(id) ON DELETE CASCADE,
  stage_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  risk_level text,
  reviewer_id uuid REFERENCES public.profiles(id),
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id, stage_code)
);
GRANT SELECT ON public.wcbn_application_stages TO authenticated;
GRANT ALL ON public.wcbn_application_stages TO service_role;
ALTER TABLE public.wcbn_application_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own application stages" ON public.wcbn_application_stages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.wcbn_applications a JOIN public.wcbn_members wm ON wm.id = a.wcbn_member_id WHERE a.id = application_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'applications.view'));

CREATE TABLE public.wcbn_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.wcbn_applications(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.wcbn_criteria(id),
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  score numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  is_red_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id, criterion_id, reviewer_id)
);
GRANT SELECT ON public.wcbn_scores TO authenticated;
GRANT ALL ON public.wcbn_scores TO service_role;
ALTER TABLE public.wcbn_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own final scores" ON public.wcbn_scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.wcbn_applications a JOIN public.wcbn_members wm ON wm.id = a.wcbn_member_id WHERE a.id = application_id AND wm.profile_id = auth.uid() AND a.status IN ('approved','deferred','rejected')) OR public.wcbn_has_permission(auth.uid(), 'applications.review'));

CREATE TABLE public.wcbn_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_member_id uuid NOT NULL REFERENCES public.wcbn_members(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  legal_name text NOT NULL,
  display_name text NOT NULL,
  summary text,
  description text,
  sector text NOT NULL,
  country text NOT NULL,
  city text,
  website_url text,
  email text,
  phone text,
  logo_url text,
  cover_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  products_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  markets jsonb NOT NULL DEFAULT '[]'::jsonb,
  registration_number text,
  years_operating integer,
  employee_count integer,
  risk_level text NOT NULL DEFAULT 'green',
  vetting_status text NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wcbn_businesses TO anon;
GRANT SELECT, INSERT, UPDATE ON public.wcbn_businesses TO authenticated;
GRANT ALL ON public.wcbn_businesses TO service_role;
ALTER TABLE public.wcbn_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views active vetted businesses" ON public.wcbn_businesses FOR SELECT TO anon, authenticated USING ((is_active = true AND vetting_status = 'approved') OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = owner_member_id AND wm.profile_id = auth.uid())) OR (auth.uid() IS NOT NULL AND public.wcbn_has_permission(auth.uid(), 'businesses.view')));
CREATE POLICY "Members create own businesses" ON public.wcbn_businesses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = owner_member_id AND wm.profile_id = auth.uid()));
CREATE POLICY "Members update own unapproved businesses" ON public.wcbn_businesses FOR UPDATE TO authenticated USING ((vetting_status IN ('draft','changes_requested') AND EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = owner_member_id AND wm.profile_id = auth.uid())) OR public.wcbn_has_permission(auth.uid(), 'businesses.manage')) WITH CHECK ((vetting_status IN ('draft','submitted','changes_requested') AND EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = owner_member_id AND wm.profile_id = auth.uid())) OR public.wcbn_has_permission(auth.uid(), 'businesses.manage'));

CREATE TABLE public.wcbn_business_sdgs (
  business_id uuid NOT NULL REFERENCES public.wcbn_businesses(id) ON DELETE CASCADE,
  sdg_number integer NOT NULL,
  contribution text,
  PRIMARY KEY (business_id, sdg_number)
);
GRANT SELECT ON public.wcbn_business_sdgs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wcbn_business_sdgs TO authenticated;
GRANT ALL ON public.wcbn_business_sdgs TO service_role;
ALTER TABLE public.wcbn_business_sdgs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views SDGs for active businesses" ON public.wcbn_business_sdgs FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.wcbn_businesses b WHERE b.id = business_id AND b.is_active = true AND b.vetting_status = 'approved') OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.wcbn_businesses b JOIN public.wcbn_members wm ON wm.id = b.owner_member_id WHERE b.id = business_id AND wm.profile_id = auth.uid())) OR (auth.uid() IS NOT NULL AND public.wcbn_has_permission(auth.uid(), 'businesses.view')));
CREATE POLICY "Members manage own business SDGs" ON public.wcbn_business_sdgs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.wcbn_businesses b JOIN public.wcbn_members wm ON wm.id = b.owner_member_id WHERE b.id = business_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'businesses.manage')) WITH CHECK (EXISTS (SELECT 1 FROM public.wcbn_businesses b JOIN public.wcbn_members wm ON wm.id = b.owner_member_id WHERE b.id = business_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'businesses.manage'));

CREATE TABLE public.wcbn_impact_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wcbn_member_id uuid NOT NULL REFERENCES public.wcbn_members(id) ON DELETE CASCADE,
  statement text NOT NULL,
  target_year integer NOT NULL,
  measures jsonb NOT NULL DEFAULT '[]'::jsonb,
  sdg_numbers integer[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wcbn_impact_commitments TO authenticated;
GRANT ALL ON public.wcbn_impact_commitments TO service_role;
ALTER TABLE public.wcbn_impact_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own impact commitments" ON public.wcbn_impact_commitments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'impact.manage')) WITH CHECK (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'impact.manage'));

CREATE TABLE public.wcbn_annual_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wcbn_member_id uuid NOT NULL REFERENCES public.wcbn_members(id) ON DELETE CASCADE,
  review_year integer NOT NULL,
  business_status text,
  jobs_created integer NOT NULL DEFAULT 0,
  people_trained integer NOT NULL DEFAULT 0,
  community_initiatives integer NOT NULL DEFAULT 0,
  businesses_supported integer NOT NULL DEFAULT 0,
  achievements text,
  challenges text,
  next_objectives text,
  sdg_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(wcbn_member_id, review_year)
);
GRANT SELECT, INSERT, UPDATE ON public.wcbn_annual_reviews TO authenticated;
GRANT ALL ON public.wcbn_annual_reviews TO service_role;
ALTER TABLE public.wcbn_annual_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own annual reviews" ON public.wcbn_annual_reviews FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'impact.manage')) WITH CHECK (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'impact.manage'));

CREATE TABLE public.wcbn_dues_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  frequency text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency_code text NOT NULL REFERENCES public.currencies(code),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wcbn_dues_plans TO authenticated;
GRANT ALL ON public.wcbn_dues_plans TO service_role;
ALTER TABLE public.wcbn_dues_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view active dues plans" ON public.wcbn_dues_plans FOR SELECT TO authenticated USING (is_active = true OR public.wcbn_has_permission(auth.uid(), 'finance.manage'));

CREATE TABLE public.wcbn_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wcbn_member_id uuid NOT NULL REFERENCES public.wcbn_members(id) ON DELETE CASCADE,
  dues_plan_id uuid REFERENCES public.wcbn_dues_plans(id),
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency_code text NOT NULL REFERENCES public.currencies(code),
  status text NOT NULL DEFAULT 'unpaid',
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wcbn_invoices TO authenticated;
GRANT ALL ON public.wcbn_invoices TO service_role;
ALTER TABLE public.wcbn_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own invoices" ON public.wcbn_invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.wcbn_members wm WHERE wm.id = wcbn_member_id AND wm.profile_id = auth.uid()) OR public.wcbn_has_permission(auth.uid(), 'finance.view'));

CREATE TABLE public.wcbn_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.wcbn_invoices(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  amount numeric(14,2) NOT NULL,
  currency_code text NOT NULL REFERENCES public.currencies(code),
  method text NOT NULL,
  provider text,
  reference text,
  proof_url text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wcbn_payments TO authenticated;
GRANT ALL ON public.wcbn_payments TO service_role;
ALTER TABLE public.wcbn_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own payments" ON public.wcbn_payments FOR SELECT TO authenticated USING (submitted_by = auth.uid() OR public.wcbn_has_permission(auth.uid(), 'finance.view'));
CREATE POLICY "Members submit own payment proof" ON public.wcbn_payments FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid() AND EXISTS (SELECT 1 FROM public.wcbn_invoices i JOIN public.wcbn_members wm ON wm.id = i.wcbn_member_id WHERE i.id = invoice_id AND wm.profile_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.wcbn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER wcbn_members_updated BEFORE UPDATE ON public.wcbn_members FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_roles_updated BEFORE UPDATE ON public.wcbn_roles FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_applications_updated BEFORE UPDATE ON public.wcbn_applications FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_application_stages_updated BEFORE UPDATE ON public.wcbn_application_stages FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_scores_updated BEFORE UPDATE ON public.wcbn_scores FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_businesses_updated BEFORE UPDATE ON public.wcbn_businesses FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_impact_commitments_updated BEFORE UPDATE ON public.wcbn_impact_commitments FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_annual_reviews_updated BEFORE UPDATE ON public.wcbn_annual_reviews FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_dues_plans_updated BEFORE UPDATE ON public.wcbn_dues_plans FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_invoices_updated BEFORE UPDATE ON public.wcbn_invoices FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();
CREATE TRIGGER wcbn_payments_updated BEFORE UPDATE ON public.wcbn_payments FOR EACH ROW EXECUTE FUNCTION public.wcbn_set_updated_at();