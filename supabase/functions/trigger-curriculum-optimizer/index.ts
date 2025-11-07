import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Manually triggering curriculum optimizer...');

    // Call the ai-curriculum-optimizer function
    const { data, error } = await supabase.functions.invoke('ai-curriculum-optimizer', {
      body: {}
    });

    if (error) {
      console.error('Error invoking optimizer:', error);
      throw error;
    }

    console.log('Curriculum optimizer completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Curriculum optimizer triggered successfully',
        result: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trigger-curriculum-optimizer:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
