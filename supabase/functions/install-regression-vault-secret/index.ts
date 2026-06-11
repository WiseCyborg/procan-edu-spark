// One-shot admin utility: installs the SUPABASE_SERVICE_ROLE_KEY into
// vault.secrets under name 'service_role_key' so the post-migration
// regression cron can authenticate. Idempotent.
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

    // Upsert via SECURITY DEFINER RPC (created in companion migration)
    const { data, error } = await admin.rpc("install_regression_vault_secret", { _value: srk });
    if (error) {
      console.error("install_regression_vault_secret failed", error);
      return json({ success: false, error_code: "rpc_failed", message: error.message }, 200);
    }
    return json({ success: true, action: data });
  } catch (err) {
    console.error("install-regression-vault-secret error", err);
    return json({ success: false, error_code: "internal_error" }, 500);
  }
});
