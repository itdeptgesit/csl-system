-- Ensure CSL budget edits persist in Supabase and are shared across accounts.

CREATE TABLE IF NOT EXISTS public.csl_monthly_budget_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year INTEGER NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'flat',
  monthly_nominal NUMERIC(18, 2) NOT NULL DEFAULT 0,
  annual_nominal NUMERIC(18, 2) NOT NULL DEFAULT 0,
  months JSONB NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.csl_monthly_budget_plans
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS monthly_nominal NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_nominal NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS months JSONB NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_csl_monthly_budget_plans_fiscal_year
  ON public.csl_monthly_budget_plans (fiscal_year);

ALTER TABLE public.csl_monthly_budget_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_budget_select" ON public.csl_monthly_budget_plans;
CREATE POLICY "monthly_budget_select"
  ON public.csl_monthly_budget_plans FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "monthly_budget_insert" ON public.csl_monthly_budget_plans;
CREATE POLICY "monthly_budget_insert"
  ON public.csl_monthly_budget_plans FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "monthly_budget_update" ON public.csl_monthly_budget_plans;
CREATE POLICY "monthly_budget_update"
  ON public.csl_monthly_budget_plans FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.csl_monthly_budget_plans TO authenticated;
