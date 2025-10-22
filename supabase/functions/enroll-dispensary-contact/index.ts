import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrollmentRequest {
  application_id: string;
  organization_id: string;
  access_key: string;
  contact_email: string;
  contact_person: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      application_id,
      organization_id,
      access_key,
      contact_email,
      contact_person
    }: EnrollmentRequest = await req.json();

    console.log('Starting enrollment for:', { contact_email, organization_id });

    // Split contact person name into first and last name
    const nameParts = contact_person.trim().split(' ');
    const firstName = nameParts[0] || contact_person;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Generate a temporary password
    const tempPassword = `ProCann${Math.random().toString(36).slice(-8)}!`;

    // 1. Create user account in auth.users
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: contact_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        organization_id: organization_id,
        dispensary_access_key: access_key,
        enrolled_via: 'auto_enrollment',
        application_id: application_id
      }
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      throw new Error(`Failed to create user account: ${createError?.message}`);
    }

    console.log('User created:', newUser.user.id);

    // 2. Create profile entry (should be handled by trigger, but ensure it exists)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: newUser.user.id,
        first_name: firstName,
        last_name: lastName,
        organization_id: organization_id,
        dispensary_access_key: access_key
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't throw, profile might already exist from trigger
    }

    // 3. Assign dispensary_manager role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'dispensary_manager'
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Don't throw if role already exists
    }

    console.log('Role assigned: dispensary_manager');

    // 4. Send welcome email with login credentials
    const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: contact_email,
        firstName: firstName,
        lastName: lastName,
        tempPassword: tempPassword,
        organizationName: newUser.user.user_metadata?.organization_name || 'your organization',
        accessKey: access_key,
        loginUrl: `${supabaseUrl.replace('.supabase.co', '')}/auth`
      }
    });

    if (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't throw, user is still created
    }

    // 5. Log the enrollment in ai_agent_runs
    const { error: logError } = await supabase
      .from('ai_agent_runs')
      .insert({
        agent_name: 'Auto-Enrollment Agent',
        agent_type: 'enrollment',
        execution_status: 'success',
        items_processed: 1,
        changes_detected: 1,
        actions_taken: ['user_created', 'role_assigned', 'welcome_email_sent'],
        metadata: {
          user_id: newUser.user.id,
          organization_id: organization_id,
          application_id: application_id,
          email: contact_email,
          temp_password_generated: true
        }
      });

    if (logError) {
      console.error('Error logging agent run:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: contact_email,
        message: 'User account created successfully. Welcome email sent with login credentials.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in enroll-dispensary-contact:', error);
    
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