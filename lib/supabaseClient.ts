import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials missing in environment variables');
}

// Client standar (pakai anon key, tunduk ke RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (pakai service role key, bypass RLS) — gunakan HANYA untuk operasi admin
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : supabase; // fallback ke anon jika key tidak ada

/**
 * Ensures a user account exists in Supabase Auth with the specified password.
 * Handles both new user creation and updating password for existing auth users.
 */
export const ensureAuthUserWithPassword = async (
  email: string,
  password?: string,
  fullName?: string,
  existingId?: string | number
): Promise<string | null> => {
  if (!password || !password.trim()) return null;
  const emailTrim = email.trim().toLowerCase();
  const passwordTrim = password.trim();
  const nameTrim = (fullName || emailTrim.split('@')[0]).trim();

  try {
    // 1. Try to create new user in Supabase Auth via admin API
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrim,
      password: passwordTrim,
      email_confirm: true,
      user_metadata: { full_name: nameTrim }
    });

    if (!createErr && createData?.user?.id) {
      return createData.user.id;
    }

    // 2. If creation failed (e.g. email already exists in Auth):
    // Search auth.users for existing user by email
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = listData?.users?.find(
      (u: any) => u.email?.toLowerCase() === emailTrim
    );

    if (existingAuthUser?.id) {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        password: passwordTrim,
        email_confirm: true,
        user_metadata: { full_name: nameTrim }
      });
      if (updateErr) console.warn('updateUserById error:', updateErr.message);
      return existingAuthUser.id;
    }

    // 3. Fallback: try update using existingId if provided
    if (existingId) {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingId.toString(), {
        password: passwordTrim,
        email_confirm: true
      });
      if (!updateErr) return existingId.toString();
    }
  } catch (adminEx) {
    console.warn('ensureAuthUserWithPassword admin exception:', adminEx);
  }

  // 4. Client-side fallback via supabase.auth.signUp if service role key not available
  try {
    const { data: signUpData } = await supabase.auth.signUp({
      email: emailTrim,
      password: passwordTrim,
      options: { data: { full_name: nameTrim } }
    });
    if (signUpData?.user?.id) return signUpData.user.id;
  } catch (signUpEx) {
    console.warn('signUp fallback exception:', signUpEx);
  }

  return null;
};
