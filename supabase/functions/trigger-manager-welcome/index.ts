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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, organizationId } = await req.json();
    console.log(`Triggering manager welcome for user ${userId}, org ${organizationId}`);

    // Get user and organization details
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, user_id")
      .eq("user_id", userId)
      .single();

    const { data: organization } = await supabase
      .from("organizations")
      .select("name, unique_access_key")
      .eq("id", organizationId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);

    if (!profile || !organization || !authUser) {
      throw new Error("User or organization not found");
    }

    // Send welcome email
    const { error: emailError } = await supabase.functions.invoke("send-welcome-email", {
      body: {
        email: authUser.user.email,
        firstName: profile.first_name,
        organizationName: organization.name,
        accessKey: organization.unique_access_key,
        loginUrl: "https://www.procannedu.com/auth",
      },
    });

    if (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email triggered" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in trigger-manager-welcome:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
