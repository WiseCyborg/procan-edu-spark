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

    // Hash incoming plaintext token and look up by hash (plaintext is not stored at rest)
    const tokenBytes = new TextEncoder().encode(token);
    const hashBuf = await crypto.subtle.digest('SHA-256', tokenBytes);
    const tokenHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: invitation, error } = await supabase
      .from('staff_invitations')
      .select('*, organizations(name, id)')
      .eq('invitation_token_hash', tokenHash)
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

    // Check if email already has an account using edge function
    const { data: emailCheckData } = await supabase.functions.invoke('check-email-exists', {
      body: { email: invitation.email }
    });
    
    const existingUser = emailCheckData?.exists;

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
