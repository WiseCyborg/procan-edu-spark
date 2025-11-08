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

    console.log("🔄 Checking for new users needing onboarding sequences...");

    // Find users created in last 24 hours with manager or coordinator roles
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: newManagers } = await supabase
      .from("user_roles")
      .select("user_id, role, profiles(created_at)")
      .in("role", ["dispensary_manager", "training_coordinator"])
      .gte("profiles.created_at", oneDayAgo.toISOString());

    let scheduled = 0;

    for (const user of newManagers || []) {
      // Check if already scheduled
      const { data: existing } = await supabase
        .from("notification_queue")
        .select("id")
        .eq("metadata->>user_id", user.user_id)
        .eq("metadata->>sequence_type", "onboarding")
        .single();

      if (existing) continue;

      // Schedule Day 1, 3, 7 emails
      const days = [1, 3, 7];
      for (const day of days) {
        const scheduledFor = new Date(
          new Date(user.profiles.created_at).getTime() + day * 24 * 60 * 60 * 1000
        );

        await supabase.from("notification_queue").insert({
          recipient_email: "", // Will be fetched in send-onboarding-sequence
          subject: `Onboarding Day ${day}`,
          message: `Day ${day} onboarding for ${user.role}`,
          notification_type: "onboarding_sequence",
          scheduled_for: scheduledFor.toISOString(),
          status: "pending",
          metadata: {
            user_id: user.user_id,
            role: user.role,
            day,
            sequence_type: "onboarding",
          },
        });

        scheduled++;
      }
    }

    console.log(`✅ Scheduled ${scheduled} onboarding emails`);

    return new Response(
      JSON.stringify({ success: true, scheduled }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error scheduling onboarding:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
