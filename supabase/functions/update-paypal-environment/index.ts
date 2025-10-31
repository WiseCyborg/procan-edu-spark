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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { environment } = await req.json();

    if (!environment || !["sandbox", "production"].includes(environment)) {
      return new Response(
        JSON.stringify({ error: "Invalid environment. Must be 'sandbox' or 'production'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to update configuration
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Get current environment for audit log
    const { data: currentConfig } = await supabaseService
      .from("paypal_configuration")
      .select("environment")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const oldEnvironment = currentConfig?.environment || "unknown";

    // Update or insert configuration
    const { data: existingConfig } = await supabaseService
      .from("paypal_configuration")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existingConfig) {
      // Update existing
      const { error: updateError } = await supabaseService
        .from("paypal_configuration")
        .update({
          environment,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConfig.id);

      if (updateError) throw updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabaseService
        .from("paypal_configuration")
        .insert({
          environment,
          updated_by: user.id,
        });

      if (insertError) throw insertError;
    }

    // Log audit event
    await supabaseService
      .from("api_console_audit")
      .insert({
        user_id: user.id,
        api_route: "update-paypal-environment",
        command: "UPDATE_PAYPAL_ENVIRONMENT",
        user_role: "admin",
        request_params: { environment, old_environment: oldEnvironment },
        response_data: { success: true, environment },
        success: true,
        execution_time_ms: 0,
      });

    // Log to email logs for admin notification tracking
    await supabaseService
      .from("email_logs")
      .insert({
        email_type: "paypal_environment_change",
        recipient_email: user.email || "admin@system",
        subject: `PayPal Environment Changed to ${environment.toUpperCase()}`,
        status: "delivered",
        metadata: {
          changed_by: user.id,
          old_environment: oldEnvironment,
          new_environment: environment,
          timestamp: new Date().toISOString(),
        },
      });

    console.log(`PayPal environment changed: ${oldEnvironment} → ${environment} by ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        environment,
        previousEnvironment: oldEnvironment,
        message: `PayPal environment switched to ${environment}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[update-paypal-environment] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
