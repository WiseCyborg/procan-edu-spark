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
    const { organizationId, maxUses, expiryDays = 90 } = await req.json();
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is coordinator/admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Generate unique code
    const code = `JOIN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Create join code
    const { data: joinCode, error } = await supabase
      .from("rvt_join_codes")
      .insert({
        organization_id: organizationId,
        code,
        created_by: user.id,
        expires_at: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
        max_uses: maxUses,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating join code:", error);
      throw error;
    }

    return new Response(JSON.stringify({ code: joinCode.code, joinCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in generate-join-code:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
