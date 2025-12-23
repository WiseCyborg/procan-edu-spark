import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[compliance-review-scheduler] Starting review scheduler...");

    const today = new Date().toISOString().split('T')[0];

    // Mark overdue reviews
    const { data: overdueReviews, error: overdueError } = await supabase
      .from("scheduled_reviews")
      .update({ status: 'overdue' })
      .eq("status", "scheduled")
      .lt("due_date", today)
      .select();

    if (overdueError) {
      console.error("[compliance-review-scheduler] Error marking overdue:", overdueError);
    } else {
      console.log(`[compliance-review-scheduler] Marked ${overdueReviews?.length || 0} reviews as overdue`);
    }

    // Get organizations that need new quarterly reviews scheduled
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("admin_approved", true);

    if (orgsError) throw orgsError;

    let reviewsCreated = 0;

    for (const org of orgs || []) {
      // Check if they have any future quarterly reviews scheduled
      const { data: futureReviews, error: futureError } = await supabase
        .from("scheduled_reviews")
        .select("id")
        .eq("organization_id", org.id)
        .eq("review_type", "quarterly")
        .gte("scheduled_date", today)
        .limit(1);

      if (futureError) {
        console.error(`[compliance-review-scheduler] Error checking future reviews for org ${org.id}:`, futureError);
        continue;
      }

      // If no future reviews, schedule the next 4 quarters
      if (!futureReviews || futureReviews.length === 0) {
        const currentQuarter = Math.floor((new Date().getMonth()) / 3) + 1;
        const currentYear = new Date().getFullYear();

        for (let i = 0; i < 4; i++) {
          const quarter = ((currentQuarter + i - 1) % 4) + 1;
          const year = currentYear + Math.floor((currentQuarter + i - 1) / 4);
          
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + (i * 90));
          
          const dueDate = new Date(scheduledDate);
          dueDate.setDate(dueDate.getDate() + 14);

          const { error: insertError } = await supabase
            .from("scheduled_reviews")
            .insert({
              organization_id: org.id,
              review_type: 'quarterly',
              review_name: `Q${quarter} ${year} Compliance Review`,
              scheduled_date: scheduledDate.toISOString().split('T')[0],
              due_date: dueDate.toISOString().split('T')[0],
              status: 'scheduled'
            });

          if (!insertError) {
            reviewsCreated++;
          }
        }
        
        console.log(`[compliance-review-scheduler] Scheduled 4 quarterly reviews for org: ${org.name}`);
      }
    }

    // Check for upcoming reviews (within 7 days) and log for notification purposes
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: upcomingReviews, error: upcomingError } = await supabase
      .from("scheduled_reviews")
      .select(`
        id,
        review_name,
        scheduled_date,
        organization_id,
        organizations (name)
      `)
      .eq("status", "scheduled")
      .gte("scheduled_date", today)
      .lte("scheduled_date", sevenDaysFromNow.toISOString().split('T')[0]);

    if (!upcomingError && upcomingReviews) {
      console.log(`[compliance-review-scheduler] ${upcomingReviews.length} reviews due within 7 days`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdue_marked: overdueReviews?.length || 0,
        reviews_created: reviewsCreated,
        upcoming_reviews: upcomingReviews?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[compliance-review-scheduler] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
