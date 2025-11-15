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
    console.log("🔄 Reset Email Circuit Breaker - Starting");

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

    // Get current circuit breaker state
    const { data: currentState } = await supabase
      .from('email_circuit_breaker')
      .select('*')
      .single();

    console.log("📊 Current circuit breaker state:", currentState?.circuit_state);

    // Reset circuit breaker
    const { error: resetError } = await supabase
      .from('email_circuit_breaker')
      .update({
        circuit_state: 'closed',
        failure_count: 0,
        last_failure_at: null,
        closed_at: new Date().toISOString(),
        metadata: {
          ...currentState?.metadata,
          last_reset_at: new Date().toISOString(),
          reset_reason: 'manual_admin_reset'
        }
      })
      .eq('id', 1);

    if (resetError) throw resetError;

    // Clear old provider health failures
    const { error: healthError } = await supabase
      .from('email_provider_health')
      .delete()
      .eq('status', 'error')
      .lt('last_check_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (healthError) {
      console.warn("⚠️ Failed to clear old provider health records:", healthError);
    }

    console.log("✅ Circuit breaker reset successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email circuit breaker reset successfully",
        previous_state: currentState?.circuit_state,
        new_state: 'closed'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("❌ Error in reset-email-circuit-breaker:", error);
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
