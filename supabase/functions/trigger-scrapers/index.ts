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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  const isCron = cronSecret.length > 0 && headerSecret === cronSecret;
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



  // ---- Invoke each scraper ----
  const results: ScraperResult[] = [];
  for (const name of SCRAPERS) {
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke(name, { body: {} });
      const durationMs = Math.round(performance.now() - t0);
      if (error) {
        results.push({ name, success: false, durationMs, error: error.message ?? String(error), data: null });
        await logScraperError(supabase, name, error.message ?? String(error), runId);
      } else {
        results.push({ name, success: true, durationMs, error: null, data });
      }
    } catch (e) {
      const durationMs = Math.round(performance.now() - t0);
      const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
      results.push({ name, success: false, durationMs, error: msg, data: null });
      await logScraperError(supabase, name, msg, runId);
    }
  }

  const totalMs = Math.round(performance.now() - runStart);
  const successCount = results.filter((r) => r.success).length;
  const status: "success" | "partial" | "error" =
    successCount === results.length ? "success" : successCount === 0 ? "error" : "partial";

  // ---- Log execution ----
  const payload = { runId, results, invoker: isCron ? "cron" : "admin", startedAt: startedAt.toISOString() };
  await supabase.from("cron_job_executions").insert({
    job_name: "trigger-scrapers",
    executed_at: startedAt.toISOString(),
    status,
    execution_time_ms: totalMs,
    error_message: JSON.stringify(payload),
  });

  // ---- Alert on failure ----
  if (status !== "success") {
    await sendFailureEmail(supabase, runId, status, results).catch((e) =>
      console.error("[trigger-scrapers] failure email error:", e?.message ?? e),
    );
  }

  const httpStatus = status === "success" ? 200 : 207;
  return new Response(
    JSON.stringify({ success: status === "success", runId, status, results, durationMs: totalMs }),
    { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
