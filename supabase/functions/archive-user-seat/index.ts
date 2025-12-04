import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the authorization header to identify the performer
    const authHeader = req.headers.get("Authorization");
    let performedBy: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      performedBy = user?.id || null;
    }

    const { user_id, reason } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the database function
    const { data, error } = await supabaseClient.rpc("archive_user_seat", {
      p_user_id: user_id,
      p_reason: reason || "Employee rotated out",
      p_performed_by: performedBy,
    });

    if (error) {
      console.error("Error archiving user seat:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Archive result for user ${user_id}:`, data);

    // If successful, send notification email (optional)
    if (data?.success) {
      try {
        // Get user email for notification
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email_cache, first_name")
          .eq("user_id", user_id)
          .single();

        if (profile?.email_cache) {
          console.log(`Would send archive notification to ${profile.email_cache}`);
          // Optionally invoke email function here
        }
      } catch (emailError) {
        console.error("Error sending archive notification:", emailError);
        // Don't fail the operation if email fails
      }
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in archive-user-seat:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
