// render-video — regeneration pipeline render step.
//
// Actions:
//   dispatch (default)  select approved assets, build captions, dispatch a render job
//   collect             poll the render job; on success push the MP4 to R2 and finalize
//
// Providers, in preference order:
//   ffmpeg_micro  narration audio + burned-in captions over a branded background
//   shotstack     legacy slide-deck timeline (kept as a fallback)
//
// COMPLIANCE GATE (non-bypassable): only assets with review_status = 'approved'
// AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL may be rendered.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canonicalKey, loadR2Config, r2Head, r2PublicUrl, r2Put } from "../_shared/r2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "video-drafts";
const HARD_MAX = 3;
const FFMPEG_MICRO_BASE = "https://api.ffmpeg-micro.com";

type ProviderName = "ffmpeg_micro" | "shotstack" | "creatomate" | "json2video" | "descript";

interface Slide {
  start_seconds: number;
  duration_seconds: number;
  heading: string;
  lines: string[];
}

interface AssetResult {
  asset_id: string;
  status: "dispatched" | "collected" | "pending" | "error" | "skipped";
  render_job_id?: string;
  slides?: number;
  r2_key?: string;
  reason?: string;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

const ASSET_COLUMNS =
  "id, asset_key, title, course_id, module_id, draft_script, draft_audio_url, draft_audio_duration_seconds, " +
  "draft_audio_generated_at, draft_video_url, render_status, render_provider, render_job_id, slide_outline, " +
  "review_status, reviewed_by, reviewed_at, storage_path, public_url, r2_key";

/** The compliance gate. Returns null when the asset may be rendered. */
function complianceBlockReason(asset: any): string | null {
  if (asset.review_status !== "approved") return "compliance_gate: review_status is not approved";
  if (!asset.reviewed_by) return "compliance_gate: reviewed_by is null";
  if (!asset.reviewed_at) return "compliance_gate: reviewed_at is null";
  return null;
}

// ---------------------------------------------------------------- captions --

function srtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const mss = String(ms % 1000).padStart(3, "0");
  return `${h}:${m}:${s},${mss}`;
}

/**
 * Build an SRT from the known narration script, timed proportionally against the
 * measured audio duration. The script is authoritative text — auto-transcription
 * is not used, because captions are compliance-visible and must never fabricate
 * or misspell a COMAR citation.
 */
export function buildSrtFromScript(script: string, durationSeconds: number): string {
  const sentences = script
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Split long sentences into <= 12-word caption cues.
  const cues: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(" ");
    for (let i = 0; i < words.length; i += 12) {
      cues.push(words.slice(i, i + 12).join(" "));
    }
  }
  if (!cues.length) return "";

  const totalWords = cues.reduce((n, c) => n + c.split(" ").length, 0);
  let cursor = 0;
  const blocks: string[] = [];

  cues.forEach((cue, idx) => {
    const share = (cue.split(" ").length / totalWords) * durationSeconds;
    const start = cursor;
    const end = idx === cues.length - 1 ? durationSeconds : Math.min(durationSeconds, cursor + share);
    cursor = end;
    blocks.push(`${idx + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${cue}\n`);
  });

  return blocks.join("\n");
}

// ------------------------------------------------------------ ffmpeg micro --

async function ffmpegMicroUpload(
  apiKey: string,
  filename: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<string> {
  const presignRes = await fetch(`${FFMPEG_MICRO_BASE}/v1/upload/presigned-url`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType }),
  });
  if (!presignRes.ok) {
    throw new Error(`ffmpeg_micro presign ${presignRes.status}: ${(await presignRes.text()).slice(0, 300)}`);
  }
  const presign = await presignRes.json();
  const uploadUrl = presign.uploadUrl ?? presign.url;
  const fileId = presign.fileId ?? presign.id ?? presign.key;
  if (!uploadUrl || !fileId) throw new Error("ffmpeg_micro presign: missing uploadUrl/fileId");

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error(`ffmpeg_micro upload ${putRes.status}: ${(await putRes.text()).slice(0, 200)}`);
  }

  const confirmRes = await fetch(`${FFMPEG_MICRO_BASE}/v1/upload/confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
  if (!confirmRes.ok) {
    throw new Error(`ffmpeg_micro confirm ${confirmRes.status}: ${(await confirmRes.text()).slice(0, 200)}`);
  }
  const confirmed = await confirmRes.json().catch(() => ({}));
  return confirmed.fileId ?? confirmed.id ?? fileId;
}

const CAPTION_STYLE =
  "FontName=Inter,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Alignment=2,MarginV=48";

async function dispatchFfmpegMicro(opts: {
  apiKey: string;
  audioBytes: Uint8Array;
  backgroundBytes: Uint8Array;
  srt: string;
  durationSeconds: number;
  slug: string;
}): Promise<string> {
  const { apiKey, audioBytes, backgroundBytes, srt, durationSeconds, slug } = opts;

  const audioId = await ffmpegMicroUpload(apiKey, `${slug}-narration.mp3`, "audio/mpeg", audioBytes);
  const bgId = await ffmpegMicroUpload(apiKey, `${slug}-background.png`, "image/png", backgroundBytes);
  const srtId = await ffmpegMicroUpload(
    apiKey,
    `${slug}-captions.srt`,
    "application/x-subrip",
    new TextEncoder().encode(srt),
  );

  // Single -vf chain — FFmpeg Micro has no -filter_complex.
  const body = {
    inputs: [
      { fileId: bgId, options: ["-loop", "1", "-t", String(Math.ceil(durationSeconds))] },
      { fileId: audioId },
    ],
    attachments: [{ fileId: srtId, filename: "captions.srt" }],
    advancedOptions: {
      videoFilter: `scale=1280:720,subtitles=captions.srt:force_style='${CAPTION_STYLE}'`,
      outputOptions: [
        "-c:v", "libx264",
        "-profile:v", "high",
        "-crf", "23",
        "-maxrate", "3M",
        "-bufsize", "6M",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "48000",
        "-ac", "2",
        "-movflags", "+faststart",
        "-shortest",
      ],
    },
    output: { format: "mp4", filename: `${slug}.mp4` },
  };

  const res = await fetch(`${FFMPEG_MICRO_BASE}/v1/transcodes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`ffmpeg_micro transcode ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const jobId = data.id ?? data.transcodeId;
  if (!jobId) throw new Error("ffmpeg_micro transcode: missing job id");
  return String(jobId);
}

async function pollFfmpegMicro(
  apiKey: string,
  jobId: string,
): Promise<{ state: "completed" | "failed" | "running"; error?: string }> {
  const res = await fetch(`${FFMPEG_MICRO_BASE}/v1/transcodes/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`ffmpeg_micro poll ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const status = String(data.status ?? data.state ?? "").toLowerCase();
  if (["completed", "complete", "succeeded", "done"].includes(status)) return { state: "completed" };
  if (["failed", "error", "cancelled"].includes(status)) {
    return { state: "failed", error: data.error ?? data.message ?? status };
  }
  return { state: "running" };
}

async function downloadFfmpegMicro(apiKey: string, jobId: string): Promise<Uint8Array> {
  const res = await fetch(`${FFMPEG_MICRO_BASE}/v1/transcodes/${jobId}/download`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`ffmpeg_micro download ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

// --------------------------------------------------------------- shotstack --

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
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
): Promise<string> {
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

  const body = {
    timeline: {
      soundtrack: { src: audioUrl, effect: "fadeInFadeOut" },
      background: "#0b1220",
      tracks: [{ clips: titleClips }],
    },
    output: { format: "mp4", resolution: "hd", size: { width: 1280, height: 720 } },
  };

  const res = await fetch("https://api.shotstack.io/edit/stage/render", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    throw new Error(`shotstack ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  const jobId = json?.response?.id;
  if (!jobId) throw new Error(`shotstack: missing job id in response`);
  return jobId as string;
}

async function pollShotstack(
  apiKey: string,
  jobId: string,
): Promise<{ state: "completed" | "failed" | "running"; url?: string; error?: string }> {
  const res = await fetch(`https://api.shotstack.io/edit/stage/render/${jobId}`, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`shotstack poll ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  const status = String(json?.response?.status ?? "").toLowerCase();
  if (status === "done") return { state: "completed", url: json?.response?.url };
  if (status === "failed") return { state: "failed", error: json?.response?.error ?? "failed" };
  return { state: "running" };
}

// ------------------------------------------------------------------- serve --

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = performance.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const ffmpegMicroKey = Deno.env.get("FFMPEG_MICRO_API_KEY");
  const shotstackKey = Deno.env.get("SHOTSTACK_API_KEY");
  const creatomateKey = Deno.env.get("CREATOMATE_API_KEY");
  const json2videoKey = Deno.env.get("JSON2VIDEO_API_KEY");
  const descriptKey = Deno.env.get("DESCRIPT_API_KEY");

  const providersChecked = {
    FFMPEG_MICRO_API_KEY: !!ffmpegMicroKey,
    SHOTSTACK_API_KEY: !!shotstackKey,
    CREATOMATE_API_KEY: !!creatomateKey,
    JSON2VIDEO_API_KEY: !!json2videoKey,
    DESCRIPT_API_KEY: !!descriptKey,
  };

  let provider: ProviderName | null = null;
  if (ffmpegMicroKey) provider = "ffmpeg_micro";
  else if (shotstackKey) provider = "shotstack";
  else if (creatomateKey) provider = "creatomate";
  else if (json2videoKey) provider = "json2video";
  else if (descriptKey) provider = "descript";

  const results: AssetResult[] = [];
  let processed = 0;
  let dispatched = 0;
  let collected = 0;
  let failed = 0;
  let action = "dispatch";

  const logRun = async (status: "success" | "error", errorMessage?: string) => {
    try {
      await supabase.from("cron_job_executions").insert({
        job_name: "render-video",
        executed_at: new Date().toISOString(),
        status,
        execution_time_ms: Math.round(performance.now() - t0),
        error_message: JSON.stringify({
          action,
          assets_processed: processed,
          assets_dispatched: dispatched,
          assets_collected: collected,
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
    // ---- Authorisation ----
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

    if (!provider) {
      await logRun("error", "no_render_provider_configured");
      return new Response(
        JSON.stringify({ ok: false, error: "no_render_provider_configured", providers_checked: providersChecked }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Input ----
    let body: { action?: string; asset_id?: string; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      // no body OK
    }
    action = body.action === "collect" ? "collect" : "dispatch";
    const limit = Math.max(1, Math.min(HARD_MAX, typeof body.limit === "number" ? body.limit : 1));

    // ================================================================ COLLECT
    if (action === "collect") {
      const cfg = loadR2Config();

      let cq = supabase
        .from("video_assets")
        .select(ASSET_COLUMNS)
        .eq("render_status", "dispatched")
        .not("render_job_id", "is", null);
      if (body.asset_id) cq = cq.eq("id", body.asset_id);
      const { data: assets, error: selErr } = await cq.limit(limit);
      if (selErr) throw new Error(`asset lookup failed: ${selErr.message}`);

      for (const asset of assets ?? []) {
        processed++;
        try {
          const usedProvider = (asset.render_provider ?? provider) as ProviderName;
          let mp4: Uint8Array;

          if (usedProvider === "ffmpeg_micro") {
            if (!ffmpegMicroKey) throw new Error("missing FFMPEG_MICRO_API_KEY");
            const poll = await pollFfmpegMicro(ffmpegMicroKey, asset.render_job_id!);
            if (poll.state === "running") {
              results.push({ asset_id: asset.id, status: "pending", render_job_id: asset.render_job_id! });
              continue;
            }
            if (poll.state === "failed") throw new Error(`render failed: ${poll.error}`);
            mp4 = await downloadFfmpegMicro(ffmpegMicroKey, asset.render_job_id!);
          } else if (usedProvider === "shotstack") {
            if (!shotstackKey) throw new Error("missing SHOTSTACK_API_KEY");
            const poll = await pollShotstack(shotstackKey, asset.render_job_id!);
            if (poll.state === "running") {
              results.push({ asset_id: asset.id, status: "pending", render_job_id: asset.render_job_id! });
              continue;
            }
            if (poll.state === "failed" || !poll.url) throw new Error(`render failed: ${poll.error ?? "no url"}`);
            const dl = await fetch(poll.url);
            if (!dl.ok) throw new Error(`shotstack download ${dl.status}`);
            mp4 = new Uint8Array(await dl.arrayBuffer());
          } else {
            throw new Error(`collect_not_implemented_for_${usedProvider}`);
          }

          if (!mp4.byteLength) throw new Error("rendered file is empty");

          // Canonical R2 key
          let courseSlug: string | null = null;
          if (asset.course_id) {
            const { data: course } = await supabase
              .from("courses").select("title").eq("id", asset.course_id).maybeSingle();
            courseSlug = course?.title ?? null;
          }
          let moduleNumber: number | null = null;
          if (asset.module_id) {
            const { data: mod } = await supabase
              .from("course_modules").select("module_number").eq("id", asset.module_id).maybeSingle();
            moduleNumber = mod?.module_number ?? null;
          }
          const { key } = canonicalKey({
            courseSlug,
            moduleNumber,
            assetKey: asset.asset_key,
            title: asset.title,
          });

          await r2Put(cfg, key, mp4, "video/mp4");
          const confirm = await r2Head(cfg, key);
          if (!confirm.exists || confirm.size !== mp4.byteLength) {
            throw new Error(`r2 verify mismatch: expected ${mp4.byteLength}, got ${confirm.size}`);
          }

          const { error: updErr } = await supabase
            .from("video_assets")
            .update({
              public_url: r2PublicUrl(cfg, key),
              storage_path: key,
              bucket_id: cfg.bucket,
              storage_provider: "r2",
              r2_key: key,
              render_status: "completed",
              render_error: null,
              needs_regeneration: false,
              regeneration_reason: null,
              last_regenerated_at: new Date().toISOString(),
              review_status: null,
              draft_video_url: null,
            })
            .eq("id", asset.id);
          if (updErr) throw new Error(`update failed: ${updErr.message}`);

          // Close the review-queue entry for this asset, if one is open.
          await supabase
            .from("content_review_queue")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              goes_live_at: new Date().toISOString(),
            })
            .eq("content_type", "video")
            .eq("content_id", asset.id)
            .neq("status", "completed");

          collected++;
          results.push({ asset_id: asset.id, status: "collected", r2_key: key });
        } catch (perAssetErr) {
          const reason = perAssetErr instanceof Error ? perAssetErr.message : String(perAssetErr);
          console.error(`[render-video:collect] asset ${asset.id} failed:`, reason);
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
        JSON.stringify({ ok: true, action, provider, processed, collected, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // =============================================================== DISPATCH
    let query = supabase
      .from("video_assets")
      .select(ASSET_COLUMNS)
      .not("draft_audio_url", "is", null)
      .is("draft_video_url", null)
      .eq("review_status", "approved")
      .not("reviewed_by", "is", null)
      .not("reviewed_at", "is", null)
      .or("render_status.is.null,render_status.eq.failed")
      .order("draft_audio_generated_at", { ascending: true });

    if (body.asset_id) {
      query = supabase.from("video_assets").select(ASSET_COLUMNS).eq("id", body.asset_id).limit(1);
    } else {
      query = query.limit(limit);
    }

    const { data: assets, error: selErr } = await query;
    if (selErr) throw new Error(`asset lookup failed: ${selErr.message}`);

    // Branded background, uploaded from the public assets bucket (cached per run).
    let backgroundBytes: Uint8Array | null = null;
    const loadBackground = async (): Promise<Uint8Array> => {
      if (backgroundBytes) return backgroundBytes;
      const path = Deno.env.get("VIDEO_BACKGROUND_PATH") ?? "branding/video-background.png";
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error || !data) throw new Error(`background download failed: ${error?.message ?? "missing"}`);
      backgroundBytes = new Uint8Array(await data.arrayBuffer());
      return backgroundBytes;
    };

    for (const asset of assets ?? []) {
      processed++;
      try {
        // Compliance gate — enforced per asset, including the asset_id path.
        const blocked = complianceBlockReason(asset);
        if (blocked) {
          results.push({ asset_id: asset.id, status: "skipped", reason: blocked });
          continue;
        }
        if (!asset.draft_audio_url) {
          results.push({ asset_id: asset.id, status: "skipped", reason: "no draft_audio_url" });
          continue;
        }
        if (asset.draft_video_url) {
          results.push({ asset_id: asset.id, status: "skipped", reason: "already has draft_video_url" });
          continue;
        }

        const duration = Number(asset.draft_audio_duration_seconds) || 0;
        if (!asset.draft_script || duration <= 0) throw new Error("missing draft_script or duration");

        let jobId: string;
        let slideCount: number | undefined;

        if (provider === "ffmpeg_micro") {
          const { data: audio, error: audioErr } = await supabase.storage
            .from(BUCKET)
            .download(asset.draft_audio_url);
          if (audioErr || !audio) throw new Error(`audio download failed: ${audioErr?.message ?? "missing"}`);

          const srt = buildSrtFromScript(asset.draft_script, duration);
          if (!srt) throw new Error("caption build produced no cues");

          jobId = await dispatchFfmpegMicro({
            apiKey: ffmpegMicroKey!,
            audioBytes: new Uint8Array(await audio.arrayBuffer()),
            backgroundBytes: await loadBackground(),
            srt,
            durationSeconds: duration,
            slug: asset.asset_key,
          });
        } else if (provider === "shotstack") {
          if (!anthropicKey) throw new Error("missing_anthropic_key");
          let slides: Slide[] = Array.isArray(asset.slide_outline) ? (asset.slide_outline as Slide[]) : [];
          if (!slides.length) {
            slides = await generateSlideOutline(asset.draft_script, duration, anthropicKey);
            const { error: outlineErr } = await supabase
              .from("video_assets").update({ slide_outline: slides }).eq("id", asset.id);
            if (outlineErr) throw new Error(`outline persist failed: ${outlineErr.message}`);
          }
          const { data: signed, error: signErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(asset.draft_audio_url, 60 * 60 * 24);
          if (signErr || !signed?.signedUrl) {
            throw new Error(`sign audio failed: ${signErr?.message ?? "unknown"}`);
          }
          jobId = await dispatchShotstack(shotstackKey!, signed.signedUrl, slides);
          slideCount = slides.length;
        } else {
          throw new Error(`provider_${provider}_not_implemented`);
        }

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
        results.push({ asset_id: asset.id, status: "dispatched", render_job_id: jobId, slides: slideCount });
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
      JSON.stringify({ ok: true, action, provider, processed, dispatched, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[render-video] fatal:", msg);
    await logRun("error", msg);
    return new Response(
      JSON.stringify({ ok: false, action, error: msg, processed, dispatched, collected, results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
