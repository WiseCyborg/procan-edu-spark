// Dispatches rendered TTS-narration-with-on-screen-text videos to an external
// render provider. Edge functions cannot ffmpeg. This function:
//   1. Generates a slide outline (on-screen text plan) from the draft_script.
//   2. Signs a 24h URL to the private narration MP3.
//   3. Dispatches the render job to the first configured provider.
// It does NOT set draft_video_url — a separate collector fetches the finished
// asset later.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "video-drafts";
const HARD_MAX = 3;

type ProviderName = "shotstack" | "creatomate" | "json2video" | "descript";

interface Slide {
  start_seconds: number;
  duration_seconds: number;
  heading: string;
  lines: string[];
}

interface AssetResult {
  asset_id: string;
  status: "dispatched" | "error" | "skipped";
  render_job_id?: string;
  slides?: number;
  reason?: string;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

async function generateSlideOutline(
  script: string,
  durationSeconds: number,
  apiKey: string,
): Promise<Slide[]> {
  const system =
    "You are a video planning assistant. You output only strict JSON. No prose, no markdown, no code fences.";
  const user = [
    "Produce an on-screen text plan (slide outline) for a narrated compliance video.",
    `Total narration duration: ${durationSeconds} seconds.`,
    "",
    "Rules:",
    "- Return ONLY a JSON array. No fences, no commentary.",
    "- Between 6 and 12 slides, in order, spanning the FULL duration, with no gaps and no overlaps.",
    "- Each element: {\"start_seconds\": number, \"duration_seconds\": number, \"heading\": string, \"lines\": string[]}.",
    "- heading: at most 6 words. Each line in lines: at most 12 words. At most 4 lines per slide.",
    "- EVERY specific figure, threshold, deadline, percentage, or time period spoken in the script MUST appear as on-screen text in the slide covering that moment. That is the reason on-screen text exists.",
    "- Do not invent content that is not spoken in the script.",
    "",
    "Narration script:",
    script,
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = (data?.content?.[0]?.text ?? "").trim();
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`outline parse failed: ${(e as Error).message}; raw=${cleaned.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("outline is not a non-empty array");
  }
  return parsed as Slide[];
}

async function dispatchShotstack(
  apiKey: string,
  audioUrl: string,
  slides: Slide[],
  durationSeconds: number,
): Promise<string> {
  // One title clip per slide, positioned at its start_seconds for duration_seconds.
  const titleClips = slides.map((s) => ({
    asset: {
      type: "title",
      text: [s.heading, ...(s.lines ?? [])].join("\n"),
      style: "minimal",
      size: "medium",
    },
    start: Number(s.start_seconds) || 0,
    length: Math.max(1, Number(s.duration_seconds) || 1),
  }));

  const timeline = {
    soundtrack: { src: audioUrl, effect: "fadeInFadeOut" },
    background: "#0b1220",
    tracks: [{ clips: titleClips }],
  };

  const body = {
    timeline,
    output: {
      format: "mp4",
      resolution: "hd",
      size: { width: 1280, height: 720 },
    },
  };

  const res = await fetch("https://api.shotstack.io/edit/stage/render", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    throw new Error(`shotstack ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  const jobId = json?.response?.id;
  if (!jobId) throw new Error(`shotstack: missing job id in response`);
  // durationSeconds is currently informational only; Shotstack derives runtime
  // from the timeline itself.
  void durationSeconds;
  return jobId as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = performance.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const shotstackKey = Deno.env.get("SHOTSTACK_API_KEY");
  const creatomateKey = Deno.env.get("CREATOMATE_API_KEY");
  const json2videoKey = Deno.env.get("JSON2VIDEO_API_KEY");
  const descriptKey = Deno.env.get("DESCRIPT_API_KEY");

  const providersChecked = {
    SHOTSTACK_API_KEY: !!shotstackKey,
    CREATOMATE_API_KEY: !!creatomateKey,
    JSON2VIDEO_API_KEY: !!json2videoKey,
    DESCRIPT_API_KEY: !!descriptKey,
  };

  let provider: ProviderName | null = null;
  if (shotstackKey) provider = "shotstack";
  else if (creatomateKey) provider = "creatomate";
  else if (json2videoKey) provider = "json2video";
  else if (descriptKey) provider = "descript";

  const results: AssetResult[] = [];
  let processed = 0;
  let dispatched = 0;
  let failed = 0;

  const logRun = async (status: "success" | "error", errorMessage?: string) => {
    try {
      await supabase.from("cron_job_executions").insert({
        job_name: "render-video",
        executed_at: new Date().toISOString(),
        status,
        execution_time_ms: Math.round(performance.now() - t0),
        error_message: JSON.stringify({
          assets_processed: processed,
          assets_dispatched: dispatched,
          assets_failed: failed,
          provider_used: provider,
          providers_checked: providersChecked,
          ...(errorMessage ? { error: errorMessage } : {}),
        }),
      });
    } catch (e) {
      console.error("[render-video] log insert failed:", e);
    }
  };

  try {
    // ---- Authorisation (matches generate-video-narration) ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user ?? null;
    if (user) {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (rolesErr) throw new Error(`role lookup failed: ${rolesErr.message}`);
      const allowed = (roles ?? []).some(
        (r: { role: string }) => r.role === "admin" || r.role === "training_coordinator",
      );
      if (!allowed) {
        return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ---- Provider gate ----
    if (!provider) {
      await logRun("error", "no_render_provider_configured");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "no_render_provider_configured",
          providers_checked: providersChecked,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!anthropicKey) {
      await logRun("error", "missing_anthropic_key");
      return new Response(
        JSON.stringify({ ok: false, error: "missing_anthropic_key" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Input ----
    let body: { asset_id?: string; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      // no body OK
    }
    const rawLimit = typeof body.limit === "number" ? body.limit : 1;
    const limit = Math.max(1, Math.min(HARD_MAX, rawLimit));

    // ---- Asset selection ----
    let query = supabase
      .from("video_assets")
      .select(
        "id, draft_script, draft_audio_url, draft_audio_duration_seconds, draft_audio_generated_at, draft_video_url, render_status, slide_outline",
      )
      .not("draft_audio_url", "is", null)
      .is("draft_video_url", null)
      .or("render_status.is.null,render_status.eq.failed")
      .order("draft_audio_generated_at", { ascending: true });

    if (body.asset_id) {
      query = supabase
        .from("video_assets")
        .select(
          "id, draft_script, draft_audio_url, draft_audio_duration_seconds, draft_audio_generated_at, draft_video_url, render_status, slide_outline",
        )
        .eq("id", body.asset_id)
        .limit(1);
    } else {
      query = query.limit(limit);
    }

    const { data: assets, error: selErr } = await query;
    if (selErr) throw new Error(`asset lookup failed: ${selErr.message}`);

    for (const asset of assets ?? []) {
      processed++;

      try {
        if (!asset.draft_audio_url) {
          results.push({ asset_id: asset.id, status: "skipped", reason: "no draft_audio_url" });
          continue;
        }
        if (asset.draft_video_url) {
          results.push({ asset_id: asset.id, status: "skipped", reason: "already has draft_video_url" });
          continue;
        }

        const duration = Number(asset.draft_audio_duration_seconds) || 0;
        if (!asset.draft_script || duration <= 0) {
          throw new Error("missing draft_script or duration");
        }

        // STEP A — outline
        let slides: Slide[] = Array.isArray(asset.slide_outline)
          ? (asset.slide_outline as Slide[])
          : [];
        if (!slides.length) {
          slides = await generateSlideOutline(asset.draft_script, duration, anthropicKey);
          const { error: outlineErr } = await supabase
            .from("video_assets")
            .update({ slide_outline: slides })
            .eq("id", asset.id);
          if (outlineErr) throw new Error(`outline persist failed: ${outlineErr.message}`);
        }

        // STEP B — signed audio URL, 24h
        const { data: signed, error: signErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(asset.draft_audio_url, 60 * 60 * 24);
        if (signErr || !signed?.signedUrl) {
          throw new Error(`sign audio failed: ${signErr?.message ?? "unknown"}`);
        }

        // STEP C — dispatch
        let jobId: string;
        switch (provider) {
          case "shotstack":
            jobId = await dispatchShotstack(shotstackKey!, signed.signedUrl, slides, duration);
            break;
          case "creatomate":
            throw new Error("provider_creatomate_not_implemented");
          case "json2video":
            throw new Error("provider_json2video_not_implemented");
          case "descript":
            throw new Error("provider_descript_not_implemented");
        }

        // STEP D — persist success
        const { error: updErr } = await supabase
          .from("video_assets")
          .update({
            render_provider: provider,
            render_job_id: jobId,
            render_status: "dispatched",
            render_dispatched_at: new Date().toISOString(),
            render_error: null,
          })
          .eq("id", asset.id);
        if (updErr) throw new Error(`update failed: ${updErr.message}`);

        dispatched++;
        results.push({
          asset_id: asset.id,
          status: "dispatched",
          render_job_id: jobId,
          slides: slides.length,
        });
      } catch (perAssetErr) {
        const reason = perAssetErr instanceof Error ? perAssetErr.message : String(perAssetErr);
        console.error(`[render-video] asset ${asset.id} failed:`, reason);
        failed++;
        await supabase
          .from("video_assets")
          .update({ render_status: "failed", render_error: reason })
          .eq("id", asset.id);
        results.push({ asset_id: asset.id, status: "error", reason });
      }
    }

    await logRun("success");
    return new Response(
      JSON.stringify({ ok: true, provider, processed, dispatched, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[render-video] fatal:", msg);
    await logRun("error", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg, processed, dispatched, results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
