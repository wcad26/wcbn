ALTER TABLE public.wcbn_annual_reviews
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_feedback text;