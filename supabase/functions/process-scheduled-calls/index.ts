import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[ScheduledCalls] Processing scheduled calls...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current time and 5 minutes from now
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find calls that should start in the next 5 minutes
    const { data: upcomingCalls, error: callsError } = await supabaseAdmin
      .from('scheduled_calls')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', fiveMinutesFromNow.toISOString());

    if (callsError) throw callsError;

    console.log(`[ScheduledCalls] Found ${upcomingCalls?.length || 0} calls to process`);

    let processed = 0;
    let failed = 0;

    for (const call of upcomingCalls || []) {
      try {
        // Create video call
        const roomName = `scheduled-${call.id}`;
        
        const { data: videoCall, error: videoCallError } = await supabaseAdmin
          .from('video_calls')
          .insert({
            room_name: roomName,
            conversation_id: call.conversation_id,
            host_id: call.host_id,
            started_at: call.scheduled_at,
            status: 'active',
            is_recording: false
          })
          .select()
          .single();

        if (videoCallError) throw videoCallError;

        // Update scheduled call with video_call_id
        const { error: updateError } = await supabaseAdmin
          .from('scheduled_calls')
          .update({
            video_call_id: videoCall.id,
            status: 'started'
          })
          .eq('id', call.id);

        if (updateError) throw updateError;

        // Get all invites
        const { data: invites } = await supabaseAdmin
          .from('scheduled_call_invites')
          .select('user_id')
          .eq('scheduled_call_id', call.id);

        // Send reminder notifications (via push or email)
        if (invites && invites.length > 0) {
          for (const invite of invites) {
            try {
              await supabaseAdmin.functions.invoke('send-call-reminder', {
                body: {
                  userId: invite.user_id,
                  callTitle: call.title,
                  callUrl: `/communications?call=${videoCall.room_name}`
                }
              });
            } catch (err) {
              console.error('[ScheduledCalls] Failed to send reminder:', err);
            }
          }
        }

        processed++;
        console.log(`[ScheduledCalls] Processed call: ${call.title}`);

      } catch (error) {
        failed++;
        console.error(`[ScheduledCalls] Failed to process call ${call.id}:`, error);
      }
    }

    console.log(`[ScheduledCalls] Complete. Processed: ${processed}, Failed: ${failed}`);

    return new Response(JSON.stringify({ processed, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ScheduledCalls] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
