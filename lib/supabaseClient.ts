import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials missing in environment variables');
}

// Browser client only. This client always obeys RLS.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Backward-compatible alias for components. It does not bypass RLS.
export const supabaseAdmin = supabase;

export const ensureAuthUserWithPassword = async (
  email: string,
  password?: string,
  fullName?: string,
  existingId?: string | number
): Promise<string | null> => {
  if (!password?.trim()) return null;

  const { data, error } = await supabase.functions.invoke('manage-user', {
    body: {
      email: email.trim().toLowerCase(),
      password: password.trim(),
      fullName: (fullName || email.split('@')[0]).trim(),
      existingId: existingId?.toString(),
    },
  });

  if (error || !data?.id) {
    console.error('Secure manage-user provisioning failed:', error?.message || 'No user id returned');
    return null;
  }

  return data.id;
};
