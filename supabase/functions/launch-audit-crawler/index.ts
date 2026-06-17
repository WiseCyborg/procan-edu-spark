// Admin-only Firecrawl crawler for launch readiness UAT.
// For each configured route, scrapes preview URL with markdown+screenshot+links,
// runs heuristic checks, computes a real pass/warn/fail rollup, and persists
// results to launch_audit_runs. Also probes the welcome-intro asset URL.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_ROUTES = [
  "/",
  "/auth",
  "/dashboard",
  "/courses",
  "/admin",
  "/faq",
  "/certificate-verification",
];

// Per-route expectations. `required` checks => fail if false.
// `warn` checks => warn if true (informational red flag).
// Anything not listed is recorded but does not affect rollup.
type CheckName =
  | "has_header"
  | "has_language_switcher"
  | "has_password_eye_icon"
  | "has_vimeo_iframe"
  | "has_hardcoded_iframe";

const ROUTE_EXPECTATIONS: Record<string, { requiredTrue?: CheckName[]; warnIfTrue?: CheckName[] }> = {
  "/": { requiredTrue: ["has_header", "has_language_switcher", "has_vimeo_iframe"] },
  "/auth": { requiredTrue: ["has_header", "has_password_eye_icon"] },
  "/dashboard": { requiredTrue: ["has_header"] },
  "/courses": { requiredTrue: ["has_header", "has_language_switcher"] },
  "/admin": { requiredTrue: ["has_header"] },
  "/faq": { requiredTrue: ["has_header"] },
  "/certificate-verification": { requiredTrue: ["has_header"] },
};

interface ScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    links?: string[];
    screenshot?: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
}

async function firecrawlScrape(url: string, apiKey: string): Promise<{ ok: boolean; status: number; data: ScrapeResult }> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "screenshot", "links"],
      onlyMainContent: false,
      waitFor: 1500,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function analyze(route: string, scrape: ScrapeResult): Record<string, unknown> {
  const md = (scrape.data?.markdown ?? "").toLowerCase();
  const html = (scrape.data?.html ?? "").toLowerCase();
  const links = scrape.data?.links ?? [];
  const haystack = `${md}\n${html}`;

  return {
    has_header: /pro\s*cann|procannedu|navigation|menu/.test(haystack),
    has_language_switcher: /language|english|español|中文/.test(haystack),
    has_password_eye_icon: route === "/auth" ? /eye|show password|toggle password/.test(haystack) : null,
    has_vimeo_iframe: /player\.vimeo\.com|vimeo\.com\/video/.test(haystack),
    has_hardcoded_iframe: /<iframe[^>]+src=/.test(html) ? true : false,
    markdown_chars: md.length,
    link_count: links.length,
    title: (scrape.data?.metadata as { title?: string } | undefined)?.title ?? null,
  };
}

function computeRollup(
  route: string,
  httpStatus: number | null,
  findings: Record<string, unknown>,
): { rollup: "pass" | "warn" | "fail"; failed: Array<{ check: string; reason: string }> } {
  const failed: Array<{ check: string; reason: string }> = [];

  if (httpStatus === null || httpStatus < 200 || httpStatus >= 300) {
    failed.push({ check: "http_status", reason: `HTTP ${httpStatus ?? "no response"}` });
  }

  const exp = ROUTE_EXPECTATIONS[route];
  if (exp?.requiredTrue) {
    for (const check of exp.requiredTrue) {
      const v = findings[check];
      if (v !== true) {
        failed.push({ check, reason: `expected true, got ${v === null ? "n/a" : String(v)}` });
      }
    }
  }

  let warn = false;
  if (exp?.warnIfTrue) {
    for (const check of exp.warnIfTrue) {
      if (findings[check] === true) {
        failed.push({ check, reason: "warn: present and unexpected" });
        warn = true;
      }
    }
  }

  if (failed.some((f) => !f.reason.startsWith("warn:"))) return { rollup: "fail", failed };
  if (warn) return { rollup: "warn", failed };
  return { rollup: "pass", failed: [] };
}

// Probe the welcome-intro asset for an actual 2xx response.
async function probeWelcomeIntro(
  admin: ReturnType<typeof createClient>,
): Promise<Record<string, unknown>> {
  const started = Date.now();
  const { data: asset, error } = await admin
    .from("video_assets")
    .select("public_url, storage_path, asset_key, is_active")
    .eq("asset_key", "welcome-intro")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error_code: "db_error", error: error.message };
  if (!asset) return { ok: false, error_code: "missing_row" };

  let resolvedUrl = asset.public_url as string | null;
  let resolveMethod = "public_url";
  const storagePath = asset.storage_path as string | null;
  if (!resolvedUrl && storagePath) {
    if (storagePath.startsWith("vimeo/")) {
      // Convention: vimeo/<id>?h=<hash>
      const rest = storagePath.slice("vimeo/".length);
      resolvedUrl = `https://player.vimeo.com/video/${rest}`;
      resolveMethod = "vimeo_player";
    } else {
      const { data: signed, error: signErr } = await admin.storage
        .from("ProCannVideos")
        .createSignedUrl(storagePath, 60);
      if (signErr || !signed?.signedUrl) {
        return { ok: false, error_code: "sign_failed", error: signErr?.message };
      }
      resolvedUrl = signed.signedUrl;
      resolveMethod = "signed_url";
    }
  }
  if (!resolvedUrl) return { ok: false, error_code: "no_url" };

  // Try HEAD; fall back to a tiny ranged GET if not allowed.
  let method = "HEAD";
  let res: Response | null = null;
  try {
    res = await fetch(resolvedUrl, { method: "HEAD" });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      method = "GET";
      res = await fetch(resolvedUrl, { method: "GET", headers: { Range: "bytes=0-1024" } });
    }
  } catch (err) {
    return {
      ok: false,
      error_code: "fetch_failed",
      error: err instanceof Error ? err.message : String(err),
      resolved_url: resolvedUrl,
      resolve_method: resolveMethod,
      latency_ms: Date.now() - started,
    };
  }

  const ok = res.status >= 200 && res.status < 300;
  return {
    ok,
    method,
    http_status: res.status,
    content_type: res.headers.get("content-type"),
    content_length: res.headers.get("content-length"),
    resolved_url: resolvedUrl,
    resolve_method: resolveMethod,
    latency_ms: Date.now() - started,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error_code: "unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ success: false, error_code: "invalid_token" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await callerClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error_code: "forbidden" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    const previewUrl = Deno.env.get("PREVIEW_AUDIT_URL");
    if (!apiKey || !previewUrl) {
      return new Response(JSON.stringify({
        success: false, error_code: "missing_config",
        details: { firecrawl: !!apiKey, preview_url: !!previewUrl },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const routes: string[] = Array.isArray(body.routes) && body.routes.length ? body.routes : DEFAULT_ROUTES;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const runBatch = crypto.randomUUID();
    const base = new URL(previewUrl);
    const tokenQuery = base.searchParams.get("__lovable_token");

    const results: unknown[] = [];

    for (const route of routes) {
      const target = new URL(route, base.origin);
      if (tokenQuery) target.searchParams.set("__lovable_token", tokenQuery);

      let status = "ok";
      let httpStatus: number | null = null;
      let screenshotPath: string | null = null;
      let mdExcerpt: string | null = null;
      let findings: Record<string, unknown> = {};
      let rollup: "pass" | "warn" | "fail" = "fail";
      let failedChecks: Array<{ check: string; reason: string }> = [];

      try {
        const { ok, status: code, data } = await firecrawlScrape(target.toString(), apiKey);
        httpStatus = code;
        if (!ok || !data.success) {
          status = "error";
          findings = { error: data.error ?? `firecrawl status ${code}` };
          failedChecks = [{ check: "scrape", reason: String(findings.error) }];
        } else {
          screenshotPath = data.data?.screenshot ?? null;
          mdExcerpt = (data.data?.markdown ?? "").slice(0, 2000);
          findings = analyze(route, data);
        }
      } catch (err) {
        status = "error";
        findings = { error: err instanceof Error ? err.message : String(err) };
        failedChecks = [{ check: "scrape", reason: String(findings.error) }];
      }

      if (status === "ok") {
        const r = computeRollup(route, httpStatus, findings);
        rollup = r.rollup;
        failedChecks = r.failed;
      }

      const { data: inserted, error: insErr } = await admin
        .from("launch_audit_runs")
        .insert({
          run_batch: runBatch,
          route,
          url: target.toString(),
          http_status: httpStatus,
          status,
          rollup_status: rollup,
          failed_checks: failedChecks,
          screenshot_path: screenshotPath,
          markdown_excerpt: mdExcerpt,
          findings,
          triggered_by: caller.id,
        })
        .select("id, route, status, rollup_status, http_status, findings, failed_checks, screenshot_path")
        .single();

      if (insErr) console.error("insert error", insErr);
      results.push(inserted ?? { route, status: "insert_failed" });
    }

    // Welcome-intro probe — stored as a sentinel row in the same batch.
    const probe = await probeWelcomeIntro(admin);
    const { data: probeRow } = await admin
      .from("launch_audit_runs")
      .insert({
        run_batch: runBatch,
        route: "__welcome_intro__",
        url: String(probe.resolved_url ?? ""),
        http_status: typeof probe.http_status === "number" ? probe.http_status : null,
        status: probe.ok ? "ok" : "error",
        rollup_status: probe.ok ? "pass" : "fail",
        failed_checks: probe.ok ? [] : [{ check: "welcome_intro_probe", reason: String(probe.error_code ?? probe.error ?? "non-2xx") }],
        findings: probe,
        triggered_by: caller.id,
      })
      .select("id, route, rollup_status, findings")
      .single();
    results.push(probeRow);

    return new Response(JSON.stringify({ success: true, run_batch: runBatch, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("launch-audit-crawler fatal", err);
    return new Response(JSON.stringify({
      success: false, error_code: "internal_error",
      message: err instanceof Error ? err.message : String(err),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
