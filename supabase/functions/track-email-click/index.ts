import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const emailId = url.searchParams.get('id');
    const targetUrl = url.searchParams.get('url');

    if (!emailId || !targetUrl) {
      return new Response('Missing required parameters', { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update communication_logs with clicked_at timestamp
    const { error } = await supabaseClient
      .from('communication_logs')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', emailId)
      .is('clicked_at', null); // Only update if not already clicked

    if (error) {
      console.error('Error tracking email click:', error);
    }

    // Redirect to the target URL
    return new Response(null, {
      status: 302,
      headers: {
        'Location': decodeURIComponent(targetUrl),
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error in track-email-click:', error);
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
