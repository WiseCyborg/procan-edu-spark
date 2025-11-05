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
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate token using database function
    const { data, error } = await supabase
      .rpc('validate_registration_token', { token_value: token });

    if (error) {
      console.error('Token validation error:', error);
      throw error;
    }

    const validation = Array.isArray(data) ? data[0] : data;

    return new Response(
      JSON.stringify(validation),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: validation.is_valid ? 200 : 400
      }
    );
  } catch (error) {
    console.error('Validation failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});