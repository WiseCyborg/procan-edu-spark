// generate-video-script
// Drafts narration scripts for flagged video_assets rows using ONLY the
// corrected module content + the cited COMAR text. The model is explicitly
// forbidden from adding regulatory facts from its own knowledge — a 2026-07-19
// verification pass found 16/19 modules had regulatory errors (4 taught other
// states' law as Maryland). All module text has since been corrected.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-invoked-by",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const SYSTEM_PROMPT =
  "You write narration scripts for Maryland cannabis Responsible Vendor Training videos. " +
  "You will be given a training module's text and, where available, the COMAR regulation it cites. " +
  "Write the script using ONLY facts present in those two sources. " +
  "Do not add any regulatory requirement, threshold, deadline, citation or figure that does not appear " +
  "in the supplied text — not even if you believe it to be correct. " +
  "If the supplied module text does not state something, leave it out. " +
  "Maryland regulations differ from other states and inventing a plausible-sounding rule is the most " +
  "damaging error you can make here.";

interface ProcessError {
  asset_id: string;
  message: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = performance.now();
  const startedAt = new Date();
  const runId = crypto.randomUUID();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const apiKeyPresent = !!anthropicKey;

  let assetsSelected = 0;
  let scriptsWritten = 0;
  let skippedExisting = 0;
  const errors: ProcessError[] = [];

  const logRun = async (
    status: "success" | "partial" | "error",
    extra?: Record<string, unknown>,
  ) => {
    try {
      await supabase.from("cron_job_executions").insert({
        job_name: "generate-video-script",
        executed_at: startedAt.toISOString(),
        status,
        execution_time_ms: Math.round(performance.now() - t0),
        error_message: JSON.stringify({
          runId,
          api_key_present: apiKeyPresent,
          assets_selected: assetsSelected,
          scripts_written: scriptsWritten,
          skipped_existing: skippedExisting,
          errors: errors.slice(0, 10),
          ...extra,
        }),
      });
    } catch (e) {
      console.error("[generate-video-script] log insert failed:", e);
    }
  };

  // ---- Auth: cron secret OR admin/training_coordinator ----
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  const cronEnv = Deno.env.get("CRON_SHARED_SECRET") ?? "";
  let isCron = false;
  let vaultVerifierReachable = false;
  if (headerSecret.length > 0) {
    try {
      const { data: vaultOk, error: vaultErr } = await supabase.rpc("verify_cron_secret", {
        p_secret: headerSecret.trim(),
      });
      if (vaultErr) console.error("[generate-video-script] verify_cron_secret error:", vaultErr.message);
      vaultVerifierReachable = vaultErr === null;
      isCron = vaultOk === true;
    } catch (e) {
      console.error("[generate-video-script] verify_cron_secret threw:", e instanceof Error ? e.message : e);
    }
    if (!isCron && cronEnv.length > 0) {
      isCron = headerSecret.trim() === cronEnv.trim();
    }
  }

  let isPrivileged = false;
  if (!isCron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        isPrivileged = !!roles?.some(
          (r) => r.role === "admin" || r.role === "training_coordinator",
        );
      }
    }
  }

  if (!isCron && !isPrivileged) {
    try {
      await supabase.from("cron_job_executions").insert({
        job_name: "generate-video-script",
        executed_at: startedAt.toISOString(),
        status: "error",
        execution_time_ms: Math.round(performance.now() - t0),
        error_message: JSON.stringify({
          runId,
          reason: "unauthorized",
          cron_secret_header_present: headerSecret.length > 0,
          cron_shared_secret_env_configured: cronEnv.length > 0,
          vault_verifier_reachable: vaultVerifierReachable,
          invoked_by: req.headers.get("x-invoked-by"),
        }),
      });
    } catch (e) {
      console.error("[generate-video-script] failed to log unauthorized rejection:", e);
    }
    return new Response(
      JSON.stringify({ success: false, error_code: "unauthorized", runId }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!anthropicKey) {
    await logRun("error", { error: "ANTHROPIC_API_KEY not configured" });
    return new Response(
      JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY not configured", runId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Parse input ----
  let body: { asset_id?: string; limit?: number; force?: boolean } = {};
  try {
    body = await req.json();
  } catch { /* empty body ok */ }

  const force = body.force === true;
  const limit = Math.min(Math.max(1, Number(body.limit) || 3), 10);

  // ---- Select assets ----
  let assets: any[] = [];
  try {
    if (body.asset_id) {
      const { data, error } = await supabase
        .from("video_assets")
        .select("id, asset_key, title, duration_seconds, module_id, draft_script, regeneration_reason, needs_regeneration")
        .eq("id", body.asset_id)
        .limit(1);
      if (error) throw error;
      assets = data ?? [];
    } else {
      const { data, error } = await supabase
        .from("video_assets")
        .select("id, asset_key, title, duration_seconds, module_id, draft_script, regeneration_reason, needs_regeneration")
        .eq("needs_regeneration", true);
      if (error) throw error;
      // Order: CONTENT CORRECTED first, then by (no module_number here — sort after joining)
      assets = (data ?? []).sort((a, b) => {
        const ap = String(a.regeneration_reason ?? "").startsWith("CONTENT CORRECTED") ? 0 : 1;
        const bp = String(b.regeneration_reason ?? "").startsWith("CONTENT CORRECTED") ? 0 : 1;
        return ap - bp;
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRun("error", { error: `select failed: ${msg}` });
    return new Response(
      JSON.stringify({ success: false, error: msg, runId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Filter out assets with existing draft_script unless force
  const filtered: any[] = [];
  for (const a of assets) {
    if (!force && typeof a.draft_script === "string" && a.draft_script.trim().length > 0) {
      skippedExisting += 1;
      continue;
    }
    filtered.push(a);
  }

  // Enrich with module info so we can sort by module_number and pass content
  const moduleIds = Array.from(new Set(filtered.map((a) => a.module_id).filter(Boolean)));
  const moduleMap = new Map<string, any>();
  if (moduleIds.length > 0) {
    const { data: mods } = await supabase
      .from("course_modules")
      .select("id, module_number, title, content, comar_reference")
      .in("id", moduleIds);
    for (const m of mods ?? []) moduleMap.set(m.id, m);
  }

  // Re-sort: CONTENT CORRECTED first, then module_number asc
  filtered.sort((a, b) => {
    const ap = String(a.regeneration_reason ?? "").startsWith("CONTENT CORRECTED") ? 0 : 1;
    const bp = String(b.regeneration_reason ?? "").startsWith("CONTENT CORRECTED") ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const am = moduleMap.get(a.module_id)?.module_number ?? 9999;
    const bm = moduleMap.get(b.module_id)?.module_number ?? 9999;
    return am - bm;
  });

  const toProcess = body.asset_id ? filtered : filtered.slice(0, limit);
  assetsSelected = toProcess.length;

  // ---- Process each asset ----
  for (const asset of toProcess) {
    try {
      const mod = moduleMap.get(asset.module_id);
      if (!mod) {
        errors.push({ asset_id: asset.id, message: "module not found for asset" });
        continue;
      }

      // Look up COMAR text by section_number = module's comar_reference
      let comarSectionTitle: string | null = null;
      let comarText: string | null = null;
      if (mod.comar_reference) {
        const { data: reg } = await supabase
          .from("regulatory_content")
          .select("section_title, content_text, created_at")
          .eq("section_number", mod.comar_reference)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (reg) {
          comarSectionTitle = reg.section_title ?? null;
          comarText = reg.content_text ?? null;
        }
      }

      const durationSec = Number(asset.duration_seconds) || 240; // 4 min default
      const targetMinutes = Math.max(1, Math.round(durationSec / 60));
      const targetWords = targetMinutes * 150;

      const userPrompt =
        `Module ${mod.module_number}: ${mod.title}\n\n` +
        `TARGET DURATION: ~${targetMinutes} minute(s) (~${targetWords} words at 150 wpm).\n\n` +
        `--- MODULE CONTENT (authoritative) ---\n${mod.content ?? "(empty)"}\n\n` +
        (comarText
          ? `--- COMAR ${mod.comar_reference}${comarSectionTitle ? ` — ${comarSectionTitle}` : ""} ---\n${comarText}\n\n`
          : `--- COMAR: none supplied ---\n\n`) +
        `Write a spoken narration script for text-to-speech. Requirements:\n` +
        `- Plain spoken English, second person ("you"), warm but professional.\n` +
        `- Short paragraphs separated by blank lines. No headings, no stage directions, no markdown, no bullet lists.\n` +
        `- Roughly ${targetWords} words total.\n` +
        `- Every regulatory figure, threshold, deadline and citation must appear EXACTLY as it appears in the source above. Do not paraphrase numbers.\n` +
        `- Do not introduce any regulatory fact that is not in the supplied text.\n` +
        (comarText
          ? `- End with a closing line that names the COMAR section (${mod.comar_reference}).\n`
          : `- End with a brief closing line that does NOT cite any COMAR section (none was supplied).\n`) +
        `Return plain text only — no preamble, no JSON, no code fences.`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!resp.ok) {
        const errTxt = await resp.text();
        errors.push({
          asset_id: asset.id,
          message: `anthropic ${resp.status}: ${errTxt.slice(0, 500)}`,
        });
        continue;
      }

      const data = await resp.json();
      const script: string = (data?.content?.[0]?.text ?? "").trim();
      if (!script) {
        errors.push({ asset_id: asset.id, message: "empty script returned" });
        continue;
      }

      const { error: updErr } = await supabase
        .from("video_assets")
        .update({
          draft_script: script,
          draft_generated_at: new Date().toISOString(),
          review_status: "draft_ready",
        })
        .eq("id", asset.id);

      if (updErr) {
        errors.push({ asset_id: asset.id, message: `update failed: ${updErr.message}` });
        continue;
      }

      scriptsWritten += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ asset_id: asset.id, message: msg });
    }
  }

  const status: "success" | "partial" | "error" =
    errors.length === 0 && scriptsWritten > 0
      ? "success"
      : scriptsWritten === 0 && assetsSelected > 0
      ? "error"
      : scriptsWritten === 0
      ? "success" // nothing to do
      : "partial";

  await logRun(status);

  return new Response(
    JSON.stringify({
      success: true,
      runId,
      assets_selected: assetsSelected,
      scripts_written: scriptsWritten,
      skipped: skippedExisting,
      errors,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
