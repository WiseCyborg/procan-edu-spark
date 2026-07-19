// trigger-scrapers
// Orchestrates daily regulatory scraping for Maryland COMAR + Federal sources.
// Schema-adapted to existing tables: cron_job_executions, regulatory_updates, regulatory_content.
//
// Auth: verify_jwt=false. Accepts either:
//   - x-cron-secret header matching CRON_SHARED_SECRET env (pg_cron path)
//   - Authorization: Bearer <jwt> for a user with role=admin (manual trigger)
//
// Logs:
//   - cron_job_executions row per run (status: success|partial|error, JSON in error_message)
//   - regulatory_updates row per scraper failure (change_type='scrape_error')
//   - Resend email to admin recipients on any failure

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Deno Deploy / Supabase Edge Runtime provides EdgeRuntime.waitUntil for
// background tasks. Declare minimally in case the ambient types are missing.
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
} | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-invoked-by",
};

const SCRAPERS = ["scrape-regulations", "scrape-federal-regulations"] as const;
type ScraperName = typeof SCRAPERS[number];

interface ScraperResult {
  name: ScraperName;
  success: boolean;
  durationMs: number;
  error: string | null;
  data: unknown;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = new Date();
  const runStart = performance.now();
  const runId = crypto.randomUUID();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SHARED_SECRET") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey);

  // ---- Auth gate ----
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  let isCron = false;
  let vaultVerifierReachable = false;
  if (headerSecret.length > 0) {
    try {
      const { data: vaultOk, error: vaultErr } = await supabase.rpc("verify_cron_secret", {
        p_secret: headerSecret.trim(),
      });
      if (vaultErr) {
        console.error("[trigger-scrapers] verify_cron_secret RPC error:", vaultErr.message);
      }
      vaultVerifierReachable = vaultErr === null;
      isCron = vaultOk === true;
    } catch (e) {
      console.error("[trigger-scrapers] verify_cron_secret threw:", e instanceof Error ? e.message : e);
    }
    // Fallback: legacy env var comparison, retained so a Vault outage cannot
    // disable the daily scrape entirely.
    if (!isCron && cronSecret.length > 0) {
      isCron = headerSecret.trim() === cronSecret.trim();
    }
  }
  let isAdmin = false;
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
        isAdmin = !!roles?.some((r) => r.role === "admin");
      }
    }
  }
  if (!isCron && !isAdmin) {
    // Log the rejection BEFORE returning so silent 401s are visible in
    // cron_job_executions. Never log secret material — booleans + invoker label only.
    try {
      const rejectPayload = {
        runId,
        reason: "unauthorized",
        cron_secret_header_present: headerSecret.length > 0,
        cron_shared_secret_env_configured: cronSecret.length > 0,
        vault_verifier_reachable: vaultVerifierReachable,
        invoked_by: req.headers.get("x-invoked-by"),
      };
      await supabase.from("cron_job_executions").insert({
        job_name: "trigger-scrapers",
        executed_at: startedAt.toISOString(),
        status: "error",
        execution_time_ms: Math.round(performance.now() - runStart),
        error_message: JSON.stringify(rejectPayload),
      });
    } catch (e) {
      console.error("[trigger-scrapers] failed to log unauthorized rejection:", e);
    }
    return new Response(
      JSON.stringify({ success: false, error_code: "unauthorized", runId }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[trigger-scrapers] runId=${runId} invoker=${isCron ? "cron" : "admin"}`);

  // ---- Admin-only one-shot cron self-registration mode ----
  // POST {"setup_cron": true} as an admin → schedules comar-scrape-daily
  // at 06:00 UTC using CRON_SHARED_SECRET. Idempotent.
  if (isAdmin && !isCron) {
    try {
      const body = await req.clone().json().catch(() => ({} as Record<string, unknown>));
      if (body?.setup_cron === true) {
        if (!cronSecret || cronSecret.length < 16) {
          return new Response(
            JSON.stringify({ success: false, error_code: "missing_cron_secret", runId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const { data, error } = await supabase.rpc("setup_comar_scrape_cron", { secret: cronSecret });
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error_code: "rpc_failed", message: error.message, runId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ success: true, message: data, runId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (_e) { /* fall through */ }
  }



  // ---- Invoke each scraper IN PARALLEL as a background task ----
  const runScrapers = async () => {
    const settled = await Promise.allSettled(
      SCRAPERS.map(async (name): Promise<ScraperResult> => {
        const t0 = performance.now();
        try {
          const { data, error } = await supabase.functions.invoke(name, { body: {} });
          const durationMs = Math.round(performance.now() - t0);
          if (error) {
            const msg = error.message ?? String(error);
            await logScraperError(supabase, name, msg, runId);
            return { name, success: false, durationMs, error: msg, data: null };
          }
          return { name, success: true, durationMs, error: null, data };
        } catch (e) {
          const durationMs = Math.round(performance.now() - t0);
          const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
          await logScraperError(supabase, name, msg, runId);
          return { name, success: false, durationMs, error: msg, data: null };
        }
      }),
    );

    const results: ScraperResult[] = settled.map((s, i) =>
      s.status === "fulfilled"
        ? s.value
        : { name: SCRAPERS[i], success: false, durationMs: 0, error: String(s.reason), data: null },
    );

    const totalMs = Math.round(performance.now() - runStart);
    const successCount = results.filter((r) => r.success).length;
    const status: "success" | "partial" | "error" =
      successCount === results.length ? "success" : successCount === 0 ? "error" : "partial";

    const payload = { runId, results, invoker: isCron ? "cron" : "admin", startedAt: startedAt.toISOString() };
    try {
      await supabase.from("cron_job_executions").insert({
        job_name: "trigger-scrapers",
        executed_at: startedAt.toISOString(),
        status,
        execution_time_ms: totalMs,
        error_message: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("[trigger-scrapers] failed to log completion:", e);
    }

    if (status !== "success") {
      await sendFailureEmail(supabase, runId, status, results).catch((e) =>
        console.error("[trigger-scrapers] failure email error:", e?.message ?? e),
      );
    }
  };

  // Record a dispatch row so even a killed background task leaves evidence.
  try {
    await supabase.from("cron_job_executions").insert({
      job_name: "trigger-scrapers",
      executed_at: startedAt.toISOString(),
      status: "success",
      execution_time_ms: Math.round(performance.now() - runStart),
      error_message: JSON.stringify({ runId, phase: "dispatched", scrapers: SCRAPERS }),
    });
  } catch (e) {
    console.error("[trigger-scrapers] failed to log dispatch:", e);
  }

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(runScrapers());
  } else {
    // Fallback: fire-and-forget without blocking the response.
    runScrapers().catch((e) => console.error("[trigger-scrapers] background run error:", e));
  }

  return new Response(
    JSON.stringify({
      success: true,
      runId,
      status: "dispatched",
      scrapers: SCRAPERS,
      dispatchedAt: startedAt.toISOString(),
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

async function logScraperError(
  supabase: ReturnType<typeof createClient>,
  scraperName: string,
  message: string,
  runId: string,
) {
  try {
    await supabase.from("regulatory_updates").insert({
      section_number: `scraper:${scraperName}`,
      change_type: "scrape_error",
      new_content: `[runId=${runId}] ${message}`.slice(0, 8000),
      review_status: "error",
      detected_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[trigger-scrapers] failed to log scraper error:", e);
  }
}

async function sendFailureEmail(
  supabase: ReturnType<typeof createClient>,
  runId: string,
  status: string,
  results: ScraperResult[],
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("[trigger-scrapers] RESEND_API_KEY missing; skipping alert email");
    return;
  }

  // Recipients: explicit env override, else all admin users' emails.
  const overrides = (Deno.env.get("ADMIN_ALERT_EMAILS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let recipients = overrides;
  if (recipients.length === 0) {
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const ids = (adminRoles ?? []).map((r: { user_id: string }) => r.user_id);
    for (const id of ids) {
      const { data: u } = await supabase.auth.admin.getUserById(id);
      if (u?.user?.email) recipients.push(u.user.email);
    }
  }
  if (recipients.length === 0) {
    console.warn("[trigger-scrapers] no admin recipients; skipping alert email");
    return;
  }

  const failed = results.filter((r) => !r.success);
  const rows = failed
    .map(
      (r) =>
        `<tr><td style="padding:4px 8px"><code>${r.name}</code></td><td style="padding:4px 8px;color:#b91c1c">${escapeHtml(
          r.error ?? "",
        ).slice(0, 800)}</td></tr>`,
    )
    .join("");

  const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
  <h2 style="color:#b91c1c">⚠️ Regulatory scraper failure</h2>
  <p>Run <code>${runId}</code> finished with status <strong>${status}</strong>.</p>
  <table style="border-collapse:collapse;border:1px solid #e5e7eb;width:100%">
    <thead><tr style="background:#f3f4f6"><th style="padding:6px 8px;text-align:left">Scraper</th><th style="padding:6px 8px;text-align:left">Error</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#6b7280;font-size:12px;margin-top:16px">
    Check <a href="https://supabase.com/dashboard/project/${Deno.env.get("SUPABASE_URL")?.split(".")[0].split("//")[1]}/functions">edge function logs</a>
    and <code>regulatory_updates</code> rows where <code>change_type='scrape_error'</code> for full details.
  </p>
</div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("SMTP_FROM") ?? "ProCann Edu <noreply@procannedu.com>",
      to: recipients,
      subject: `[ProCannEdu] Regulatory scraper failure — ${runId.slice(0, 8)}`,
      html,
    }),
  });
  if (!res.ok) {
    console.error("[trigger-scrapers] resend error:", res.status, await res.text());
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
