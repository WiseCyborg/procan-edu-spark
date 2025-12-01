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
    // This would be called by LiveKit webhook when recording is complete
    const { egressId, recordingUrl, durationSeconds, fileSizeMB } = await req.json();

    console.log('[RecordingProcess] Processing recording:', { egressId });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the call by egress_id
    const { data: call, error: findError } = await supabaseAdmin
      .from('video_calls')
      .select('*')
      .eq('recording_egress_id', egressId)
      .single();

    if (findError) throw findError;

    // TODO: Download recording from LiveKit and upload to Supabase Storage
    // For now, just update with the URL provided
    
    const { error: updateError } = await supabaseAdmin
      .from('video_calls')
      .update({
        recording_url: recordingUrl,
        recording_duration_seconds: durationSeconds,
        recording_size_mb: fileSizeMB,
        recording_status: 'ready'
      })
      .eq('id', call.id);

    if (updateError) throw updateError;

    console.log('[RecordingProcess] Recording processed successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[RecordingProcess] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
