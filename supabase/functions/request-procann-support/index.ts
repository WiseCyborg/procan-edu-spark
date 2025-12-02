import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupportRequest {
  requestType: 'chat_escalation' | 'video_call_request' | 'general_inquiry';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description?: string;
  conversationId?: string;
  scheduledCallTime?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: SupportRequest = await req.json();

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    // Create support request
    const { data: supportRequest, error: insertError } = await supabase
      .from('support_requests')
      .insert({
        requester_id: user.id,
        organization_id: profile?.organization_id,
        request_type: requestData.requestType,
        priority: requestData.priority || 'medium',
        subject: requestData.subject,
        description: requestData.description,
        conversation_id: requestData.conversationId,
        scheduled_call_time: requestData.scheduledCallTime,
        metadata: {
          requester_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
          requested_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Get all admin users to notify
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id, profiles:user_id(email_cache, first_name)')
      .eq('role', 'admin');

    // Queue notification jobs for each admin
    if (adminUsers && adminUsers.length > 0) {
      for (const admin of adminUsers) {
        await supabase.rpc('queue_job', {
          p_job_type: 'admin_alert',
          p_payload: {
            alert_type: 'support_request_created',
            support_request_id: supportRequest.id,
            requester_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            request_type: requestData.requestType,
            priority: requestData.priority || 'medium',
            subject: requestData.subject,
            admin_email: (admin.profiles as any)?.email_cache,
            admin_name: (admin.profiles as any)?.first_name
          }
        });
      }
    }

    console.log(`Support request created: ${supportRequest.id} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        supportRequestId: supportRequest.id,
        message: 'Support request created successfully. A ProCann team member will be with you shortly.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating support request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create support request'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
