// One-shot ops function: refresh pipeline_health_snapshot, run regression,
// smoke-test video URLs, return a strict GO/NO-GO verdict.
// Auth: constant-time compare of x-ops-token header against EMBEDDED_TOKEN.
// THIS FILE IS DELETED IMMEDIATELY AFTER A SINGLE RUN.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const EMBEDDED_TOKEN = "ef07d82763899d38d78585dd9f5af383c16ee51f5324712991cfbd89ed7a0a86";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ops-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function invoke(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, json, text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const presented = req.headers.get("x-ops-token") || "";
  if (!constantTimeEqual(presented, EMBEDDED_TOKEN)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = new Date().toISOString();
  const failures: string[] = [];
  const checks: Record<string, any> = {};

  // 1. Snapshot refresh
  const snapBefore = await admin
    .from("pipeline_health_snapshot")
    .select("id,last_run_at")
    .order("last_run_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const beforeId = snapBefore.data?.id ?? null;

  const snapInvoke = await invoke("pipeline-health-agent", {});
  checks.snapshot_invoke_status = snapInvoke.status;
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

  // 2. Regression
  const reg = await invoke("post-migration-regression", {
    migration_version: "e2e_run_2026-06-16",
    triggered_by: "ops-run-e2e-regression",
  });
  checks.regression_status = reg.status;
  checks.regression_body = reg.json ?? reg.text?.slice(0, 1500);
  if (reg.status !== 200) failures.push(`regression_http_${reg.status}`);
  if (reg.json?.success !== true) failures.push("regression_success_false");
  if (reg.json?.verdict && reg.json.verdict !== "SHIPPABLE") failures.push(`regression_verdict_${reg.json.verdict}`);
  if (reg.json?.deterministic === false) failures.push("regression_nondeterministic");

  // 3. Video smoke
  const smokeAssets: Array<{ key: string; expect_provider: string }> = [
    { key: "welcome-intro", expect_provider: "vimeo" },
  ];
  const { data: sectionAsset } = await admin
    .from("video_assets")
    .select("asset_key")
    .like("asset_key", "section_%")
    .like("storage_path", "vimeo/%")
    .limit(1)
    .maybeSingle();
  if (sectionAsset?.asset_key) smokeAssets.push({ key: sectionAsset.asset_key, expect_provider: "vimeo" });

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
  checks.snapshot_before_id = beforeId;

  const verdict = failures.length === 0 ? "GO" : "NO-GO";

  return new Response(JSON.stringify({
    verdict,
    failures,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    snapshot_before_id: beforeId,
    snapshot_after: snapAfter.data,
    regression_run_id: reg.json?.run_id ?? null,
    regression_verdict: reg.json?.verdict ?? null,
    regression_deterministic: reg.json?.deterministic ?? null,
    regression_report_path: reg.json?.report_path ?? null,
    video_smoke: videoResults,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
