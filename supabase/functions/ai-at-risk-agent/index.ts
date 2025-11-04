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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log('[AI-AT-RISK-AGENT] Analyzing at-risk employees...');

    // Get organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('admin_approved', true);

    if (!orgs) {
      return new Response(
        JSON.stringify({ success: true, message: 'No organizations found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalNotifications = 0;

    for (const org of orgs) {
      // Get at-risk students for this org
      const { data: atRisk } = await supabase.rpc('get_at_risk_students', {
        org_id: org.id
      });

      if (atRisk && atRisk.length > 0) {
        // Queue notification for training coordinator
        await supabase.rpc('queue_job', {
          p_job_type: 'at_risk_alert',
          p_payload: {
            organization_id: org.id,
            organization_name: org.name,
            at_risk_count: atRisk.length,
            employees: atRisk.map((emp: any) => ({
              name: `${emp.first_name} ${emp.last_name}`,
              days_remaining: emp.days_until_deadline
            }))
          },
          p_organization_id: org.id
        });
        totalNotifications++;
      }
    }

    console.log(`[AI-AT-RISK-AGENT] ✅ Queued ${totalNotifications} at-risk alerts`);

    return new Response(
      JSON.stringify({ success: true, notifications: totalNotifications }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[AI-AT-RISK-AGENT] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
