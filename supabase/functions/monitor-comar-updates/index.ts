// monitor-comar-updates
// Admin-only health endpoint for the regulatory scraping pipeline.
// Returns last successful scrape, last-run status, data-age, and recent scraper errors.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_THRESHOLD_HOURS = 26; // one missed daily cycle

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- Admin auth gate ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return json({ success: false, error_code: "unauthorized" }, 401);
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ success: false, error_code: "unauthorized" }, 401);
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) {
      return json({ success: false, error_code: "forbidden" }, 403);
    }

    // ---- Latest scraper execution (any status) ----
    const { data: latestRun } = await supabase
      .from("cron_job_executions")
      .select("executed_at, status, execution_time_ms, error_message")
      .eq("job_name", "trigger-scrapers")
      .order("executed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ---- Last successful or partial scrape ----
    const { data: lastOk } = await supabase
      .from("cron_job_executions")
      .select("executed_at, status")
      .eq("job_name", "trigger-scrapers")
      .in("status", ["success", "partial"])
      .order("executed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ---- Freshness from regulatory_content ----
    const { data: freshest } = await supabase
      .from("regulatory_content")
      .select("section_number, last_modified_at")
      .order("last_modified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastModified = freshest?.last_modified_at ? new Date(freshest.last_modified_at) : null;
    const dataAgeHours = lastModified
      ? (Date.now() - lastModified.getTime()) / 36e5
      : null;
    const staleWarning = dataAgeHours === null ? true : dataAgeHours > STALE_THRESHOLD_HOURS;

    // ---- Recent scraper errors ----
    const { data: recentErrors } = await supabase
      .from("regulatory_updates")
      .select("id, section_number, new_content, detected_at, review_status")
      .eq("change_type", "scrape_error")
      .order("detected_at", { ascending: false })
      .limit(10);

    // ---- Latest run metadata (parse JSON embedded in error_message) ----
    let latestRunPayload: unknown = null;
    if (latestRun?.error_message) {
      try { latestRunPayload = JSON.parse(latestRun.error_message); } catch { /* not json */ }
    }

    return json({
      success: true,
      timestamp: new Date().toISOString(),
      lastRun: latestRun
        ? {
            executedAt: latestRun.executed_at,
            status: latestRun.status,
            executionTimeMs: latestRun.execution_time_ms,
            payload: latestRunPayload,
          }
        : null,
      lastRunSuccess: latestRun?.status === "success",
      lastSuccessfulScrape: lastOk?.executed_at ?? null,
      lastSuccessfulScrapeStatus: lastOk?.status ?? null,
      dataAgeHours: dataAgeHours === null ? null : Number(dataAgeHours.toFixed(2)),
      staleWarning,
      staleThresholdHours: STALE_THRESHOLD_HOURS,
      freshestSection: freshest?.section_number ?? null,
      recentErrors: recentErrors ?? [],
    });
  } catch (e) {
    console.error("monitor-comar-updates error:", e);
    return json({ success: false, error_code: "internal_error", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
