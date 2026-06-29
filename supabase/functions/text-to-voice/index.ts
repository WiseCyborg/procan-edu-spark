import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, voice } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    const GOOGLE_TTS_API_KEY = Deno.env.get('GOOGLE_TTS_API_KEY')
    if (!GOOGLE_TTS_API_KEY) {
      throw new Error('Google TTS API key not found')
    }

    // Map voice selector to Google Neural2 voice name.
    const voiceName = voice === 'female' ? 'en-US-Neural2-F' : 'en-US-Neural2-D'
    const ssmlGender = voice === 'female' ? 'FEMALE' : 'MALE'

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: voiceName,
            ssmlGender,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
          },
        }),
      },
    )

    const data = await response.json()

    if (!response.ok || data.error) {
      const message = data?.error?.message || `Google TTS error: ${response.status}`
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Google returns { audioContent: "<base64 mp3>" } — forward directly.
    return new Response(
      JSON.stringify({ audioContent: data.audioContent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Text-to-voice error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
