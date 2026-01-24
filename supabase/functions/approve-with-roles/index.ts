import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoleAssignment {
  email: string;
  role: 'dispensary_admin' | 'training_coordinator' | 'employee';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[APPROVE-WITH-ROLES] Request received');

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'SESSION_EXPIRED', message: 'No authentication token provided' }), 
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
        JSON.stringify({ success: false, error: 'SESSION_EXPIRED', message: 'Invalid or expired session' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[APPROVE-WITH-ROLES] User authenticated:', user.email);

    // Check admin role
    const { data: roles, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roles) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Admin access required' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { application_id, idempotency_key, assignments = [] } = await req.json() as {
      application_id: string;
      idempotency_key: string;
      assignments: RoleAssignment[];
    };

    if (!application_id || !idempotency_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_REQUEST', message: 'application_id and idempotency_key required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client for privileged operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check idempotency
    const { data: existingRequest } = await serviceClient
      .from('api_requests')
      .select('*')
      .eq('idempotency_key', idempotency_key)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existingRequest) {
      console.log('[APPROVE-WITH-ROLES] Returning cached result');
      return new Response(
        JSON.stringify({ success: true, data: existingRequest.response_data, cached: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch application
    const { data: appData, error: fetchError } = await serviceClient
      .from('dispensary_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (fetchError || !appData) {
      return new Response(
        JSON.stringify({ success: false, error: 'NOT_FOUND', message: 'Application not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credits = appData.estimated_employees || appData.requested_credits || 10;

    console.log('[APPROVE-WITH-ROLES] Calling approval RPC:', { application_id, credits });

    // Call approval RPC
    const { data: rpcData, error: rpcError } = await serviceClient.rpc(
      'approve_dispensary_application',
      { application_id, credits, calling_user_id: user.id }
    );

    if (rpcError) {
      console.error('[APPROVE-WITH-ROLES] RPC error:', rpcError);
      // Return 200 with structured error for client parsing
      return new Response(
        JSON.stringify({ success: false, error: 'RPC_ERROR', message: rpcError.message }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rpcData || !Array.isArray(rpcData) || rpcData.length === 0 || !rpcData[0].success) {
      const message = rpcData?.[0]?.message || 'Approval failed';
      const errorCode = rpcData?.[0]?.error_code || 'APPROVAL_FAILED';
      console.error('[APPROVE-WITH-ROLES] Approval failed:', message, 'Code:', errorCode);
      // Return 200 with structured error so client can parse and show appropriate message
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorCode, 
          message,
          invite_required: rpcData?.[0]?.invite_required || false
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = rpcData[0];
    const organizationId = result.organization_id;

    console.log('[APPROVE-WITH-ROLES] Approval successful, org:', organizationId);

    // Process role assignments
    const inviteResults: Array<{ email: string; role: string; success: boolean; error?: string }> = [];

    for (const assignment of assignments) {
      try {
        // Generate invite token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

        // Upsert organization_members
        const { error: memberError } = await serviceClient
          .from('organization_members')
          .upsert({
            organization_id: organizationId,
            email: assignment.email.toLowerCase(),
            role: assignment.role,
            status: 'invited',
            invited_by: user.id,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'organization_id,email,role',
            ignoreDuplicates: false
          });

        if (memberError) {
          console.error('[APPROVE-WITH-ROLES] Member upsert error:', memberError);
          inviteResults.push({ email: assignment.email, role: assignment.role, success: false, error: memberError.message });
          continue;
        }

        // Upsert org_invites
        const { error: inviteError } = await serviceClient
          .from('org_invites')
          .upsert({
            organization_id: organizationId,
            email: assignment.email.toLowerCase(),
            role: assignment.role,
            token,
            expires_at: expiresAt.toISOString(),
            invited_by: user.id
          }, { 
            onConflict: 'organization_id,email,role',
            ignoreDuplicates: false
          });

        if (inviteError) {
          console.error('[APPROVE-WITH-ROLES] Invite upsert error:', inviteError);
          inviteResults.push({ email: assignment.email, role: assignment.role, success: false, error: inviteError.message });
          continue;
        }

        // Queue invite email
        const inviteUrl = `https://procann-edu.lovable.app/accept-invite?token=${token}`;
        
        await serviceClient.from('notification_queue').insert({
          recipient_email: assignment.email,
          subject: `🎓 You've been invited to join ${appData.organization_name}`,
          message: `You've been assigned as ${assignment.role.replace('_', ' ')} for ${appData.organization_name}. Click the link to accept your invitation.`,
          scheduled_for: new Date().toISOString(),
          priority: 'high',
          metadata: {
            template: 'org-invite',
            ContactPerson: assignment.email.split('@')[0],
            OrganizationName: appData.organization_name,
            Role: assignment.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            InviteUrl: inviteUrl,
            ExpiresAt: expiresAt.toLocaleDateString()
          }
        });

        inviteResults.push({ email: assignment.email, role: assignment.role, success: true });
        console.log('[APPROVE-WITH-ROLES] Invite sent:', assignment.email, assignment.role);

      } catch (err: any) {
        console.error('[APPROVE-WITH-ROLES] Assignment error:', err);
        inviteResults.push({ email: assignment.email, role: assignment.role, success: false, error: err.message });
      }
    }

    // Queue payment email
    try {
      const pricePerCredit = 49;
      const totalAmount = credits * pricePerCredit;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      
      await serviceClient.from('notification_queue').insert({
        recipient_email: appData.contact_email,
        subject: '💳 Payment Required - Complete Your Registration',
        message: 'Your application has been approved. Please complete payment to activate your account.',
        scheduled_for: new Date().toISOString(),
        priority: 'high',
        metadata: {
          template: 'payment-link',
          ContactPerson: appData.contact_person,
          OrganizationName: appData.organization_name,
          Credits: credits,
          TotalAmount: `$${totalAmount.toLocaleString()}`,
          PaymentDeadline: deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          PaymentUrl: `https://procann-edu.lovable.app/payment?application_id=${application_id}`,
          PaymentAmount: totalAmount,
          ApplicationId: application_id
        }
      });
      console.log('[APPROVE-WITH-ROLES] Payment email queued');
    } catch (emailError: any) {
      console.error('[APPROVE-WITH-ROLES] Failed to queue payment email:', emailError);
    }

    // Cache result
    const responseData = {
      ...result,
      invite_results: inviteResults,
      invites_sent: inviteResults.filter(r => r.success).length,
      invites_failed: inviteResults.filter(r => !r.success).length
    };

    await serviceClient.from('api_requests').insert({
      idempotency_key,
      api_route: 'approve-with-roles',
      user_id: user.id,
      request_params: { application_id, credits, assignments },
      response_data: responseData,
      success: true
    });

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[APPROVE-WITH-ROLES] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR', message: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
