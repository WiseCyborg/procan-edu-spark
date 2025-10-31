import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Starting scheduled training reminders check...");

    // Find users with incomplete training and no recent progress
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: inactiveUsers, error } = await supabase
      .from("user_learning_journey")
      .select(`
        user_id,
        current_stage,
        completion_percentage,
        last_activity_at,
        profiles!inner(first_name, last_name, user_id)
      `)
      .in("current_stage", ["course_not_started", "course_in_progress", "course_stuck"])
      .lt("last_activity_at", sevenDaysAgo);

    if (error) {
      console.error("Error fetching inactive users:", error);
      throw error;
    }

    let remindersScheduled = 0;

    for (const journey of inactiveUsers || []) {
      // Get user email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(journey.user_id);
      
      if (!authUser?.user?.email) continue;

      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(journey.last_activity_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      const urgency = daysSinceActivity >= 14 ? "high" : daysSinceActivity >= 7 ? "normal" : "low";
      
      // Insert notification into queue
      const { error: notifyError } = await supabase
        .from("notification_queue")
        .insert({
          recipient_email: authUser.user.email,
          subject: `Training Reminder: Complete Your Maryland RVT Course`,
          message: `Hi ${journey.profiles.first_name},\n\nIt's been ${daysSinceActivity} days since you last accessed your training. You're currently ${journey.completion_percentage}% complete.\n\nLog in now to continue: https://www.procannedu.com/course`,
          scheduled_for: new Date().toISOString(),
          priority: urgency,
          metadata: {
            reminder_type: "training_inactivity",
            days_inactive: daysSinceActivity,
            completion_percentage: journey.completion_percentage,
            current_stage: journey.current_stage,
          },
        });

      if (!notifyError) {
        remindersScheduled++;
      }
    }

    console.log(`Scheduled ${remindersScheduled} training reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        remindersScheduled,
        totalProcessed: inactiveUsers?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in schedule-training-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
