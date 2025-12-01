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
    const { callId } = await req.json();
    const authHeader = req.headers.get('Authorization')!;

    console.log('[Recording] Stopping recording for call:', callId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get call details
    const { data: call, error: callError } = await supabaseAdmin
      .from('video_calls')
      .select('*, host_id, recording_egress_id')
      .eq('id', callId)
      .single();

    if (callError) throw callError;

    // Verify user is host
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user || user.id !== call.host_id) {
      throw new Error('Only the host can stop recording');
    }

    // TODO: Stop LiveKit recording via Egress API

    // Update database status
    const { error: updateError } = await supabaseAdmin
      .from('video_calls')
      .update({
        is_recording: false,
        recording_status: 'processing'
      })
      .eq('id', callId);

    if (updateError) throw updateError;

    console.log('[Recording] Recording stopped, processing...');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Recording] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
