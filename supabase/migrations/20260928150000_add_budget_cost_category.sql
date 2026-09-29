-- Add cost category dimension to CSL budget allocations.
ALTER TABLE public.csl_budget_allocations
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';

UPDATE public.csl_budget_allocations
SET category = 'Other'
WHERE category IS NULL OR btrim(category) = '';

CREATE INDEX IF NOT EXISTS idx_csl_budget_allocations_category
  ON public.csl_budget_allocations (fiscal_year, category);

ALTER TABLE public.csl_budget_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_alloc_select" ON public.csl_budget_allocations;
CREATE POLICY "budget_alloc_select"
  ON public.csl_budget_allocations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "budget_alloc_insert" ON public.csl_budget_allocations;
CREATE POLICY "budget_alloc_insert"
  ON public.csl_budget_allocations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "budget_alloc_update" ON public.csl_budget_allocations;
CREATE POLICY "budget_alloc_update"
  ON public.csl_budget_allocations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "budget_alloc_delete" ON public.csl_budget_allocations;
CREATE POLICY "budget_alloc_delete"
  ON public.csl_budget_allocations FOR DELETE
  TO authenticated USING (true);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.csl_budget_allocations TO authenticated;
