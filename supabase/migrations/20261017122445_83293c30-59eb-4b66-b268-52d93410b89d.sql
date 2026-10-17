CREATE TABLE IF NOT EXISTS public.wcbn_payment_credentials (
  mode text PRIMARY KEY CHECK (mode IN ('test','live')),
  public_key text,
  secret_key text,
  encryption_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wcbn_payment_credentials TO authenticated;
GRANT ALL ON public.wcbn_payment_credentials TO service_role;
ALTER TABLE public.wcbn_payment_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance leaders read credentials" ON public.wcbn_payment_credentials FOR SELECT TO authenticated USING (wcbn_has_permission(auth.uid(), 'finance.manage'));
CREATE POLICY "Finance leaders insert credentials" ON public.wcbn_payment_credentials FOR INSERT TO authenticated WITH CHECK (wcbn_has_permission(auth.uid(), 'finance.manage'));
CREATE POLICY "Finance leaders update credentials" ON public.wcbn_payment_credentials FOR UPDATE TO authenticated USING (wcbn_has_permission(auth.uid(), 'finance.manage')) WITH CHECK (wcbn_has_permission(auth.uid(), 'finance.manage'));
CREATE TRIGGER wcbn_payment_credentials_updated BEFORE UPDATE ON public.wcbn_payment_credentials FOR EACH ROW EXECUTE FUNCTION wcbn_set_updated_at();

INSERT INTO public.wcbn_payment_credentials (mode, public_key, secret_key, encryption_key)
SELECT 'live', s.flutterwave_public_key,
  (SELECT e->>'value' FROM jsonb_array_elements(s.bank_accounts) e WHERE e->>'_type'='vault_secret' AND e->>'key'='FLUTTERWAVE_SECRET_KEY' LIMIT 1),
  (SELECT e->>'value' FROM jsonb_array_elements(s.bank_accounts) e WHERE e->>'_type'='vault_secret' AND e->>'key'='FLUTTERWAVE_ENCRYPTION_KEY' LIMIT 1)
FROM public.wcbn_payment_settings s WHERE s.id = 1
ON CONFLICT (mode) DO NOTHING;
INSERT INTO public.wcbn_payment_credentials (mode) VALUES ('test'),('live') ON CONFLICT (mode) DO NOTHING;

-- Strip secrets hidden inside the bank accounts list, which every signed-in user can read.
UPDATE public.wcbn_payment_settings
SET bank_accounts = COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(bank_accounts) e WHERE COALESCE(e->>'_type','') <> 'vault_secret'), '[]'::jsonb);