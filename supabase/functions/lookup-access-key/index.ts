import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_key } = await req.json();

    if (!access_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Access key is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the organization by access key
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('unique_access_key', access_key)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid access key. Please check your approval email for the correct key.' 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find the approved application for this organization
    const { data: app, error: appError } = await supabase
      .from('dispensary_applications')
      .select('*')
      .eq('organization_id', org.id)
      .eq('application_status', 'approved')
      .single();

    if (appError || !app) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No approved application found for this access key.' 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if already registered
    if (app.registration_completed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ALREADY_REGISTERED',
          message: 'This organization has already completed registration. Please sign in instead.' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate new token if current one is expired or missing
    let registration_token = app.registration_token;
    let token_expires_at = app.registration_token_expires_at;

    if (!registration_token || new Date(token_expires_at) < new Date()) {
      // Generate new token
      registration_token = crypto.randomUUID().replace(/-/g, '');
      token_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      // Update application with new token
      const { error: updateError } = await supabase
        .from('dispensary_applications')
        .update({
          registration_token,
          registration_token_expires_at: token_expires_at
        })
        .eq('id', app.id);

      if (updateError) {
        console.error('Failed to update token:', updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to generate new registration token. Please contact support.' 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: registration_token,
        organization_name: org.name,
        contact_email: app.contact_email
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in lookup-access-key:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
