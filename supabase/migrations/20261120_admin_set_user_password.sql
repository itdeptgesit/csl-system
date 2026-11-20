-- ==============================================================================
-- CSL ERP — Admin Password Management RPC
-- JALANKAN INI DI: Supabase Dashboard → SQL Editor → Run
-- Mengizinkan Admin & Super Admin mengubah password user di auth.users secara aman
-- ==============================================================================

-- 1. Pastikan ekstensi pgcrypto aktif untuk hashing bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Fungsi untuk mengubah password user berdasarkan email
CREATE OR REPLACE FUNCTION public.admin_set_user_password(
    target_email text,
    new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id uuid;
    v_caller_email text;
    v_is_admin boolean;
BEGIN
    -- Validasi input
    IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password minimal 6 karakter');
    END IF;

    -- Dapatkan email pemanggil
    v_caller_email := lower(auth.email());

    -- Cek otorisasi pemanggil: harus Admin/Super Admin di user_accounts atau service_role
    SELECT 
        COALESCE(
            role ILIKE '%admin%' 
            OR 'admin' = ANY(groups) 
            OR 'super_admin' = ANY(groups)
            OR 'super admin' = ANY(groups),
            false
        )
    INTO v_is_admin
    FROM public.user_accounts
    WHERE lower(email) = v_caller_email;

    IF v_is_admin IS NOT TRUE AND (SELECT auth.role()) != 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Hanya Admin / Super Admin yang dapat mengubah password user');
    END IF;

    -- Cari user di auth.users berdasarkan email
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE lower(email) = lower(trim(target_email));

    -- Jika tidak langsung ketemu di auth.users, cari ID-nya di public.user_accounts
    IF v_user_id IS NULL THEN
        BEGIN
            SELECT id::uuid INTO v_user_id
            FROM public.user_accounts
            WHERE lower(email) = lower(trim(target_email));
        EXCEPTION WHEN OTHERS THEN
            v_user_id := NULL;
        END;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User dengan email ' || target_email || ' tidak ditemukan di Auth');
    END IF;

    -- Update encrypted password di auth.users menggunakan bcrypt standar Supabase GoTrue
    UPDATE auth.users
    SET 
        encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Password berhasil diperbarui', 
        'user_id', v_user_id
    );
END;
$$;

-- 3. Fungsi untuk mengubah password user berdasarkan user_id (UUID)
CREATE OR REPLACE FUNCTION public.admin_set_user_password_by_id(
    target_user_id uuid,
    new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_email text;
    v_is_admin boolean;
BEGIN
    IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password minimal 6 karakter');
    END IF;

    v_caller_email := lower(auth.email());

    SELECT 
        COALESCE(
            role ILIKE '%admin%' 
            OR 'admin' = ANY(groups) 
            OR 'super_admin' = ANY(groups)
            OR 'super admin' = ANY(groups),
            false
        )
    INTO v_is_admin
    FROM public.user_accounts
    WHERE lower(email) = v_caller_email;

    IF v_is_admin IS NOT TRUE AND (SELECT auth.role()) != 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Hanya Admin / Super Admin yang dapat mengubah password user');
    END IF;

    UPDATE auth.users
    SET 
        encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Password berhasil diperbarui');
END;
$$;

-- 4. Berikan izin eksekusi ke authenticated user dan service_role
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password_by_id(uuid, text) TO authenticated, service_role;
