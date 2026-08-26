-- ==============================================================================
-- CSL FIX: Tambah kolom tujuan + relax NOT NULL constraints untuk testing
-- Jalankan di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Tambah kolom tujuan & attachments jika belum ada
ALTER TABLE public.csl_requests 
    ADD COLUMN IF NOT EXISTS tujuan TEXT,
    ADD COLUMN IF NOT EXISTS attachments JSONB;

-- 2. Buat sla_target_days dan sla_due_date bisa diisi default (agar insert tidak gagal)
--    Ubah sla_target_days jadi DEFAULT 5
ALTER TABLE public.csl_requests 
    ALTER COLUMN sla_target_days SET DEFAULT 5;

--    Ubah sla_due_date jadi DEFAULT 7 hari dari sekarang
ALTER TABLE public.csl_requests 
    ALTER COLUMN sla_due_date SET DEFAULT (NOW() + INTERVAL '7 days');

-- 3. Pastikan user rudi.siarudin@gesit.co.id ada di user_accounts dengan role 'requester'
--    (Jalankan bagian ini jika user sudah ada di auth tapi belum di user_accounts)
INSERT INTO public.user_accounts (id, email, full_name, role, groups, department, company)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) AS full_name,
    'requester' AS role,
    '{}' AS groups,
    'Marketing & Communication' AS department,
    'PT GESIT' AS company
FROM auth.users au
WHERE au.email = 'rudi.siarudin@gesit.co.id'
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    company = EXCLUDED.company,
    updated_at = NOW();

-- 4. Pastikan akun staff/admin legal bisa melihat semua request
--    Cek: is_csl_team() function harus mengenal role 'staff' atau group 'csl_staff'
--    Update RLS policy agar lebih permisif untuk testing (anon juga bisa lihat)
DROP POLICY IF EXISTS "Allow requests access based on role" ON public.csl_requests;
CREATE POLICY "Allow requests access based on role" ON public.csl_requests
    FOR ALL TO authenticated, anon
    USING (
        auth.email() IS NULL 
        OR public.is_csl_team() 
        OR requester_email = auth.email()
    )
    WITH CHECK (
        auth.email() IS NULL 
        OR public.is_csl_team() 
        OR requester_email = auth.email()
    );

-- 5. Verifikasi: lihat semua request yang ada
SELECT id, request_number, requester_email, requester_name, status, created_at
FROM public.csl_requests
ORDER BY created_at DESC
LIMIT 20;

-- 6. Lihat daftar user_accounts untuk memastikan role sudah benar
SELECT id, email, full_name, role, groups, department
FROM public.user_accounts
ORDER BY role, email;
