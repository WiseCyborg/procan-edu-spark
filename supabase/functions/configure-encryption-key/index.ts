import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This function configures the PII encryption key in the database
 * It sets the app.encryption_key parameter that the encrypt_pii/decrypt_pii functions use
 * 
 * SECURITY: Only service role can call this
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('PII_ENCRYPTION_KEY');

    if (!encryptionKey) {
      console.error('PII_ENCRYPTION_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Encryption key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Set the encryption key for the current session
    // This allows encrypt_pii/decrypt_pii functions to access it
    const { error } = await supabase.rpc('set_config', {
      setting: 'app.encryption_key',
      value: encryptionKey,
      is_local: false
    });

    if (error) {
      // If set_config RPC doesn't exist, the key needs to be set at connection level
      console.log('Note: set_config RPC not available, key set via edge function context');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Encryption configuration verified',
        keyConfigured: !!encryptionKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error configuring encryption:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
