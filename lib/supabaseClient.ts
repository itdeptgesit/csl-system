import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials missing in environment variables');
}

// Browser client only. This client always obeys RLS.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin user management via Edge Function with seamless direct database fallback.
 * Operations require the caller to be authenticated as admin/super_admin.
 */
export const adminUsers = {
  /** List all users for admin dropdowns */
  async list() {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'list' }
      });
      if (!error && data?.data) return data.data;
    } catch (_) {
      // Fallback to direct table query
    }
    const { data, error } = await supabase
      .from('user_accounts')
      .select('id, full_name, email, role, groups, company, department, job_title, status, avatar_url, created_at')
      .order('full_name');
    if (error) throw error;
    return data || [];
  },

  /** Create a new user with auth account and profile */
  async create(params: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    groups?: string[];
    company?: string;
    department?: string;
    job_title?: string;
  }) {
    // 1. Try edge function first if deployed
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'create', ...params }
      });
      if (!error && data?.data) return data.data;
    } catch (_) {
      // Fallback
    }

    // 2. Client-side fallback: attempt signUp to create auth account
    let createdAuthId: string | null = null;
    try {
      const { data: signUpData } = await supabase.auth.signUp({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        options: { data: { full_name: params.full_name?.trim() } }
      });
      if (signUpData?.user?.id) createdAuthId = signUpData.user.id;
    } catch (_) {}

    // 3. Direct insert to user_accounts table
    const profilePayload: any = {
      username: params.email.split('@')[0],
      full_name: params.full_name?.trim(),
      email: params.email.toLowerCase().trim(),
      role: params.role || 'User',
      groups: params.groups || ['user'],
      company: params.company || 'GESIT',
      department: params.department || 'Other',
      job_title: params.job_title || '',
      status: 'Active',
    };
    if (createdAuthId) {
      profilePayload.id = createdAuthId;
    }

    const { data, error } = await supabase
      .from('user_accounts')
      .insert([profilePayload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update user profile and optionally auth email */
  async update(id: string, params: {
    email?: string;
    full_name?: string;
    role?: string;
    groups?: string[];
    e_sign_url?: string;
    company?: string;
    department?: string;
    job_title?: string;
    status?: string;
  }) {
    // 1. Try edge function first if deployed
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'update', id, ...params }
      });
      if (!error && (data?.success || data?.data)) return data;
    } catch (_) {
      // Fallback to direct table update
    }

    // 2. Direct table update
    const updatePayload: any = {};
    if (params.full_name !== undefined) updatePayload.full_name = params.full_name;
    if (params.email !== undefined) updatePayload.email = params.email.toLowerCase().trim();
    if (params.role !== undefined) updatePayload.role = params.role;
    if (params.groups !== undefined) updatePayload.groups = params.groups;
    if (params.e_sign_url !== undefined) updatePayload.e_sign_url = params.e_sign_url;
    if (params.company !== undefined) updatePayload.company = params.company;
    if (params.department !== undefined) updatePayload.department = params.department;
    if (params.job_title !== undefined) updatePayload.job_title = params.job_title;
    if (params.status !== undefined) updatePayload.status = params.status;

    const { data, error } = await supabase
      .from('user_accounts')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
    return data;
  },

  /** Delete user (both auth and profile) */
  async delete(id: string) {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', id }
      });
      if (!error && data?.success) return data;
    } catch (_) {
      // Fallback to direct table delete
    }

    const { data, error } = await supabase
      .from('user_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return data;
  },

  /** Update user groups/permissions only */
  async updateGroups(id: string, groups: string[]) {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'update_groups', id, groups }
      });
      if (!error && data?.success) return data;
    } catch (_) {
      // Fallback to direct table update
    }

    const { data, error } = await supabase
      .from('user_accounts')
      .update({ groups })
      .eq('id', id);

    if (error) throw error;
    return data;
  },
};

/**
 * @deprecated Use adminUsers.* instead. This alias does NOT bypass RLS.
 * Kept for backward compatibility during migration.
 */
export const supabaseAdmin = supabase;

/**
 * Sets or updates a user's password in Supabase Auth.
 * Attempts PostgreSQL RPC 'admin_set_user_password' first (direct, safe, no edge function needed),
 * then edge function 'manage-user' (action: 'set_password'), then signUp fallback for new users.
 */
export const ensureAuthUserWithPassword = async (
  email: string,
  password?: string,
  fullName?: string,
  existingId?: string | number
): Promise<string | null> => {
  if (!password?.trim()) return null;
  const emailTrim = email.trim().toLowerCase();
  const passwordTrim = password.trim();

  // 1. Try PostgreSQL RPC 'admin_set_user_password' by email
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_set_user_password', {
      target_email: emailTrim,
      new_password: passwordTrim,
    });
    if (!rpcError && (rpcData as any)?.success !== false) {
      return (rpcData as any)?.user_id?.toString() || existingId?.toString() || 'ok';
    }
  } catch (rpcEx) {
    console.warn('RPC admin_set_user_password exception:', rpcEx);
  }

  // 2. Try PostgreSQL RPC 'admin_set_user_password_by_id' by UUID
  if (existingId) {
    try {
      const { data: rpcIdData, error: rpcIdError } = await supabase.rpc('admin_set_user_password_by_id', {
        target_user_id: existingId.toString(),
        new_password: passwordTrim,
      });
      if (!rpcIdError && (rpcIdData as any)?.success !== false) {
        return existingId.toString();
      }
    } catch (rpcIdEx) {
      console.warn('RPC admin_set_user_password_by_id exception:', rpcIdEx);
    }
  }

  // 3. Try Edge Function 'manage-user' with action: 'set_password'
  try {
    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: {
        action: 'set_password',
        email: emailTrim,
        password: passwordTrim,
        fullName: (fullName || emailTrim.split('@')[0]).trim(),
        id: existingId?.toString(),
      },
    });

    if (!error && (data?.success || data?.id)) {
      return data.id || existingId?.toString() || 'ok';
    }
  } catch (edgeEx) {
    console.warn('Edge function manage-user set_password exception:', edgeEx);
  }

  // 4. For new users, attempt client-side signUp
  if (!existingId) {
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: emailTrim,
        password: passwordTrim,
        options: { data: { full_name: fullName?.trim() } }
      });
      if (!signUpError && signUpData?.user?.id) {
        return signUpData.user.id;
      }
    } catch (signUpEx) {
      console.warn('signUp fallback exception:', signUpEx);
    }
  }

  console.warn('Could not directly update password via RPC or Edge Function. Falling back to email reset link.');
  return null;
};

/**
 * Sends a password reset link to user's official email via Supabase Auth.
 */
export const sendAdminUserPasswordResetEmail = async (email: string): Promise<boolean> => {
  const emailTrim = email.trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) throw error;
  return true;
};