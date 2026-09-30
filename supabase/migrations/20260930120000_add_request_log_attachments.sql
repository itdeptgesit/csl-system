-- Attach Google Drive document metadata to request chat/log messages.
-- Actual files remain private in Google Drive; this column stores display metadata only.
ALTER TABLE public.csl_request_logs
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.csl_request_logs.attachments IS
  'Google Drive attachment metadata for chat messages: name, url, fileId, size, mimeType';
