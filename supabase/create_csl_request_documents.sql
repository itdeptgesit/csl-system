-- ================================================================
-- Migration: Buat tabel csl_request_documents + RLS Policies
-- Jalankan di Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Buat tabel
CREATE TABLE IF NOT EXISTS public.csl_request_documents (
  id               BIGSERIAL PRIMARY KEY,
  request_id       BIGINT NOT NULL REFERENCES public.csl_requests(id) ON DELETE CASCADE,
  doc_name         VARCHAR(255) NOT NULL,
  doc_type         VARCHAR(100),
  gdrive_url       TEXT NOT NULL,
  gdrive_file_id   VARCHAR(255),
  uploaded_by_name VARCHAR(255),
  uploaded_by_id   TEXT,
  is_visible_to_requester BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.csl_request_documents ENABLE ROW LEVEL SECURITY;

-- 3. Policy: CSL Team bisa semua operasi
CREATE POLICY "CSL team can manage documents"
ON public.csl_request_documents
FOR ALL
USING (
  auth.email() IS NULL
  OR is_csl_team()
);

-- 4. Policy: Requester bisa SELECT dokumen miliknya yang visible
CREATE POLICY "Requester can view their request documents"
ON public.csl_request_documents
FOR SELECT
USING (
  auth.email() IS NULL
  OR is_csl_team()
  OR (
    is_visible_to_requester = TRUE
    AND EXISTS (
      SELECT 1 FROM public.csl_requests r
      WHERE r.id = csl_request_documents.request_id
        AND r.requester_email::text = auth.email()
    )
  )
);

-- 5. Policy: Requester bisa INSERT dokumen untuk request miliknya
CREATE POLICY "Requester can insert their request documents"
ON public.csl_request_documents
FOR INSERT
WITH CHECK (
  auth.email() IS NULL
  OR is_csl_team()
  OR EXISTS (
    SELECT 1 FROM public.csl_requests r
    WHERE r.id = csl_request_documents.request_id
      AND r.requester_email::text = auth.email()
  )
);

-- Selesai! Verifikasi:
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'csl_request_documents';
