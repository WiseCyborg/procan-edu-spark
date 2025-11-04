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

    console.log('[AI-SEAT-UTILIZATION-AGENT] Analyzing seat utilization...');

    // Get organizations with low seat utilization
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, course_credits')
      .eq('admin_approved', true);

    if (!orgs) {
      return new Response(
        JSON.stringify({ success: true, message: 'No organizations found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const org of orgs) {
      // Count used seats
      const { count: usedSeats } = await supabase
        .from('rvt_seats')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'used');

      // Count available seats
      const { count: availableSeats } = await supabase
        .from('rvt_seats')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'available');

      const totalSeats = (usedSeats || 0) + (availableSeats || 0);
      const utilizationRate = totalSeats > 0 ? (usedSeats || 0) / totalSeats : 0;

      // Alert if utilization is below 50% and seats are available
      if (utilizationRate < 0.5 && availableSeats && availableSeats > 5) {
        await supabase.rpc('queue_job', {
          p_job_type: 'seat_utilization_alert',
          p_payload: {
            organization_id: org.id,
            organization_name: org.name,
            total_seats: totalSeats,
            used_seats: usedSeats || 0,
            available_seats: availableSeats,
            utilization_rate: Math.round(utilizationRate * 100)
          },
          p_organization_id: org.id
        });
      }
    }

    console.log('[AI-SEAT-UTILIZATION-AGENT] ✅ Analysis complete');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[AI-SEAT-UTILIZATION-AGENT] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
