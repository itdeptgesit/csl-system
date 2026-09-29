-- Atomic category-budget replacement + category integrity.
-- Run after 20260928150000_add_budget_cost_category.sql.

UPDATE public.csl_budget_allocations
SET category = CASE
  WHEN lower(category) IN ('notaris', 'notary', 'notary & ppat services') THEN 'Notaris'
  WHEN lower(category) IN ('lawfirm', 'law firm', 'legal advisory & counsel') THEN 'Lawfirm'
  WHEN lower(category) IN ('konsultan', 'consultant', 'consulting') THEN 'Konsultan'
  ELSE 'Other'
END;

ALTER TABLE public.csl_budget_allocations
  DROP CONSTRAINT IF EXISTS csl_budget_allocations_category_check;
ALTER TABLE public.csl_budget_allocations
  ADD CONSTRAINT csl_budget_allocations_category_check
  CHECK (category IN ('Notaris', 'Lawfirm', 'Konsultan', 'Other'));

CREATE OR REPLACE FUNCTION public.replace_csl_category_budgets(
  p_fiscal_year INTEGER,
  p_allocations JSONB
)
RETURNS SETOF public.csl_budget_allocations
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF jsonb_typeof(p_allocations) <> 'array' OR jsonb_array_length(p_allocations) <> 4 THEN
    RAISE EXCEPTION 'Exactly four category allocations are required';
  END IF;

  IF (
    SELECT count(DISTINCT item->>'category')
    FROM jsonb_array_elements(p_allocations) item
    WHERE item->>'category' IN ('Notaris', 'Lawfirm', 'Konsultan', 'Other')
  ) <> 4 THEN
    RAISE EXCEPTION 'Allocations must contain each official category exactly once';
  END IF;

  DELETE FROM public.csl_budget_allocations
  WHERE fiscal_year = p_fiscal_year;

  INSERT INTO public.csl_budget_allocations (
    fiscal_year, company, department, project_name, category, allocated_amount, updated_at
  )
  SELECT
    p_fiscal_year,
    COALESCE(NULLIF(item->>'company', ''), 'PT Determinan Indah'),
    COALESCE(NULLIF(item->>'department', ''), 'CSL'),
    item->>'category',
    item->>'category',
    GREATEST(0, COALESCE((item->>'allocated_amount')::NUMERIC, 0)),
    now()
  FROM jsonb_array_elements(p_allocations) item;

  RETURN QUERY
  SELECT * FROM public.csl_budget_allocations
  WHERE fiscal_year = p_fiscal_year
  ORDER BY category;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_csl_category_budgets(INTEGER, JSONB) TO authenticated;
