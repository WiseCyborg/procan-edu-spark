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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("🔍 Checking for users needing escalation...");

    const now = new Date();
    let escalationsTriggered = 0;

    // Check for ignored invitations (3, 7, 14 days)
    const { data: pendingInvitations } = await supabase
      .from("staff_invitations")
      .select("*, profiles(user_id)")
      .eq("status", "pending")
      .is("accepted_at", null);

    for (const invitation of pendingInvitations || []) {
      const daysSinceInvite = Math.floor(
        (now.getTime() - new Date(invitation.created_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      let level = 0;
      if (daysSinceInvite >= 14) level = 3;
      else if (daysSinceInvite >= 7) level = 2;
      else if (daysSinceInvite >= 3) level = 1;

      if (level > 0) {
        // Check if already escalated at this level
        const { data: existing } = await supabase
          .from("escalation_log")
          .select("id")
          .eq("user_id", invitation.profiles?.user_id)
          .eq("escalation_type", "invitation_ignored")
          .eq("escalation_level", level)
          .single();

        if (!existing && invitation.profiles?.user_id) {
          await supabase.functions.invoke("send-escalation-email", {
            body: {
              user_id: invitation.profiles.user_id,
              escalation_type: "invitation_ignored",
              level,
            },
          });
          escalationsTriggered++;
        }
      }
    }

    // Check for stalled learners (7, 14, 21 days inactive)
    const { data: stalledLearners } = await supabase
      .from("rvt_enrollments")
      .select("user_id, last_activity_at, completion_percentage")
      .lt("completion_percentage", 100)
      .not("last_activity_at", "is", null);

    for (const learner of stalledLearners || []) {
      const daysSinceActivity = Math.floor(
        (now.getTime() - new Date(learner.last_activity_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      let level = 0;
      if (daysSinceActivity >= 21) level = 3;
      else if (daysSinceActivity >= 14) level = 2;
      else if (daysSinceActivity >= 7) level = 1;

      if (level > 0) {
        const { data: existing } = await supabase
          .from("escalation_log")
          .select("id")
          .eq("user_id", learner.user_id)
          .eq("escalation_type", "stalled_learner")
          .eq("escalation_level", level)
          .single();

        if (!existing) {
          await supabase.functions.invoke("send-escalation-email", {
            body: {
              user_id: learner.user_id,
              escalation_type: "stalled_learner",
              level,
            },
          });
          escalationsTriggered++;
        }
      }
    }

    console.log(`✅ Triggered ${escalationsTriggered} escalations`);

    return new Response(
      JSON.stringify({ success: true, escalations: escalationsTriggered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking escalations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
