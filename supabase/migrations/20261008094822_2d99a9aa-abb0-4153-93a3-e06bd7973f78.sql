CREATE TABLE public.wcbn_membership_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  target_audience text,
  applicant_type text NOT NULL DEFAULT 'any' CHECK (applicant_type IN ('business','professional','any')),
  fees jsonb NOT NULL DEFAULT '{}'::jsonb,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_installments boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wcbn_membership_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wcbn_membership_categories TO authenticated;
GRANT ALL ON public.wcbn_membership_categories TO service_role;
ALTER TABLE public.wcbn_membership_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active categories" ON public.wcbn_membership_categories FOR SELECT
  USING (is_active OR wcbn_has_permission(auth.uid(), 'finance.manage'));
CREATE POLICY "Finance leaders manage categories" ON public.wcbn_membership_categories FOR ALL TO authenticated
  USING (wcbn_has_permission(auth.uid(), 'finance.manage')) WITH CHECK (wcbn_has_permission(auth.uid(), 'finance.manage'));
CREATE TRIGGER wcbn_membership_categories_updated BEFORE UPDATE ON public.wcbn_membership_categories FOR EACH ROW EXECUTE FUNCTION wcbn_set_updated_at();

INSERT INTO public.wcbn_membership_categories (code, name, description, target_audience, applicant_type, fees, benefits, display_order) VALUES
('emerging','Emerging Entrepreneur / Professional','For young professionals, aspiring entrepreneurs, startups and early-stage business owners.','Primarily Cameroon','any','{"XAF":25000,"EUR":38,"USD":42}',
 '["Full WCBN membership","Entrepreneurship training","6-Month WCBN Entrepreneurship Program","Business Growth Circle","Standard directory listing","Networking events","Opportunity Exchange","Mentorship","Resources and community platforms"]',1),
('business','Business Member','For established entrepreneurs and business owners.','Established businesses','business','{"XAF":50000,"EUR":76,"USD":85}',
 '["All Emerging benefits","Enhanced directory profile","Business promotion","Priority business clinics","Partnership and referral opportunities","B2B networking","Business Showcase / Pitch eligibility","Mentor connections"]',2),
('diaspora','Diaspora Professional / Entrepreneur','For professionals and entrepreneurs in North America, Europe and international markets.','Diaspora and international','any','{"USD":100,"EUR":100,"XAF":65600}',
 '["Full WCBN membership","Virtual training and business forums","International networking","Directory listing","Opportunity Exchange","Mentorship","Cameroon–diaspora connections","Partnership and referral","Investment forums"]',3),
('mentor','Mentor / Investor / Strategic Member','For mentors, investors and strategic partners.','Mentors and investors','any','{"USD":200,"EUR":185,"XAF":131200}',
 '["Strategic membership","Mentor the next generation","Investment opportunities","Leadership forums"]',4);

CREATE TABLE public.wcbn_payment_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  flutterwave_enabled boolean NOT NULL DEFAULT false,
  flutterwave_mode text NOT NULL DEFAULT 'test' CHECK (flutterwave_mode IN ('test','live')),
  flutterwave_public_key text,
  mobile_money_enabled boolean NOT NULL DEFAULT true,
  card_enabled boolean NOT NULL DEFAULT true,
  bank_transfer_enabled boolean NOT NULL DEFAULT true,
  bank_accounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  invoice_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wcbn_payment_settings TO authenticated;
GRANT ALL ON public.wcbn_payment_settings TO service_role;
ALTER TABLE public.wcbn_payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read payment settings" ON public.wcbn_payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance leaders insert payment settings" ON public.wcbn_payment_settings FOR INSERT TO authenticated WITH CHECK (wcbn_has_permission(auth.uid(), 'finance.manage'));
CREATE POLICY "Finance leaders update payment settings" ON public.wcbn_payment_settings FOR UPDATE TO authenticated USING (wcbn_has_permission(auth.uid(), 'finance.manage')) WITH CHECK (wcbn_has_permission(auth.uid(), 'finance.manage'));
CREATE TRIGGER wcbn_payment_settings_updated BEFORE UPDATE ON public.wcbn_payment_settings FOR EACH ROW EXECUTE FUNCTION wcbn_set_updated_at();
INSERT INTO public.wcbn_payment_settings (id) VALUES (1);

ALTER TABLE public.wcbn_invoices
  ADD COLUMN category_id uuid REFERENCES public.wcbn_membership_categories(id) ON DELETE SET NULL,
  ADD COLUMN billing_cycle text NOT NULL DEFAULT 'annual' CHECK (billing_cycle IN ('annual','semi_annual','quarterly')),
  ADD COLUMN installment_number int NOT NULL DEFAULT 1,
  ADD COLUMN installments_total int NOT NULL DEFAULT 1,
  ADD COLUMN payment_method text,
  ADD COLUMN application_id uuid REFERENCES public.wcbn_applications(id) ON DELETE SET NULL;
ALTER TABLE public.wcbn_members ADD COLUMN category_id uuid REFERENCES public.wcbn_membership_categories(id) ON DELETE SET NULL;

-- Creates the onboarding invoice schedule in the applicant's WCA regional currency.
CREATE OR REPLACE FUNCTION public.wcbn_create_onboarding_invoices(_application_id uuid, _category_id uuid, _cycle text, _method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _member uuid; _status text; _region uuid; _currency text; _fees jsonb; _annual numeric; _rate numeric;
  _n int; _amount numeric; _first uuid; _id uuid; _cat record; _seq int; i int;
BEGIN
  IF _cycle NOT IN ('annual','semi_annual','quarterly') THEN RAISE EXCEPTION 'Invalid billing cycle'; END IF;
  IF _method NOT IN ('mobile_money','card','bank_transfer') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  SELECT wm.id, a.status INTO _member, _status FROM wcbn_applications a JOIN wcbn_members wm ON wm.id = a.wcbn_member_id
   WHERE a.id = _application_id AND wm.profile_id = auth.uid();
  IF _member IS NULL THEN RAISE EXCEPTION 'Application not found for this account'; END IF;
  IF _status NOT IN ('draft','awaiting_payment') THEN RAISE EXCEPTION 'This application has already been completed'; END IF;

  SELECT * INTO _cat FROM wcbn_membership_categories WHERE id = _category_id AND is_active;
  IF _cat.id IS NULL THEN RAISE EXCEPTION 'Membership category is not available'; END IF;
  IF _cycle <> 'annual' AND NOT _cat.allow_installments THEN RAISE EXCEPTION 'Instalments are not available for this category'; END IF;

  SELECT COALESCE(m.region_id, p.region_id) INTO _region FROM profiles p LEFT JOIN members m ON m.profile_id = p.id WHERE p.id = auth.uid() LIMIT 1;
  SELECT currency_code INTO _currency FROM regions WHERE id = _region;
  _currency := COALESCE(_currency, 'XAF');
  _fees := _cat.fees;
  _annual := NULLIF(_fees->>_currency, '')::numeric;
  IF _annual IS NULL THEN
    -- Convert from any configured currency using active WCA exchange rates.
    SELECT (_fees->>er.base_code)::numeric * COALESCE(er.mid, er.ask) INTO _annual FROM exchange_rates er
     WHERE er.is_active AND er.quote_code = _currency AND _fees ? er.base_code ORDER BY effective_at DESC LIMIT 1;
    IF _annual IS NULL THEN
      SELECT (_fees->>er.quote_code)::numeric / NULLIF(COALESCE(er.mid, er.ask),0) INTO _annual FROM exchange_rates er
       WHERE er.is_active AND er.base_code = _currency AND _fees ? er.quote_code ORDER BY effective_at DESC LIMIT 1;
    END IF;
  END IF;
  IF _annual IS NULL OR _annual <= 0 THEN RAISE EXCEPTION 'No fee is configured for your regional currency (%)', _currency; END IF;

  _n := CASE _cycle WHEN 'annual' THEN 1 WHEN 'semi_annual' THEN 2 ELSE 4 END;
  _amount := round(_annual / _n, CASE WHEN _currency = 'XAF' THEN 0 ELSE 2 END);

  -- Replace any previous unpaid onboarding schedule for this application.
  DELETE FROM wcbn_invoices WHERE application_id = _application_id AND paid_amount = 0
    AND NOT EXISTS (SELECT 1 FROM wcbn_payments p WHERE p.invoice_id = wcbn_invoices.id);

  SELECT COUNT(*) + 1 INTO _seq FROM wcbn_invoices WHERE invoice_number LIKE 'WCBN-INV-' || extract(year FROM now()) || '-%';
  FOR i IN 1.._n LOOP
    INSERT INTO wcbn_invoices (wcbn_member_id, invoice_number, amount, currency_code, due_date, period_start, period_end, status,
      category_id, billing_cycle, installment_number, installments_total, payment_method, application_id)
    VALUES (_member, 'WCBN-INV-' || extract(year FROM now()) || '-' || lpad((_seq + i - 1)::text, 4, '0') || '-' || substr(gen_random_uuid()::text,1,4),
      _amount, _currency, (current_date + ((i - 1) * (12 / _n)) * interval '1 month')::date,
      (current_date + ((i - 1) * (12 / _n)) * interval '1 month')::date,
      (current_date + (i * (12 / _n)) * interval '1 month' - interval '1 day')::date,
      CASE WHEN i = 1 THEN 'issued' ELSE 'scheduled' END,
      _category_id, _cycle, i, _n, _method, _application_id)
    RETURNING id INTO _id;
    IF i = 1 THEN _first := _id; END IF;
  END LOOP;

  UPDATE wcbn_applications SET applicant_data = applicant_data || jsonb_build_object('category_id', _category_id, 'billing_cycle', _cycle, 'payment_method', _method),
    status = CASE WHEN _method = 'bank_transfer' THEN 'awaiting_payment' ELSE status END, updated_at = now() WHERE id = _application_id;
  UPDATE wcbn_members SET category_id = _category_id, category = _cat.name, updated_at = now() WHERE id = _member;
  RETURN _first;
END $$;
REVOKE ALL ON FUNCTION public.wcbn_create_onboarding_invoices(uuid, uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wcbn_create_onboarding_invoices(uuid, uuid, text, text) TO authenticated;

-- Confirms a payment and activates membership. Only the payment system (service role) or finance leaders.
CREATE OR REPLACE FUNCTION public.wcbn_confirm_payment(_invoice_id uuid, _method text, _provider text, _reference text, _amount numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _inv record; _app record; _profile uuid; _payment uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT wcbn_has_permission(auth.uid(), 'finance.manage') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _inv FROM wcbn_invoices WHERE id = _invoice_id FOR UPDATE;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  SELECT profile_id INTO _profile FROM wcbn_members WHERE id = _inv.wcbn_member_id;

  SELECT id INTO _payment FROM wcbn_payments WHERE invoice_id = _invoice_id AND status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF _payment IS NOT NULL THEN
    UPDATE wcbn_payments SET status = 'confirmed', verified_at = now(), verified_by = auth.uid(), paid_at = COALESCE(paid_at, now()),
      reference = COALESCE(_reference, reference), provider = COALESCE(_provider, provider) WHERE id = _payment;
  ELSIF NOT EXISTS (SELECT 1 FROM wcbn_payments WHERE invoice_id = _invoice_id AND status = 'confirmed' AND reference = _reference) THEN
    INSERT INTO wcbn_payments (invoice_id, amount, currency_code, method, provider, reference, status, submitted_by, paid_at, verified_at, verified_by)
    VALUES (_invoice_id, COALESCE(_amount, _inv.amount), _inv.currency_code, _method, _provider, _reference, 'confirmed', _profile, now(), now(), auth.uid())
    RETURNING id INTO _payment;
  END IF;

  UPDATE wcbn_invoices SET paid_amount = amount, status = 'paid', payment_method = _method, updated_at = now() WHERE id = _invoice_id;

  IF _inv.application_id IS NOT NULL THEN
    SELECT * INTO _app FROM wcbn_applications WHERE id = _inv.application_id;
    UPDATE wcbn_applications SET status = 'approved', current_stage = 'inducted', submitted_at = COALESCE(submitted_at, now()),
      decided_at = now(), decision_reason = 'Activated on payment of membership fee', updated_at = now() WHERE id = _app.id;
    INSERT INTO wcbn_application_stages (application_id, stage_code, status, notes, completed_at)
      SELECT _app.id, 'inducted', 'completed', 'Membership fee paid — member activated', now()
      WHERE NOT EXISTS (SELECT 1 FROM wcbn_application_stages WHERE application_id = _app.id AND stage_code = 'inducted');
    UPDATE wcbn_members SET status = 'active', member_type = _app.applicant_type, inducted_at = COALESCE(inducted_at, now()),
      next_review_date = (current_date + interval '1 year')::date, updated_at = now() WHERE id = _inv.wcbn_member_id;
  END IF;
  RETURN _payment;
END $$;
REVOKE ALL ON FUNCTION public.wcbn_confirm_payment(uuid, text, text, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wcbn_confirm_payment(uuid, text, text, text, numeric) TO authenticated, service_role;