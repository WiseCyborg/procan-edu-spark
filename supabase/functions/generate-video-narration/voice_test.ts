import { assertEquals, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  CHARON_VOICE,
  DEFAULT_NARRATION_LANGUAGE,
  DEFAULT_NARRATION_VOICE,
  googleSynthesisRequest,
  initialGoogleEncoding,
  resolveNarrationProvider,
  resolveNarrationVoice,
} from "./voice.ts";

Deno.test("ProCann default voice is Neural2-G, never Charon", () => {
  const resolved = resolveNarrationVoice({});
  assertEquals(resolved.voiceName, "en-US-Neural2-G");
  assertEquals(resolved.voiceName, DEFAULT_NARRATION_VOICE);
  assertEquals(resolved.languageCode, DEFAULT_NARRATION_LANGUAGE);
  assertEquals(resolved.source, "default");
  assertNotEquals(resolved.voiceName, CHARON_VOICE);
  assertEquals(/charon/i.test(resolved.voiceName), false);
});

Deno.test("blank env and job values fall back to Neural2-G", () => {
  const resolved = resolveNarrationVoice({
    envVoice: "  ",
    bodyVoice: "",
    envLanguage: " ",
    bodyLanguage: null,
  });
  assertEquals(resolved.voiceName, DEFAULT_NARRATION_VOICE);
  assertEquals(resolved.languageCode, "en-US");
  assertEquals(resolved.source, "default");
});

Deno.test("env overrides the default and a job parameter overrides the env", () => {
  const fromEnv = resolveNarrationVoice({ envVoice: " en-US-Neural2-J " });
  assertEquals(fromEnv.voiceName, "en-US-Neural2-J");
  assertEquals(fromEnv.languageCode, "en-US");
  assertEquals(fromEnv.source, "env");

  const fromJob = resolveNarrationVoice({
    envVoice: "en-US-Neural2-J",
    bodyVoice: "en-GB-Neural2-B",
    envLanguage: "en-US",
    bodyLanguage: "en-GB",
  });
  assertEquals(fromJob.voiceName, "en-GB-Neural2-B");
  assertEquals(fromJob.languageCode, "en-GB");
  assertEquals(fromJob.source, "job");
});

Deno.test("an explicit Charon override is not the fallback", () => {
  const explicit = resolveNarrationVoice({ envVoice: CHARON_VOICE });
  assertEquals(explicit.voiceName, CHARON_VOICE);
  assertEquals(explicit.source, "env");

  const cleared = resolveNarrationVoice({ envVoice: "   ", bodyVoice: undefined });
  assertEquals(cleared.voiceName, DEFAULT_NARRATION_VOICE);
});

Deno.test("provider defaults to Google and does not silently switch", () => {
  const unset = resolveNarrationProvider(undefined, { google: true, elevenlabs: true });
  assertEquals(unset.provider, "google");
  assertEquals(unset.providerFlag, "google");

  const blank = resolveNarrationProvider("  ", { google: true, elevenlabs: true });
  assertEquals(blank.provider, "google");

  const googleNamed = resolveNarrationProvider("Google", { google: true, elevenlabs: true });
  assertEquals(googleNamed.provider, "google");

  const unknown = resolveNarrationProvider("chirp", { google: true, elevenlabs: true });
  assertEquals(unknown.provider, "google");

  const googleKeyMissing = resolveNarrationProvider(undefined, { google: false, elevenlabs: true });
  assertEquals(googleKeyMissing.provider, null);

  const elevenOnlyWhenAsked = resolveNarrationProvider("elevenlabs", {
    google: true,
    elevenlabs: true,
  });
  assertEquals(elevenOnlyWhenAsked.provider, "elevenlabs");

  const elevenMissingDoesNotUseGoogle = resolveNarrationProvider("ELEVENLABS", {
    google: true,
    elevenlabs: false,
  });
  assertEquals(elevenMissingDoesNotUseGoogle.provider, null);
  assertEquals(elevenMissingDoesNotUseGoogle.providerFlag, "elevenlabs");
});

Deno.test("Neural2-G request is 24 kHz mono-compatible MP3", () => {
  assertEquals(initialGoogleEncoding(DEFAULT_NARRATION_VOICE), "MP3");
  const request = googleSynthesisRequest(
    "hello",
    { voiceName: DEFAULT_NARRATION_VOICE, languageCode: "en-US" },
    "MP3",
  );
  assertEquals(request.url, "https://texttospeech.googleapis.com/v1/text:synthesize");
  assertEquals(request.body.voice, { languageCode: "en-US", name: "en-US-Neural2-G" });
  assertEquals(request.body.audioConfig, {
    audioEncoding: "MP3",
    speakingRate: 1.0,
    pitch: 0.0,
    sampleRateHertz: 24000,
  });
  assertEquals(request.body.voice.name === CHARON_VOICE, false);
});

Deno.test("an explicit Chirp override keeps the Chirp request and does not become the default", () => {
  assertEquals(initialGoogleEncoding(CHARON_VOICE), "MP3_64_KBPS");
  const request = googleSynthesisRequest(
    "hello",
    { voiceName: CHARON_VOICE, languageCode: "en-US" },
    "MP3_64_KBPS",
  );
  assertEquals(request.url, "https://texttospeech.googleapis.com/v1beta1/text:synthesize");
  assertEquals(request.body.voice.name, CHARON_VOICE);
  assertEquals(request.body.audioConfig, {
    audioEncoding: "MP3_64_KBPS",
    speakingRate: 1.0,
  });
  assertEquals("pitch" in request.body.audioConfig, false);
  assertEquals("sampleRateHertz" in request.body.audioConfig, false);
});
