import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivateUserRequest {
  email: string;
  organization_id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !callerUser) {
      throw new Error('Unauthorized');
    }

    // Check if caller is admin
    const { data: callerRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id);
    
    const isAdmin = callerRoles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { email, organization_id, first_name, last_name, role = 'dispensary_manager' }: ActivateUserRequest = await req.json();

    if (!email || !organization_id) {
      throw new Error('Email and organization_id are required');
    }

    console.log('Admin activating user:', { email, organization_id, role });

    // Step 1: Check if user already exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      console.log('User already exists in auth.users:', existingUser.id);
      userId = existingUser.id;
      
      // Ensure email is confirmed
      if (!existingUser.email_confirmed_at) {
        await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true
        });
        console.log('Email confirmed for existing user');
      }
    } else {
      // Step 2: Create new auth user
      console.log('Creating new auth user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          first_name: first_name || '',
          last_name: last_name || '',
          organization_id: organization_id,
          activated_by_admin: true
        }
      });

      if (createError || !newUser.user) {
        throw new Error(`Failed to create user: ${createError?.message}`);
      }

      userId = newUser.user.id;
      console.log('New user created:', userId);
    }

    // Step 3: Ensure profile exists
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        first_name: first_name || email.split('@')[0],
        last_name: last_name || '',
        organization_id: organization_id,
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
    }

    // Step 4: Ensure role exists
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role
      }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: true
      });

    if (roleError) {
      console.error('Role upsert error:', roleError);
    }

    // Step 5: Ensure organization_members record exists
    const { error: memberError } = await supabase
      .from('organization_members')
      .upsert({
        user_id: userId,
        organization_id: organization_id,
        role: role === 'dispensary_manager' ? 'manager' : 'member',
        status: 'active',
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id',
        ignoreDuplicates: true
      });

    if (memberError) {
      console.error('Organization member upsert error:', memberError);
    }

    // Step 6: Send password reset email
    console.log('Sending password reset email...');
    const resetUrl = 'https://www.procannedu.com/auth/callback';
    
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: resetUrl
      }
    });

    if (resetError) {
      console.error('Failed to generate recovery link:', resetError);
      // Try alternative method
      const { error: altResetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl
      });
      
      if (altResetError) {
        console.error('Alternative reset also failed:', altResetError);
      }
    }

    // Step 7: Log the activation
    await supabase
      .from('admin_operations_audit')
      .insert({
        operation_type: 'user_activation',
        performed_by: callerUser.id,
        target_email: email,
        target_user_id: userId,
        success: true,
        metadata: {
          organization_id,
          role,
          was_existing_user: !!existingUser
        }
      });

    console.log('User activation complete:', { userId, email });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: email,
        was_existing_user: !!existingUser,
        message: 'User activated successfully. Password reset email sent.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in admin-activate-user:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
