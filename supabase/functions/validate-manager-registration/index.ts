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

    console.log(`🔍 Validating token: ${token.substring(0, 10)}...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, try to validate as a dispensary application token
    const { data: appValidation, error: appError } = await supabase
      .rpc('validate_registration_token', { token_value: token });

    if (appError) {
      console.error('Token validation RPC error:', appError);
    }

    const validation = Array.isArray(appValidation) ? appValidation[0] : appValidation;
    console.log(`📊 Application token lookup: ${validation?.is_valid ? 'valid' : 'not valid or not found'}`);

    // If valid via application token, fetch application data and return
    if (validation?.is_valid && validation?.application_id) {
      const { data: appData, error: appDataError } = await supabase
        .from('dispensary_applications')
        .select('id, organization_id, organization_name, contact_email, contact_person')
        .eq('id', validation.application_id)
        .single();

      if (appDataError) {
        console.error('Error fetching application data:', appDataError);
      }

      console.log(`✅ Valid application token for: ${appData?.organization_name}`);

      return new Response(
        JSON.stringify({
          ...validation,
          registration_type: 'application',
          application_data: appData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // If not found in applications, check if it's a join code from rvt_join_codes
    console.log(`🔍 Checking rvt_join_codes for token...`);
    
    const { data: joinCodeData, error: joinCodeError } = await supabase
      .from('rvt_join_codes')
      .select(`
        id, 
        code, 
        organization_id, 
        is_active, 
        expires_at,
        organizations (
          id,
          name,
          contact_email,
          contact_person
        )
      `)
      .eq('code', token)
      .single();

    if (joinCodeError) {
      console.log(`📊 Join code lookup: not found - ${joinCodeError.message}`);
    }

    if (joinCodeData) {
      console.log(`📊 Join code found for org: ${joinCodeData.organizations?.name}`);
      
      // Check if active
      if (!joinCodeData.is_active) {
        console.log(`❌ Join code is inactive`);
        return new Response(
          JSON.stringify({ 
            is_valid: false, 
            error_message: 'This registration link has been deactivated' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check expiry
      if (joinCodeData.expires_at && new Date(joinCodeData.expires_at) < new Date()) {
        console.log(`❌ Join code expired at: ${joinCodeData.expires_at}`);
        return new Response(
          JSON.stringify({ 
            is_valid: false, 
            error_message: 'This registration link has expired' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log(`✅ Valid join code for: ${joinCodeData.organizations?.name}`);

      // Return valid join code response
      return new Response(
        JSON.stringify({
          is_valid: true,
          registration_type: 'join_code',
          organization_id: joinCodeData.organization_id,
          join_code_id: joinCodeData.id,
          application_data: {
            organization_id: joinCodeData.organization_id,
            organization_name: joinCodeData.organizations?.name,
            contact_email: joinCodeData.organizations?.contact_email || '',
            contact_person: joinCodeData.organizations?.contact_person || 'Manager'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Neither application token nor join code found
    console.log(`❌ Token validation failed - not found in applications or join codes`);
    
    // Check if it's an expired/used application token for better error messaging
    if (validation?.error_message) {
      return new Response(
        JSON.stringify({
          is_valid: false,
          error_message: validation.error_message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ 
        is_valid: false, 
        error_message: 'Invalid registration token' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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
