-- Add csl_response_files column if it doesn't exist
ALTER TABLE csl_requests ADD COLUMN IF NOT EXISTS csl_response_files JSONB DEFAULT '[]'::jsonb;

-- Notify Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';
