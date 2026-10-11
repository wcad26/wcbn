-- Migration: Add secure payment secret key columns to wcbn_payment_settings
ALTER TABLE public.wcbn_payment_settings ADD COLUMN IF NOT EXISTS flutterwave_secret_key text;
ALTER TABLE public.wcbn_payment_settings ADD COLUMN IF NOT EXISTS flutterwave_encryption_key text;
ALTER TABLE public.wcbn_payment_settings ADD COLUMN IF NOT EXISTS supabase_service_role_key text;

-- Ensure finance leaders can upsert payment settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wcbn_payment_settings' AND policyname = 'Finance leaders update payment settings'
  ) THEN
    CREATE POLICY "Finance leaders update payment settings" ON public.wcbn_payment_settings
      FOR ALL TO authenticated
      USING (wcbn_has_permission(auth.uid(), 'finance.manage') OR is_super_admin_user(auth.uid()))
      WITH CHECK (wcbn_has_permission(auth.uid(), 'finance.manage') OR is_super_admin_user(auth.uid()));
  END IF;
END $$;
