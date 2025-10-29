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

    const { certificate_number, verifier_info } = await req.json();

    // Get certificate details
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .select(`
        *,
        profiles(first_name, last_name, organization_id),
        organizations(name)
      `)
      .eq('certificate_number', certificate_number)
      .single();

    if (certError || !cert) {
      return new Response(
        JSON.stringify({
          found: false,
          message: 'Certificate not found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine certificate status
    let status = 'valid';
    if (cert.is_revoked) {
      status = 'revoked';
    } else if (cert.expiry_date && new Date(cert.expiry_date) < new Date()) {
      status = 'expired';
    }

    // Log the verification attempt
    await supabase.from('security_audit_log').insert({
      table_name: 'certificates',
      action_type: 'CERTIFICATE_VERIFICATION',
      record_id: cert.id,
      new_values: {
        certificate_number,
        verifier_info,
        verification_timestamp: new Date().toISOString(),
        status,
      },
    });

    // Return certificate details
    return new Response(
      JSON.stringify({
        found: true,
        status,
        certificate: {
          certificate_number: cert.certificate_number,
          holder_name: `${(cert.profiles as any)?.first_name} ${(cert.profiles as any)?.last_name}`,
          organization: (cert.organizations as any)?.name,
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          tier_badge: cert.tier_badge,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verification tracking error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
