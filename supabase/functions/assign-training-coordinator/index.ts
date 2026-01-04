import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignCoordinatorRequest {
  organization_id: string;
  user_email: string;
  assigned_by: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organization_id, user_email, assigned_by }: AssignCoordinatorRequest = await req.json();

    console.log('Assigning training coordinator:', { organization_id, user_email, assigned_by });

    // SECURITY: Verify the assigner identity from JWT (don't trust assigned_by from client)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Use verified user ID, not client-provided assigned_by
    const verifiedAssignerId = user.id;

    // Verify the assigner is a dispensary manager or admin
    const { data: assignerRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', verifiedAssignerId);

    const hasPermission = assignerRoles?.some(
      r => r.role === 'admin' || r.role === 'dispensary_manager'
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only managers can assign coordinators' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify manager has access to this organization
    const { data: accessCheck } = await supabase.rpc('validate_caller_org_access', {
      caller_user_id: verifiedAssignerId,
      target_org_id: organization_id
    });

    if (!accessCheck) {
      console.warn(`Unauthorized org access attempt: user ${verifiedAssignerId} -> org ${organization_id}`);
      return new Response(
        JSON.stringify({ error: 'Access denied to this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const user = existingUser.users.find(u => u.email === user_email);

    if (user) {
      // User exists, assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'training_coordinator'
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Update organization_id in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      console.log('Training coordinator role assigned to existing user');
    } else {
      // User doesn't exist - send invitation email
      console.log('User not found in system, sending invitation email');

      // Generate secure invitation token
      const invitationToken = `TC-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organization_id)
        .single();

      if (orgError) {
        throw new Error(`Failed to get organization details: ${orgError.message}`);
      }

      // Create invitation record
      const { error: inviteError } = await supabase
        .from('staff_invitations')
        .insert({
          organization_id,
          email: user_email,
          role: 'training_coordinator',
          invitation_token: invitationToken,
          inviter_id: verifiedAssignerId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            invited_by_role: 'dispensary_manager',
            invitation_method: 'coordinator_assignment',
            organization_name: orgData.name
          }
        });

      if (inviteError) {
        throw new Error(`Failed to create invitation: ${inviteError.message}`);
      }

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-employee-invitation', {
        body: {
          employeeEmail: user_email,
          organizationName: orgData.name,
          invitationToken,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          role: 'Training Coordinator'
        }
      });

      if (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't throw - invitation record exists, can be resent
      }

      console.log('Training coordinator invitation sent successfully to:', user_email);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Training coordinator assigned successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error assigning training coordinator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
