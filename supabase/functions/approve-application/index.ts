import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[APPROVE-APPLICATION] Request received');

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[APPROVE-APPLICATION] No authorization header');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SESSION_EXPIRED',
          message: 'No authentication token provided' 
        }), 
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create client with user's token to verify identity
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user session
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error('[APPROVE-APPLICATION] Invalid session:', userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SESSION_EXPIRED',
          message: 'Invalid or expired session. Please log in again.' 
        }), 
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[APPROVE-APPLICATION] User authenticated:', user.email);

    // Check if user has admin role
    const { data: roles, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roles) {
      console.error('[APPROVE-APPLICATION] User not admin:', user.email);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UNAUTHORIZED_NOT_ADMIN',
          message: 'Admin access required. Your account does not have admin permissions.' 
        }), 
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[APPROVE-APPLICATION] Admin verified:', user.email);

    // Parse request body
    const { application_id, idempotency_key } = await req.json();

    if (!application_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'INVALID_REQUEST',
          message: 'application_id is required' 
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!idempotency_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'MISSING_IDEMPOTENCY_KEY',
          message: 'idempotency_key is required' 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch application to get estimated_employees
    const { data: appData, error: fetchError } = await serviceClient
      .from('dispensary_applications')
      .select('estimated_employees, requested_credits')
      .eq('id', application_id)
      .single();

    if (fetchError) {
      console.error('[APPROVE-APPLICATION] Failed to fetch application:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'FETCH_ERROR',
          message: 'Could not retrieve application details' 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use estimated_employees if available, fallback to requested_credits, then 10
    const credits = appData?.estimated_employees || appData?.requested_credits || 10;

    console.log('[APPROVE-APPLICATION] Allocating credits:', {
      application_id,
      estimated_employees: appData?.estimated_employees,
      requested_credits: appData?.requested_credits,
      final_credits: credits
    });

    // Check for existing request (idempotency)
    const { data: existingRequest } = await serviceClient
      .from('api_requests')
      .select('*')
      .eq('idempotency_key', idempotency_key)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existingRequest) {
      console.log('[APPROVE-APPLICATION] Idempotency check: returning cached result');
      return new Response(
        JSON.stringify({
          success: true,
          data: existingRequest.response_data,
          cached: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[APPROVE-APPLICATION] Calling RPC with service role for application:', application_id);

    // PHASE 4: Call RPC with service role (atomic transaction)
    const { data, error: rpcError } = await serviceClient.rpc(
      'approve_dispensary_application',
      {
        application_id,
        credits,
        calling_user_id: user.id  // Pass verified admin user ID explicitly
      }
    );

    if (rpcError) {
      console.error('[APPROVE-APPLICATION] RPC error:', rpcError);
      
      // PHASE 4: Log approval failure for monitoring
      await serviceClient.from('pipeline_health_log').insert({
        check_type: 'approval_failure',
        status: 'critical',
        error_count: 1,
        last_error_message: rpcError.message,
        metadata: {
          application_id,
          credits,
          admin_user_id: user.id,
          error: rpcError.message
        }
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RPC_ERROR',
          message: rpcError.message,
          details: rpcError
        }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[APPROVE-APPLICATION] RPC response:', data);

    // Check if RPC returned success: false
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('[APPROVE-APPLICATION] Invalid RPC response - no data');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'INVALID_RESPONSE',
          message: 'Invalid response from approval function' 
        }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const result = data[0];

    if (!result.success) {
      console.error('[APPROVE-APPLICATION] Approval failed:', result.message);
      
      // PHASE 4: Log partial failure
      await serviceClient.from('pipeline_health_log').insert({
        check_type: 'approval_partial_failure',
        status: 'degraded',
        error_count: 1,
        last_error_message: result.message,
        metadata: {
          application_id,
          credits,
          result
        }
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'APPROVAL_FAILED',
          message: result.message
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[APPROVE-APPLICATION] ✅ Approval successful for:', result.organization_id);

    // PHASE 4: Verify organization was created
    const { data: orgVerification } = await serviceClient
      .from('organizations')
      .select('id, name')
      .eq('id', result.organization_id)
      .single();

    if (!orgVerification) {
      console.error('[APPROVE-APPLICATION] Organization verification failed - organization not found');
      await serviceClient.from('pipeline_health_log').insert({
        check_type: 'approval_verification_failure',
        status: 'critical',
        error_count: 1,
        last_error_message: 'Organization not found after approval',
        metadata: {
          application_id,
          expected_org_id: result.organization_id
        }
      });
    }

    // PHASE 4: Log successful approval
    await serviceClient.from('pipeline_health_log').insert({
      check_type: 'approval_success',
      status: 'healthy',
      success_count: 1,
      metadata: {
        application_id,
        organization_id: result.organization_id,
        credits,
        admin_user_id: user.id
      }
    });

    // Step 3: Wire Payment Flow - Send payment link email after successful approval
    try {
      const { data: appData } = await serviceClient
        .from('dispensary_applications')
        .select('contact_email, organization_name, payment_amount')
        .eq('id', application_id)
        .single();

      if (appData) {
        console.log('[APPROVE-APPLICATION] Sending payment link email to:', appData.contact_email);
        
        // Insert into notification queue for payment link
        await serviceClient.from('notification_queue').insert({
          recipient_email: appData.contact_email,
          subject: '💳 Payment Required - Complete Your Registration',
          message: 'Your application has been approved. Please complete payment to activate your account.',
          scheduled_for: new Date().toISOString(),
          priority: 'high',
          metadata: {
            template: 'payment-link',
            OrganizationName: appData.organization_name,
            PaymentAmount: appData.payment_amount || 0,
            ApplicationId: application_id
          }
        });
        
        console.log('[APPROVE-APPLICATION] ✅ Payment link email queued');
      }
    } catch (emailError: any) {
      console.error('[APPROVE-APPLICATION] Failed to queue payment email:', emailError);
      // Don't fail the approval if email queueing fails
    }

    // Cache the result for idempotency
    await serviceClient.from('api_requests').insert({
      idempotency_key,
      api_route: 'approve-application',
      user_id: user.id,
      request_params: { application_id, credits },
      response_data: result,
      success: true
    });

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[APPROVE-APPLICATION] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred'
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
