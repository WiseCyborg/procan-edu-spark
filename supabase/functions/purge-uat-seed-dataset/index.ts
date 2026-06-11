// Admin-only purge: undoes everything seed-uat-dataset created, in reverse order.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ success: false, error_code: "not_authenticated" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json({ success: false, error_code: "not_authenticated" }, 401);

    const admin = createClient(url, srk);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return json({ success: false, error_code: "not_authorized" }, 200);
    }

    let batch: string | null = null;
    try { const body = await req.json(); batch = body?.batch ?? null; } catch { /* no body ok */ }

    const { data, error } = await admin.rpc("purge_uat_seed_entities", { _batch: batch });
    if (error) {
      console.error("purge_uat_seed_entities failed", error);
      return json({ success: false, error_code: "rpc_failed", message: error.message }, 200);
    }
    return json({ success: true, result: data });
  } catch (err: any) {
    console.error("purge-uat-seed-dataset error", err);
    return json({ success: false, error_code: "internal_error", message: String(err?.message ?? err) }, 500);
  }
});
