import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMAINS } from "../_shared/domains.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quantity, reason, organizationId, requesterId } = await req.json();
    
    if (!quantity || !organizationId || !requesterId) {
      throw new Error('Missing required fields');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log('[REQUEST-SEATS] Creating seat request:', { organizationId, requesterId, quantity });

    // Create seat request
    const { data: request, error: requestError } = await supabase
      .from('seat_requests')
      .insert({
        organization_id: organizationId,
        requested_by: requesterId,
        quantity,
        reason: reason || null,
        status: 'pending'
      })
      .select()
      .single();

    if (requestError) {
      console.error('[REQUEST-SEATS] Error creating request:', requestError);
      throw requestError;
    }

    console.log('[REQUEST-SEATS] Request created:', request.id);

    // Get requester info
    const { data: requester } = await supabase
      .from('profiles')
      .select('first_name, last_name, email_cache')
      .eq('user_id', requesterId)
      .single();

    // Get manager emails
    const { data: managers } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(email_cache, first_name, last_name)')
      .eq('role', 'dispensary_manager')
      .eq('profiles.organization_id', organizationId);

    console.log('[REQUEST-SEATS] Found', managers?.length || 0, 'managers to notify');

    // Send notification emails to all managers
    for (const manager of managers || []) {
      const approvalLink = DOMAINS.getApprovalUrl(request.id);
      
      await supabase.rpc('queue_job', {
        p_job_type: 'send_seat_request_email',
        p_payload: {
          manager_email: manager.profiles.email_cache,
          manager_name: manager.profiles.first_name,
          requester_name: `${requester?.first_name} ${requester?.last_name}`,
          requester_email: requester?.email_cache,
          quantity,
          reason: reason || 'No reason provided',
          request_id: request.id,
          approval_link: approvalLink
        },
        p_organization_id: organizationId
      });

      console.log('[REQUEST-SEATS] Queued email for manager:', manager.profiles.email_cache);
    }

    return new Response(
      JSON.stringify({ success: true, request }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('[REQUEST-SEATS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
