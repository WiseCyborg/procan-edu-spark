import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { code } = await req.json();
    
    if (!code) {
      throw new Error("Join code is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Validate join code
    const { data: joinCode, error } = await supabase
      .from("rvt_join_codes")
      .select("*, organizations(*)")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !joinCode) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Invalid or expired join code" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check expiry
    if (new Date(joinCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Join code has expired" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check max uses
    if (joinCode.max_uses && joinCode.current_uses >= joinCode.max_uses) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Join code usage limit reached" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      valid: true,
      organizationId: joinCode.organization_id,
      organizationName: joinCode.organizations.name
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in validate-join-code:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
