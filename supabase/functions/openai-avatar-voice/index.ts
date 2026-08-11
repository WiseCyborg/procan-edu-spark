import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map an incoming voice selector (legacy OpenAI-style name, or 'male'/'female')
// to a Google Neural2 voice. Keeps backward compatibility with existing callers.
function mapVoice(voice: unknown) {
  const v = String(voice ?? '').toLowerCase();
  const femaleNames = ['nova', 'shimmer', 'alloy', 'female', 'f'];
  const isFemale = femaleNames.includes(v) || v.includes('female');
  return {
    name: isFemale ? 'en-US-Neural2-F' : 'en-US-Neural2-D',
    ssmlGender: isFemale ? 'FEMALE' : 'MALE',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'nova' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const GOOGLE_TTS_API_KEY = Deno.env.get('GOOGLE_TTS_API_KEY');
    if (!GOOGLE_TTS_API_KEY) {
      throw new Error('Google TTS API key not configured');
    }

    const { name, ssmlGender } = mapVoice(voice);

    console.log('[Avatar Voice] Google TTS voice:', name, 'text length:', String(text).length);

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: String(text).substring(0, 5000) },
          voice: { languageCode: 'en-US', name, ssmlGender },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0.0 },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      const message = data?.error?.message || `Google TTS error: ${response.status}`;
      console.error('[Avatar Voice] Google TTS error:', response.status, message);
      throw new Error(message);
    }

    return new Response(
      JSON.stringify({
        audio_base64: data.audioContent,
        voice_used: name,
        text_length: String(text).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Avatar Voice] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
