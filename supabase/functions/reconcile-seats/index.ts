import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🪑 Seat Reconciliation - Starting");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (!roles?.some(r => r.role === 'admin')) {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin access required' }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
          );
        }
      }
    }

    // Find organizations with credit/seat mismatches
    const { data: orgs, error: fetchError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        course_credits,
        rvt_seats:rvt_seats(count)
      `)
      .gt('course_credits', 0);

    if (fetchError) throw fetchError;

    console.log(`📋 Checking ${orgs?.length || 0} organizations`);

    const results = {
      reconciled: 0,
      seats_created: 0,
      skipped: 0,
      errors: [] as any[]
    };

    for (const org of orgs || []) {
      try {
        const seatCount = org.rvt_seats?.[0]?.count || 0;
        const creditCount = org.course_credits || 0;
        const deficit = creditCount - seatCount;

        if (deficit <= 0) {
          results.skipped++;
          continue;
        }

        console.log(`🔧 ${org.name}: ${seatCount} seats, ${creditCount} credits, deficit: ${deficit}`);

        // Get the RVT course ID
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('course_type', 'professional')
          .eq('target_audience', 'agent')
          .single();

        if (!course) {
          throw new Error('RVT course not found');
        }

        // Create missing seats
        const seatsToCreate = Array.from({ length: deficit }, (_, i) => ({
          organization_id: org.id,
          course_id: course.id,
          status: 'available',
          seat_number: seatCount + i + 1
        }));

        const { error: insertError } = await supabase
          .from('rvt_seats')
          .insert(seatsToCreate);

        if (insertError) {
          console.error(`❌ Failed to create seats for ${org.name}:`, insertError);
          results.errors.push({
            organization: org.name,
            error: insertError.message
          });
          continue;
        }

        results.reconciled++;
        results.seats_created += deficit;
        console.log(`✅ Created ${deficit} seats for ${org.name}`);

      } catch (error: any) {
        console.error(`❌ Error processing ${org.name}:`, error);
        results.errors.push({
          organization: org.name,
          error: error.message
        });
      }
    }

    console.log(`✅ Reconciliation complete: ${results.seats_created} seats created for ${results.reconciled} orgs`);

    return new Response(
      JSON.stringify({ 
        success: true,
        organizations_checked: orgs?.length || 0,
        organizations_reconciled: results.reconciled,
        seats_created: results.seats_created,
        skipped: results.skipped,
        errors: results.errors
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("❌ Error in reconcile-seats:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
