import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { check_id } = await req.json();
    const startTime = Date.now();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the check details
    const { data: check, error: checkError } = await supabaseClient
      .from('system_integrity_checks')
      .select('*')
      .eq('id', check_id)
      .single();

    if (checkError || !check) {
      throw new Error('Check not found');
    }

    if (check.check_type !== 'missing_manager_account') {
      throw new Error('Invalid check type for this fix');
    }

    const { application_id, organization_id, contact_email, contact_person } = check.technical_details;

    // Generate temporary password
    const tempPassword = `ProCann${Math.random().toString(36).slice(-8)}!`;

    // Create auth user
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email: contact_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: contact_person?.split(' ')[0] || 'Manager',
        last_name: contact_person?.split(' ').slice(1).join(' ') || '',
      }
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    // Create profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        first_name: contact_person?.split(' ')[0] || 'Manager',
        last_name: contact_person?.split(' ').slice(1).join(' ') || '',
        organization_id: organization_id
      });

    if (profileError) {
      // Rollback: delete auth user
      await supabaseClient.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // Assign dispensary_manager role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role: 'dispensary_manager'
      });

    if (roleError) {
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    // Send welcome email with credentials
    const { error: emailError } = await supabaseClient.functions.invoke('send-welcome-email', {
      body: {
        to: contact_email,
        userName: contact_person || 'Manager',
        temporaryPassword: tempPassword,
        isManagerAccount: true
      }
    });

    if (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the fix if email fails, but log it
    }

    // Mark check as fixed
    await supabaseClient
      .from('system_integrity_checks')
      .update({
        status: 'fixed',
        resolved_at: new Date().toISOString(),
        resolved_by: authUser.user.id
      })
      .eq('id', check_id);

    // Log the fix
    const duration = Date.now() - startTime;
    await supabaseClient
      .from('system_integrity_fixes')
      .insert({
        check_id: check_id,
        fix_type: 'manager_account_creation',
        fix_action: 'Created manager account, profile, and assigned role',
        executed_by: authUser.user.id,
        execution_mode: 'automatic',
        success: true,
        execution_duration_ms: duration,
        changes_made: {
          user_id: authUser.user.id,
          email: contact_email,
          organization_id: organization_id,
          roles_assigned: ['dispensary_manager'],
          email_sent: !emailError
        },
        rollback_available: true,
        rollback_data: {
          user_id: authUser.user.id,
          can_delete: true
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Manager account created successfully',
        user_id: authUser.user.id,
        email: contact_email,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-fix error:', error);
    
    // Log failed fix attempt
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { check_id } = await req.json();
      
      await supabaseClient
        .from('system_integrity_fixes')
        .insert({
          check_id: check_id,
          fix_type: 'manager_account_creation',
          fix_action: 'Attempted to create manager account',
          execution_mode: 'automatic',
          success: false,
          error_details: {
            message: error.message,
            stack: error.stack
          }
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
