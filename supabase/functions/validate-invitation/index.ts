import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    // Validate invitation token
    const { data: invitation, error } = await supabase
      .from('staff_invitations')
      .select('*, organizations(name, id)')
      .eq('invitation_token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !invitation) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: 'invalid_or_expired',
          message: 'This invitation link is invalid or has expired.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already has an account
    const { data: existingUser } = await supabase
      .rpc('check_email_exists', { email_address: invitation.email });

    if (existingUser) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: 'already_registered',
          message: 'An account with this email already exists. Please sign in instead.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        invitation: {
          email: invitation.email,
          organization_name: (invitation.organizations as any)?.name,
          organization_id: invitation.organization_id,
          role: invitation.role,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
