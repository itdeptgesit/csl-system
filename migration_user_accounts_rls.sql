-- ============================================================
-- JALANKAN INI DI: Supabase Dashboard → SQL Editor → Run
-- Tujuan: Izinkan Settings > User & Roles menampilkan data user
-- ============================================================

-- Enable RLS
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Allow authenticated read all users" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow csl_team to insert users" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow csl_team to update users" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow csl_admin to delete users" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can read their own record" ON public.user_accounts;

-- 1. Semua user authenticated bisa READ semua user (untuk settings page)
CREATE POLICY "Allow authenticated read all users"
ON public.user_accounts FOR SELECT TO authenticated USING (true);

-- 2. CSL team bisa INSERT user baru
CREATE POLICY "Allow csl_team to insert users"
ON public.user_accounts FOR INSERT TO authenticated
WITH CHECK (public.is_csl_team());

-- 3. CSL team bisa UPDATE, atau user bisa update data dirinya sendiri
CREATE POLICY "Allow csl_team to update users"
ON public.user_accounts FOR UPDATE TO authenticated
USING (public.is_csl_team() OR auth.email() = email);

-- 4. CSL team bisa DELETE user
CREATE POLICY "Allow csl_admin to delete users"
ON public.user_accounts FOR DELETE TO authenticated
USING (public.is_csl_team());

-- Verifikasi hasil
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_accounts';
