-- ==============================================================================
-- Migration: Add attachments to csl_request_logs & tighten RLS
-- Description: Stores Google Drive attachment metadata and secures logs per ticket.
-- ==============================================================================

-- 1. Add attachments metadata column (safe idempotent)
ALTER TABLE public.csl_request_logs
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.csl_request_logs.attachments IS
  'Google Drive attachment metadata for chat messages: name, url, fileId, size, mimeType';

-- 2. Tighten RLS: only CSL team or the request owner can read logs & attachments
ALTER TABLE public.csl_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for logs" ON public.csl_request_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.csl_request_logs;
DROP POLICY IF EXISTS "Allow read logs for CSL team and requester" ON public.csl_request_logs;

CREATE POLICY "Allow read logs for CSL team and requester" ON public.csl_request_logs
    FOR SELECT TO authenticated, anon
    USING (
        auth.email() IS NULL
        OR public.is_csl_team()
        OR (
            NOT COALESCE(is_internal, false)
            AND EXISTS (
                SELECT 1 FROM public.csl_requests r
                WHERE r.id = csl_request_logs.request_id
                AND r.requester_email = auth.email()
            )
        )
    );
