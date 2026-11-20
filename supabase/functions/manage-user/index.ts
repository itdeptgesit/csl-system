import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify the caller is authenticated and is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create client with user's token to verify their identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is admin/super admin
    const { data: profile } = await supabaseAdmin
      .from('user_accounts')
      .select('role, groups')
      .eq('email', user.email)
      .single()

    const isAdmin = profile && (
      profile.role === 'admin' || 
      profile.role === 'super_admin' || 
      profile.role === 'super admin' ||
      (Array.isArray(profile.groups) && profile.groups.some(g => g.toLowerCase().includes('admin')))
    )

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action, ...params } = body

    switch (action) {
      case 'list': {
        // List all users for admin dropdowns
        const { data, error } = await supabaseAdmin
          .from('user_accounts')
          .select('id, full_name, email, role, groups, company, department, job_title, status, avatar_url, created_at')
          .order('full_name')
        
        if (error) throw error
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'create': {
        const { email, password, full_name, role, groups, company, department, job_title } = params
        
        // Create auth user first
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password: password,
          email_confirm: true,
          user_metadata: { full_name: full_name?.trim() }
        })
        
        if (authError) throw authError
        
        // Create user_accounts record
        const userId = authData.user.id
        const { error: profileError } = await supabaseAdmin
          .from('user_accounts')
          .insert([{
            id: userId,
            username: email.split('@')[0],
            full_name: full_name?.trim(),
            email: email.toLowerCase().trim(),
            role: role || 'user',
            groups: groups || ['user'],
            company: company || 'GESIT',
            department: department || 'Other',
            job_title: job_title || '',
            status: 'Active',
          }])
        
        if (profileError) {
          // Rollback auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(userId)
          throw profileError
        }
        
        return new Response(JSON.stringify({ data: { id: userId } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update': {
        const { id, email, password, full_name, role, groups, e_sign_url, company, department, job_title, status } = params
        
        const updatePayload: any = {}
        if (full_name !== undefined) updatePayload.full_name = full_name.trim()
        if (email !== undefined) updatePayload.email = email.toLowerCase().trim()
        if (role !== undefined) updatePayload.role = role
        if (groups !== undefined) updatePayload.groups = groups
        if (e_sign_url !== undefined) updatePayload.e_sign_url = e_sign_url
        if (company !== undefined) updatePayload.company = company
        if (department !== undefined) updatePayload.department = department
        if (job_title !== undefined) updatePayload.job_title = job_title
        if (status !== undefined) updatePayload.status = status
        
        // Update user_accounts
        const { error: profileError } = await supabaseAdmin
          .from('user_accounts')
          .update(updatePayload)
          .eq('id', id)
        
        if (profileError) throw profileError
        
        // Update auth user email or password if changed
        const authUpdates: any = {}
        if (email !== undefined) authUpdates.email = email.toLowerCase().trim()
        if (password !== undefined && password.trim()) authUpdates.password = password.trim()
        if (full_name !== undefined) authUpdates.user_metadata = { full_name: full_name.trim() }

        if (Object.keys(authUpdates).length > 0) {
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates)
          if (authError) throw authError
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'set_password': {
        const { id, email, password } = params
        let targetId = id
        if (!targetId && email) {
          const { data: userRecord } = await supabaseAdmin
            .from('user_accounts')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .single()
          targetId = userRecord?.id
        }
        if (!targetId && email) {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
          const found = listData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase().trim())
          if (found) targetId = found.id
        }
        if (!targetId) {
          throw new Error('User not found in system')
        }
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
          password: password.trim()
        })
        if (authError) throw authError

        return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'delete': {
        const { id } = params
        
        // Delete from user_accounts first
        const { error: profileError } = await supabaseAdmin
          .from('user_accounts')
          .delete()
          .eq('id', id)
        
        if (profileError) throw profileError
        
        // Delete auth user
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
        if (authError) throw authError
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_groups': {
        const { id, groups } = params
        
        const { error } = await supabaseAdmin
          .from('user_accounts')
          .update({ groups })
          .eq('id', id)
        
        if (error) throw error
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (err) {
    console.error('manage-user error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})