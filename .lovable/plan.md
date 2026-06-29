## Plan: replace ElevenLabs TTS with Google Cloud TTS (Neural2-D)

### Findings (no code changed yet)
- Only `src/components/chat/PersonalChatbot.tsx` calls the `text-to-voice` edge function (the ElevenLabs path).
- `DraggableVoiceAssistant.tsx` does NOT use ElevenLabs — it uses `useUnifiedVoice()` (browser `speechSynthesis`). Out of scope unless explicitly requested.
- `supabase/functions/text-to-voice/index.ts` is the only ElevenLabs caller; it returns `{ audioContent: "<base64 MP3>" }`.
- No existing Google TTS edge function in the repo. Must be added (or `text-to-voice` rewritten in place).

### Proposed implementation (pending approval)

**1. Rewrite `supabase/functions/text-to-voice/index.ts` to call Google Cloud TTS**
- Auth: read `GOOGLE_TTS_API_KEY` from env (simpler than service-account JWT in Deno). User must add this secret via Project Settings → Secrets. Remove `ELEVENLABS_API_KEY` usage.
- Endpoint: `POST https://texttospeech.googleapis.com/v1/text:synthesize?key=$GOOGLE_TTS_API_KEY`.
- Body: `{ input:{text}, voice:{languageCode:"en-US", name:"en-US-Neural2-D"}, audioConfig:{audioEncoding:"MP3"} }`.
- Keep accepting the existing `{ text, voice }` request shape; map an optional `voice` param to Google Neural2 voice names (default `en-US-Neural2-D`).
- Response: pass Google's `audioContent` through unchanged so the response contract `{ audioContent: <base64 MP3> }` stays identical.
- Remove `xhr` polyfill import and the manual ArrayBuffer→base64 conversion (Google already returns base64).
- Keep CORS headers and error envelope intact.

**2. Frontend: zero changes required**
- `PersonalChatbot.tsx` already plays `data:audio/mpeg;base64,${data.audioContent}`, which works for Google MP3 output. No edit unless we expose voice selection UI.

**3. Out of scope (call out, don't change)**
- `UnifiedVoiceProvider` / `DraggableVoiceAssistant` (browser TTS) — leave untouched.
- Decommissioning `ELEVENLABS_API_KEY` from Supabase secrets — leave for the user to remove once they confirm no other consumers.

### Prerequisite from the user
Add `GOOGLE_TTS_API_KEY` (a Google Cloud API key with the Text-to-Speech API enabled, and ideally HTTP-referrer-unrestricted since edge functions don't send a referrer — restrict by API instead) in Project Settings → Secrets before the function will work. I'll wire the `add_secret` request when we switch to build mode.

### Validation after build
- `supabase--curl_edge_functions` POST to `/text-to-voice` with a short sample text; confirm 200 + non-empty base64 audio.
- Spot-check in the PersonalChatbot in the preview.
