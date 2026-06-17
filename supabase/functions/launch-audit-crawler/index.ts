// Admin-only Firecrawl crawler for launch readiness UAT.
// For each configured route, scrapes preview URL with markdown+screenshot+links,
// runs heuristic checks, and persists results to launch_audit_runs.
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

      try {
        const { ok, status: code, data } = await firecrawlScrape(target.toString(), apiKey);
        httpStatus = code;
        if (!ok || !data.success) {
          status = "error";
          findings = { error: data.error ?? `firecrawl status ${code}` };
        } else {
          screenshotPath = data.data?.screenshot ?? null;
          mdExcerpt = (data.data?.markdown ?? "").slice(0, 2000);
          findings = analyze(route, data);
        }
      } catch (err) {
        status = "error";
        findings = { error: err instanceof Error ? err.message : String(err) };
      }

      const { data: inserted, error: insErr } = await admin
        .from("launch_audit_runs")
        .insert({
          run_batch: runBatch,
          route,
          url: target.toString(),
          http_status: httpStatus,
          status,
          screenshot_path: screenshotPath,
          markdown_excerpt: mdExcerpt,
          findings,
          triggered_by: caller.id,
        })
        .select("id, route, status, http_status, findings, screenshot_path")
        .single();

      if (insErr) console.error("insert error", insErr);
      results.push(inserted ?? { route, status: "insert_failed" });
    }

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
