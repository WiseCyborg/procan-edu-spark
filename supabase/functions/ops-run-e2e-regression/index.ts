// One-shot ops function: refresh pipeline_health_snapshot, run regression,
// smoke-test video URLs, return a strict GO/NO-GO verdict.
// Authorize: service-role bearer OR admin JWT (same pattern as post-migration-regression).
// SAFE TO DELETE after a single run.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

async function authorize(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return false;
  if (token === SERVICE_ROLE) return true;
  const sb = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return false;
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  return !!isAdmin;
}

async function invoke(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json", apikey: SERVICE_ROLE },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, json, text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await authorize(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = new Date().toISOString();
  const failures: string[] = [];
  const checks: Record<string, any> = {};

  // 1. Refresh pipeline_health_snapshot via pipeline-health-agent
  const snapBefore = await admin
    .from("pipeline_health_snapshot")
    .select("id,last_run_at")
    .order("last_run_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const beforeId = snapBefore.data?.id ?? null;

  const snapInvoke = await invoke("pipeline-health-agent", {});
  checks.snapshot_invoke = { status: snapInvoke.status, body: snapInvoke.json ?? snapInvoke.text?.slice(0, 500) };
  if (snapInvoke.status !== 200) failures.push(`snapshot_refresh_http_${snapInvoke.status}`);

  const snapAfter = await admin
    .from("pipeline_health_snapshot")
    .select("id,last_run_at,pipelines_healthy,pipelines_total,issues_detected,needs_admin_attention")
    .order("last_run_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  checks.snapshot_after = snapAfter.data;
  const fresh =
    snapAfter.data &&
    snapAfter.data.id !== beforeId &&
    new Date(snapAfter.data.last_run_at as string).getTime() > Date.now() - 120_000;
  if (!fresh) failures.push("snapshot_not_fresh");
  if (snapAfter.data && snapAfter.data.pipelines_healthy !== snapAfter.data.pipelines_total) {
    failures.push(`pipelines_unhealthy_${snapAfter.data.pipelines_healthy}_of_${snapAfter.data.pipelines_total}`);
  }

  // 2. Run regression
  const reg = await invoke("post-migration-regression", {
    migration_version: "e2e_run_2026-06-16",
    triggered_by: "ops-run-e2e-regression",
  });
  checks.regression = { status: reg.status, body: reg.json ?? reg.text?.slice(0, 800) };
  if (reg.status !== 200) failures.push(`regression_http_${reg.status}`);
  if (reg.json?.success !== true) failures.push(`regression_success_false`);
  if (reg.json?.verdict && reg.json.verdict !== "SHIPPABLE") failures.push(`regression_verdict_${reg.json.verdict}`);
  if (reg.json?.deterministic === false) failures.push("regression_nondeterministic");

  // 3. Video smoke — three assets
  const smokeAssets = [
    { key: "welcome-intro", expect_provider: "vimeo" },
    { key: "section_1_laws", expect_provider: "vimeo" },
  ];
  // Optionally add an MP4 asset if any exist
  const { data: mp4 } = await admin
    .from("video_assets")
    .select("asset_key")
    .like("storage_path", "%.mp4")
    .not("storage_path", "like", "vimeo/%")
    .limit(1)
    .maybeSingle();
  if (mp4?.asset_key) smokeAssets.push({ key: mp4.asset_key, expect_provider: "supabase" });

  const videoResults: any[] = [];
  for (const a of smokeAssets) {
    const r = await invoke("get-video-url", { asset_key: a.key });
    const ok = r.status === 200 && r.json?.success !== false && r.json?.provider === a.expect_provider;
    if (!ok) failures.push(`video_${a.key}_${r.status}_${r.json?.provider ?? "no_provider"}`);
    videoResults.push({
      asset_key: a.key,
      expect_provider: a.expect_provider,
      status: r.status,
      provider: r.json?.provider,
      vimeo_id: r.json?.vimeo_id,
      vimeo_hash: r.json?.vimeo_hash,
      has_signed_url: !!r.json?.signed_url,
      ok,
    });
  }
  checks.video_smoke = videoResults;

  // 4. Verdict
  const verdict = failures.length === 0 ? "GO" : "NO-GO";
  const finishedAt = new Date().toISOString();

  const payload = {
    verdict,
    failures,
    started_at: startedAt,
    finished_at: finishedAt,
    snapshot: snapAfter.data,
    regression_run_id: reg.json?.run_id ?? null,
    regression_verdict: reg.json?.verdict ?? null,
    regression_deterministic: reg.json?.deterministic ?? null,
    video_smoke: videoResults,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
