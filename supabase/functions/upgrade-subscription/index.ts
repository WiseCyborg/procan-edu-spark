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

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { organization_id, new_tier, payment_reference } = await req.json();

    if (!organization_id || !new_tier) {
      return new Response(
        JSON.stringify({ error: "organization_id and new_tier are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the new tier exists
    const { data: tierData, error: tierError } = await supabaseClient
      .from("subscription_tiers")
      .select("*")
      .eq("tier_name", new_tier)
      .eq("is_active", true)
      .single();

    if (tierError || !tierData) {
      return new Response(
        JSON.stringify({ error: "Invalid subscription tier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the upgrade function
    const { data, error } = await supabaseClient.rpc("upgrade_subscription_tier", {
      org_id: organization_id,
      new_tier_name: new_tier,
      payment_ref: payment_reference || null,
      performed_by_id: user.id,
    });

    if (error) {
      console.error("Error upgrading subscription:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Subscription upgrade result for org ${organization_id}:`, data);

    // If successful, send confirmation email
    if (data?.success) {
      try {
        // Get organization details for email
        const { data: org } = await supabaseClient
          .from("organizations")
          .select("name")
          .eq("id", organization_id)
          .single();

        // Get manager email
        const { data: manager } = await supabaseClient
          .from("profiles")
          .select("email_cache, first_name")
          .eq("organization_id", organization_id)
          .limit(1)
          .single();

        if (manager?.email_cache) {
          // Log the upgrade communication
          await supabaseClient.from("communication_logs").insert({
            communication_type: "subscription_upgrade",
            recipient_email: manager.email_cache,
            subject: `Subscription Upgraded to ${tierData.display_name}`,
            organization_id: organization_id,
            user_id: user.id,
            metadata: {
              previousTier: data.previousTier,
              newTier: data.newTier,
              newMaxSeats: data.newMaxSeats,
            },
            delivery_status: "pending",
          });

          console.log(`Upgrade confirmation logged for ${manager.email_cache}`);
        }
      } catch (emailError) {
        console.error("Error logging upgrade notification:", emailError);
      }
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in upgrade-subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
