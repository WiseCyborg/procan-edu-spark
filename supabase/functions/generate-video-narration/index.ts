import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHUNK_BYTES = 4500;
const BUCKET = "video-drafts";
// William, 2026-10-05: every narration job uses this voice.
const GOOGLE_VOICE = "en-US-Chirp3-HD-Charon";
const ELEVENLABS_VOICE = "21m00Tcm4TlvDq8ikWAM";

interface AssetResult {
  asset_id: string;
  status: "succeeded" | "skipped" | "error";
  audio_path?: string;
  chunks?: number;
  estimated_seconds?: number;
  voice?: string;
  audio_encoding?: string;
  reason?: string;
}

// Split a script into <=MAX_CHUNK_BYTES chunks on sentence boundaries.
// Never splits mid-sentence — a single oversized sentence goes in its own
// chunk (both providers accept that; only per-request budget is at stake).
function chunkScript(script: string): string[] {
  const sentences = script.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) ?? [script];
  const enc = new TextEncoder();
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    const candidate = current + s;
    if (enc.encode(candidate).length > MAX_CHUNK_BYTES && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function ttsElevenLabs(text: string, apiKey: string): Promise<Uint8Array> {
  // Kept behind NARRATION_TTS_PROVIDER=elevenlabs. Not the default.
  const voiceId = ELEVENLABS_VOICE;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${t.slice(0, 300)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

function decodeAudio(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function redactSecret(message: string, secret: string): string {
  const scrubbed = secret ? message.split(secret).join("[redacted]") : message;
  return scrubbed.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]");
}

// Chirp 3 HD's plain MP3 encoding is 32 kb/s. v1beta1 accepts MP3_64_KBPS.
// If that encoding is rejected, the caller falls back to Google's default MP3.
async function synthesizeGoogle(
  text: string,
  apiKey: string,
  encoding: "MP3_64_KBPS" | "MP3",
): Promise<Uint8Array> {
  const url = encoding === "MP3_64_KBPS"
    ? "https://texttospeech.googleapis.com/v1beta1/text:synthesize"
    : "https://texttospeech.googleapis.com/v1/text:synthesize";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "en-US", name: GOOGLE_VOICE },
      audioConfig: { audioEncoding: encoding, speakingRate: 1.0 },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error || !data.audioContent) {
    const message = redactSecret(String(data?.error?.message ?? "unknown"), apiKey);
    const err = new Error(`Google TTS ${res.status} ${encoding}: ${message}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return decodeAudio(data.audioContent);
}

async function ttsGoogle(
  text: string,
  apiKey: string,
  encoding: "MP3_64_KBPS" | "MP3",
): Promise<Uint8Array> {
  return await synthesizeGoogle(text, apiKey, encoding);
}

// Concatenate MP3 buffers by naive byte join. This is acceptable because
// every chunk comes from the same provider with identical encoding
// parameters (sample rate, channel count, bitrate), so frame headers stay
// consistent across the join. Not a general-purpose MP3 stitcher.
function concatMp3(buffers: Uint8Array[]): Uint8Array {
  const total = buffers.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = performance.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
  const googleKey = Deno.env.get("GOOGLE_TTS_API_KEY");
  // Default is Google Chirp 3 HD. ElevenLabs runs only when this is "elevenlabs".
  const providerFlag = (Deno.env.get("NARRATION_TTS_PROVIDER") ?? "google").trim().toLowerCase();
  const providersChecked = {
    ELEVENLABS_API_KEY: !!elevenKey,
    GOOGLE_TTS_API_KEY: !!googleKey,
    NARRATION_TTS_PROVIDER: providerFlag,
  };

  let provider: "elevenlabs" | "google" | null = null;
  if (providerFlag === "elevenlabs") provider = elevenKey ? "elevenlabs" : null;
  else provider = googleKey ? "google" : null;
  const voiceName = provider === "elevenlabs" ? ELEVENLABS_VOICE : GOOGLE_VOICE;

  const results: AssetResult[] = [];
  let processed = 0;
  let succeeded = 0;
  let skipped = 0;

  const logRun = async (status: "success" | "error", errorMessage?: string) => {
    try {
      await supabase.from("cron_job_executions").insert({
        job_name: "generate-video-narration",
        executed_at: new Date().toISOString(),
        status,
        execution_time_ms: Math.round(performance.now() - t0),
        error_message: JSON.stringify({
          assets_processed: processed,
          assets_succeeded: succeeded,
          assets_skipped: skipped,
          provider_used: provider,
          voice: voiceName,
          providers_checked: providersChecked,
          ...(errorMessage ? { error: errorMessage } : {}),
        }),
      });
    } catch (e) {
      console.error("[generate-video-narration] log insert failed:", e);
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

    // ---- Provider gate ----
    if (!provider) {
      await logRun("error", "no_tts_provider_configured");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "no_tts_provider_configured",
          providers_checked: providersChecked,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Input ----
    // One asset per call. A missing id used to scan every draft that had no audio.
    let body: { asset_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    if (!body.asset_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "asset_id is required. This function narrates one asset and will not scan the catalog.",
          provider,
          voice: voiceName,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Asset selection ----
    const query = supabase
      .from("video_assets")
      .select("id, draft_script, draft_generated_at, draft_audio_url")
      .eq("id", body.asset_id)
      .limit(1);

    const { data: assets, error: selErr } = await query;
    if (selErr) throw new Error(`asset lookup failed: ${selErr.message}`);

    for (const asset of assets ?? []) {
      processed++;

      if (!asset.draft_script) {
        skipped++;
        results.push({ asset_id: asset.id, status: "skipped", reason: "no draft_script" });
        continue;
      }
      if (asset.draft_audio_url) {
        skipped++;
        results.push({ asset_id: asset.id, status: "skipped", reason: "already has draft_audio_url" });
        continue;
      }

      try {
        const chunks = chunkScript(asset.draft_script);
        const audioBuffers: Uint8Array[] = [];
        let audioEncoding = provider === "google" ? "MP3_64_KBPS" : "mp3_44100_128";
        for (const chunk of chunks) {
          let buf: Uint8Array;
          if (provider === "elevenlabs") {
            buf = await ttsElevenLabs(chunk, elevenKey!);
          } else {
            try {
              buf = await ttsGoogle(chunk, googleKey!, audioEncoding === "MP3" ? "MP3" : "MP3_64_KBPS");
            } catch (googleErr) {
              const status = (googleErr as { status?: number }).status;
              if (audioEncoding === "MP3_64_KBPS" && status !== 401 && status !== 403) {
                audioEncoding = "MP3";
                buf = await ttsGoogle(chunk, googleKey!, "MP3");
              } else {
                throw googleErr;
              }
            }
          }
          audioBuffers.push(buf);
        }
        const merged = concatMp3(audioBuffers);
        const path = `narration/${asset.id}.mp3`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, merged, { contentType: "audio/mpeg", upsert: true });
        if (upErr) throw new Error(`upload failed: ${upErr.message}`);

        // Estimate duration at ~150 words per minute. This is an estimate
        // derived from the script, not measured from the produced audio.
        const wordCount = (asset.draft_script.match(/\S+/g) ?? []).length;
        const estimatedSeconds = Math.round((wordCount / 150) * 60);

        const { error: updErr } = await supabase
          .from("video_assets")
          .update({
            draft_audio_url: path,
            draft_audio_generated_at: new Date().toISOString(),
            draft_audio_provider: provider === "google"
              ? `google:${GOOGLE_VOICE}:${audioEncoding}`
              : `elevenlabs:${ELEVENLABS_VOICE}`,
            draft_audio_duration_seconds: estimatedSeconds,
          })
          .eq("id", asset.id);
        if (updErr) throw new Error(`update failed: ${updErr.message}`);

        succeeded++;
        results.push({
          asset_id: asset.id,
          status: "succeeded",
          audio_path: path,
          chunks: chunks.length,
          estimated_seconds: estimatedSeconds,
          voice: voiceName,
          audio_encoding: audioEncoding,
        });
      } catch (perAssetErr) {
        const reason = perAssetErr instanceof Error ? perAssetErr.message : String(perAssetErr);
        console.error(`[generate-video-narration] asset ${asset.id} failed:`, reason);
        results.push({ asset_id: asset.id, status: "error", reason });
      }
    }

    await logRun("success");
    return new Response(
      JSON.stringify({ ok: true, provider, voice: voiceName, processed, succeeded, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[generate-video-narration] fatal:", msg);
    await logRun("error", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg, processed, succeeded, results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
