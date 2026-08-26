-- Tambahkan policy INSERT agar Requester bisa melampirkan dokumen saat membuat request
CREATE POLICY "Requester can insert their request documents"
ON csl_request_documents
FOR INSERT
WITH CHECK (
  auth.email() IS NULL
  OR is_csl_team()
  OR EXISTS (
    SELECT 1 FROM csl_requests r
    WHERE r.id = csl_request_documents.request_id
      AND r.requester_email::text = auth.email()
  )
);
