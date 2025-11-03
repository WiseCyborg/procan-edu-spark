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
    const { application_id, credits = 10, idempotency_key } = await req.json();

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

    // Call RPC with service role, passing verified admin user ID
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
