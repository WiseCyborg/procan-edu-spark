import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice-to-text via Google Cloud Speech-to-Text (consolidated with Google TTS).
// Reuses the Google API key already used by text-to-voice. Prefers a dedicated
// GOOGLE_STT_API_KEY if set, otherwise falls back to GOOGLE_TTS_API_KEY.
// Keeps the { audio } -> { text } contract so the frontend needs no change.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, languageCode } = await req.json();
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const KEY = Deno.env.get('GOOGLE_STT_API_KEY') || Deno.env.get('GOOGLE_TTS_API_KEY');
    if (!KEY) {
      throw new Error('Google Speech API key not found');
    }

    // Frontend sends base64-encoded WebM/Opus audio (Chrome/Edge MediaRecorder).
    // Google STT accepts the base64 directly in audio.content.
    const body = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: languageCode || 'en-US',
        enableAutomaticPunctuation: true,
        model: 'latest_short',
      },
      audio: { content: audio },
    };

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      const message = data?.error?.message || `Google STT error: ${response.status}`;
      throw new Error(message);
    }

    const text = (data.results || [])
      .map((r) => r.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Voice-to-text error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});