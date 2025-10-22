import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'nova' } = await req.json();
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('[Avatar Voice] Generating TTS for text length:', text.length);

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice, // Options: alloy, echo, fable, onyx, nova, shimmer
        input: text.substring(0, 4096), // Limit to prevent huge requests
        speed: 1.0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Avatar Voice] OpenAI TTS error:', response.status, errorText);
      throw new Error(`OpenAI TTS error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for frontend
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    console.log('[Avatar Voice] Generated audio, size:', audioBuffer.byteLength);

    return new Response(
      JSON.stringify({ 
        audio_base64: base64Audio,
        voice_used: voice,
        text_length: text.length
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
