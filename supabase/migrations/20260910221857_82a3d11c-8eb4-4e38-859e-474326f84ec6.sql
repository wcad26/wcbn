
CREATE OR REPLACE FUNCTION public.wcbn_has_permission(_user_id uuid, _permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.wcbn_user_roles ur
    JOIN public.wcbn_roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND ur.is_active = true
      AND r.is_active = true
      AND (r.permissions ? '*' OR r.permissions ? _permission)
  ) OR public.is_super_admin_user(_user_id)
$function$;

CREATE POLICY "WCBN staff manage application stages" ON public.wcbn_application_stages
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'applications.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'applications.manage'));

CREATE POLICY "WCBN staff manage scores" ON public.wcbn_scores
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'applications.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'applications.manage'));

CREATE POLICY "WCBN staff view all members" ON public.wcbn_members
  FOR SELECT TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'members.view'));

CREATE POLICY "WCBN staff manage criteria versions" ON public.wcbn_criteria_versions
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'criteria.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'criteria.manage'));

CREATE POLICY "WCBN staff manage criteria" ON public.wcbn_criteria
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'criteria.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'criteria.manage'));

CREATE POLICY "WCBN staff manage dues plans" ON public.wcbn_dues_plans
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'finance.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'finance.manage'));

CREATE POLICY "WCBN staff manage invoices" ON public.wcbn_invoices
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'finance.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'finance.manage'));

CREATE POLICY "WCBN staff manage payments" ON public.wcbn_payments
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'finance.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'finance.manage'));

CREATE POLICY "WCBN staff manage roles" ON public.wcbn_roles
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'roles.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'roles.manage'));

CREATE POLICY "WCBN staff manage role assignments" ON public.wcbn_user_roles
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'roles.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'roles.manage'));

CREATE POLICY "WCBN staff view impact commitments" ON public.wcbn_impact_commitments
  FOR SELECT TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'impact.view'));

CREATE POLICY "WCBN staff view annual reviews" ON public.wcbn_annual_reviews
  FOR SELECT TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'impact.view'));

INSERT INTO public.wcbn_roles (name, description, permissions) VALUES
 ('Administrator','Full access to the WCBN leadership portal','["*"]'::jsonb),
 ('Validator','Reviews applications and businesses','["applications.view","applications.manage","businesses.view","businesses.manage","members.view"]'::jsonb),
 ('Committee Member','Scores and decides applications','["applications.view","applications.manage","members.view","impact.view"]'::jsonb),
 ('Finance','Manages dues, invoices and payments','["finance.view","finance.manage","members.view"]'::jsonb),
 ('Content','Manages public content','["content.manage","businesses.view"]'::jsonb);

WITH v AS (
  INSERT INTO public.wcbn_criteria_versions (name, version_number, is_active, minimum_score, strong_score)
  VALUES ('Founding criteria set', 1, true, 70, 80)
  RETURNING id
)
INSERT INTO public.wcbn_criteria (version_id, code, label, description, section, weight, is_required, is_disqualifying, display_order, is_active, config)
SELECT v.id, c.code, c.label, c.description, c.section, c.weight, c.is_required, c.is_disqualifying, c.display_order, true, '{}'::jsonb
FROM v, (VALUES
 ('wca_active','Active WCA membership','Applicant must hold an active World Changers Association membership.','eligibility',15,true,true,1),
 ('dcg_active','Active DCG participation','Applicant must be an active participant in a Discipleship Cell Group.','eligibility',0,true,true,2),
 ('character','Christian character','Integrity, discipleship and consistent Christian conduct.','selection',20,true,false,3),
 ('business','Business or professional capacity','Legitimate, viable enterprise or professional practice.','selection',15,true,false,4),
 ('leadership','Leadership and influence','Vision, execution and development of others.','selection',15,true,false,5),
 ('impact','Measurable impact commitment','A concrete three to five year impact commitment.','selection',20,true,false,6),
 ('sdg','SDG alignment','Alignment with at least one Sustainable Development Goal.','selection',15,true,false,7)
) AS c(code,label,description,section,weight,is_required,is_disqualifying,display_order);

INSERT INTO public.wcbn_dues_plans (name, category, amount, currency_code, frequency, is_active) VALUES
 ('Associate — annual','Associate',50000,'XAF','annual',true),
 ('Member — annual','Member',100000,'XAF','annual',true),
 ('Leader — annual','Leader',200000,'XAF','annual',true),
 ('Impact Partner — annual','Impact Partner',500000,'XAF','annual',true),
 ('Member — monthly','Member',10000,'XAF','monthly',true);

CREATE POLICY "WCBN members read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'wcbn-documents' AND (owner = auth.uid() OR public.wcbn_has_permission(auth.uid(), 'applications.view')));
CREATE POLICY "WCBN members upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wcbn-documents' AND owner = auth.uid());
CREATE POLICY "WCBN members update own documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'wcbn-documents' AND owner = auth.uid());
CREATE POLICY "WCBN members delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'wcbn-documents' AND owner = auth.uid());
