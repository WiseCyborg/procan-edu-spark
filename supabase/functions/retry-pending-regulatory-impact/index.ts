// retry-pending-regulatory-impact
// PCE-741: backfill / re-invoke analyze for regulatory_updates rows still NULL.
// Default dry_run=true — does NOT spend Anthropic credits or write analysis.
// Production live run requires Will/Ailean approval + funded vendor account (D15)
// and PCE-646 lock when writing.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default TRUE
    const limit = Math.min(Number(body.limit) || 25, 100);
    const since = body.since ?? "2026-09-14T00:00:00Z";
    const sectionFilter: string[] | null = Array.isArray(body.section_numbers)
      ? body.section_numbers
      : null;

    let q = supabase
      .from("regulatory_updates")
      .select("id, section_number, previous_content, new_content, detected_at, review_status")
      .is("ai_impact_analysis", null)
      .gte("detected_at", since)
      .order("detected_at", { ascending: true })
      .limit(limit);

    if (sectionFilter?.length) {
      q = q.in("section_number", sectionFilter);
    }

    const { data: rows, error } = await q;
    if (error) throw error;

    const candidates = rows ?? [];
    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          would_analyze: candidates.length,
          sections: candidates.map((r) => ({
            id: r.id,
            section_number: r.section_number,
            detected_at: r.detected_at,
            review_status: r.review_status,
          })),
          note: "Pass { dry_run: false } only with approval + funded Anthropic (D15) + PCE-646 lock.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const results: Array<{ section_number: string; ok: boolean; message?: string }> = [];
    for (const row of candidates) {
      const { data, error: invErr } = await supabase.functions.invoke(
        "analyze-regulatory-impact",
        {
          body: {
            section_number: row.section_number,
            old_content: row.previous_content ?? null,
            new_content: row.new_content ?? "",
          },
        },
      );
      if (invErr) {
        results.push({
          section_number: row.section_number,
          ok: false,
          message: invErr.message ?? String(invErr),
        });
      } else if (data && typeof data === "object" && (data as { error?: string }).error) {
        results.push({
          section_number: row.section_number,
          ok: false,
          message: String((data as { error: string }).error),
        });
      } else {
        results.push({ section_number: row.section_number, ok: true });
      }
      await sleep(750);
    }

    const okCount = results.filter((r) => r.ok).length;
    return new Response(
      JSON.stringify({
        success: okCount === results.length,
        dry_run: false,
        attempted: results.length,
        succeeded: okCount,
        failed: results.length - okCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
