-- Restrict category-budget writes to management roles.
-- Run after 20260929103000_secure_budget_category_persistence.sql.

DROP POLICY IF EXISTS "budget_alloc_insert" ON public.csl_budget_allocations;
DROP POLICY IF EXISTS "budget_alloc_update" ON public.csl_budget_allocations;
DROP POLICY IF EXISTS "budget_alloc_delete" ON public.csl_budget_allocations;
DROP POLICY IF EXISTS "budget_alloc_insert_admin" ON public.csl_budget_allocations;
DROP POLICY IF EXISTS "budget_alloc_update_admin" ON public.csl_budget_allocations;
DROP POLICY IF EXISTS "budget_alloc_delete_admin" ON public.csl_budget_allocations;

CREATE POLICY "budget_alloc_insert_admin"
  ON public.csl_budget_allocations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_accounts ua
    WHERE ua.id = auth.uid()
      AND lower(trim(ua.role)) IN ('admin', 'super admin', 'super_admin', 'owner')
  ));

CREATE POLICY "budget_alloc_update_admin"
  ON public.csl_budget_allocations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_accounts ua
    WHERE ua.id = auth.uid()
      AND lower(trim(ua.role)) IN ('admin', 'super admin', 'super_admin', 'owner')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_accounts ua
    WHERE ua.id = auth.uid()
      AND lower(trim(ua.role)) IN ('admin', 'super admin', 'super_admin', 'owner')
  ));

CREATE POLICY "budget_alloc_delete_admin"
  ON public.csl_budget_allocations FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_accounts ua
    WHERE ua.id = auth.uid()
      AND lower(trim(ua.role)) IN ('admin', 'super admin', 'super_admin', 'owner')
  ));

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

  IF NOT EXISTS (
    SELECT 1 FROM public.user_accounts ua
    WHERE ua.id = auth.uid()
      AND lower(trim(ua.role)) IN ('admin', 'super admin', 'super_admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  IF p_fiscal_year < 2000 OR p_fiscal_year > 2100 THEN
    RAISE EXCEPTION 'Fiscal year is outside the allowed range';
  END IF;

  -- Serialize replacements for the same fiscal year while allowing different
  -- years to be edited concurrently. Released automatically at transaction end.
  PERFORM pg_advisory_xact_lock(hashtext('csl_category_budget'), p_fiscal_year);

  IF jsonb_typeof(p_allocations) <> 'array' OR jsonb_array_length(p_allocations) <> 4 THEN
    RAISE EXCEPTION 'Exactly four category allocations are required';
  END IF;

  IF (
    SELECT count(DISTINCT item->>'category')
    FROM jsonb_array_elements(p_allocations) item
    WHERE item->>'category' IN ('Notaris', 'Lawfirm', 'Konsultan', 'Other')
      AND jsonb_typeof(item->'allocated_amount') = 'number'
      AND (item->>'allocated_amount')::NUMERIC >= 0
  ) <> 4 THEN
    RAISE EXCEPTION 'Each official category needs one non-negative numeric allocation';
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
    (item->>'allocated_amount')::NUMERIC,
    now()
  FROM jsonb_array_elements(p_allocations) item;

  RETURN QUERY
  SELECT * FROM public.csl_budget_allocations
  WHERE fiscal_year = p_fiscal_year
  ORDER BY category;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replace_csl_category_budgets(INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_csl_category_budgets(INTEGER, JSONB) TO authenticated;
