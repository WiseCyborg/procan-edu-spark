import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[ACCEPT-INVITE] Request received');

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Please log in to accept the invitation' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user session
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Invalid session. Please log in again.' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ACCEPT-INVITE] User authenticated:', user.email);

    // Parse request
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_REQUEST', message: 'Invite token is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the invite
    const { data: invite, error: inviteError } = await serviceClient
      .from('org_invites')
      .select('*, organizations(id, name)')
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (inviteError || !invite) {
      console.error('[ACCEPT-INVITE] Invite not found:', inviteError);
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_TOKEN', message: 'Invitation not found or already used' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'EXPIRED', message: 'This invitation has expired. Please request a new one.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      console.warn('[ACCEPT-INVITE] Email mismatch:', { invite: invite.email, user: user.email });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'EMAIL_MISMATCH', 
          message: `This invitation was sent to ${invite.email}. Please log in with that email address.` 
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ACCEPT-INVITE] Processing invite:', { role: invite.role, org: invite.organization_id });

    // Update organization_members
    const { error: memberError } = await serviceClient
      .from('organization_members')
      .update({
        user_id: user.id,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', invite.organization_id)
      .eq('email', invite.email.toLowerCase())
      .eq('role', invite.role);

    if (memberError) {
      console.error('[ACCEPT-INVITE] Failed to update member:', memberError);
      return new Response(
        JSON.stringify({ success: false, error: 'UPDATE_FAILED', message: 'Failed to activate membership' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark invite as accepted
    await serviceClient
      .from('org_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    // Map role to user_roles role
    const roleMapping: Record<string, string> = {
      'dispensary_admin': 'dispensary_manager',
      'training_coordinator': 'training_coordinator',
      'employee': 'student'
    };

    const userRole = roleMapping[invite.role] || 'student';

    // Insert user_role (upsert to handle existing)
    await serviceClient
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: userRole
      }, { 
        onConflict: 'user_id,role',
        ignoreDuplicates: true
      });

    // Update profile with organization
    await serviceClient
      .from('profiles')
      .update({ 
        active_organization_id: invite.organization_id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    console.log('[ACCEPT-INVITE] ✅ Invite accepted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          organization_id: invite.organization_id,
          organization_name: invite.organizations?.name,
          role: invite.role,
          message: `Welcome! You are now a ${invite.role.replace('_', ' ')} at ${invite.organizations?.name || 'the organization'}.`
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ACCEPT-INVITE] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR', message: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
