// setup-comar-cron — one-shot admin utility that schedules the daily COMAR scrape
// cron job (06:00 UTC). Reads CRON_SHARED_SECRET from edge function env and passes
// it to a SECURITY DEFINER RPC, so the secret never lives in source.
//
// Auth: admin user only.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SHARED_SECRET") ?? "";

  const supabase = createClient(supabaseUrl, serviceKey);

  // Admin auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return json({ success: false, error_code: "unauthorized" }, 401);
  }
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return json({ success: false, error_code: "unauthorized" }, 401);

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = !!roles?.some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) return json({ success: false, error_code: "forbidden" }, 403);

  if (!cronSecret || cronSecret.length < 16) {
    return json({ success: false, error_code: "missing_cron_secret" }, 200);
  }

  const { data, error } = await supabase.rpc("setup_comar_scrape_cron", { secret: cronSecret });
  if (error) {
    console.error("[setup-comar-cron] rpc error:", error);
    return json({ success: false, error_code: "rpc_failed", message: error.message }, 200);
  }

  return json({ success: true, message: data });

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
