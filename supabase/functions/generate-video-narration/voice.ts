// William, 2026-10-11: ProCann uses the m0–23 voice. Charon
// (en-US-Chirp3-HD-Charon) is for a separate project (Georgia county
// phone line) and must not be the ProCann default.
//
// module_01's draft audio is recorded as google:en-US-Neural2-G. m0 and
// m2–23 have no recorded variant; the old Railway worker said only
// "Neural2". Nothing in migrations, seed data, or other narration code
// names a different m0–23 variant. The pre-2026-10-05 copy of this
// function called en-US-Neural2-D (MP3, speakingRate 1.0, pitch 0.0) and
// stored draft_audio_provider as "google", so that call is not a record
// of the rendered modules.
//
// Audio matches that earlier Google request, plus an explicit 24000 Hz
// sample rate: Neural2-G's natural rate, mono MP3, compatible with the
// rendered m1–23 AAC-LC 24 kHz mono videos. speakingRate 1.0 and pitch
// 0.0 are Google's defaults; this repo never records another rate or pitch
// for course narration.

export const DEFAULT_NARRATION_VOICE = "en-US-Neural2-G";
export const DEFAULT_NARRATION_LANGUAGE = "en-US";
export const CHARON_VOICE = "en-US-Chirp3-HD-Charon";

export const NARRATION_SPEAKING_RATE = 1.0;
export const NARRATION_PITCH = 0.0;
export const NARRATION_SAMPLE_RATE_HERTZ = 24000;

export const ELEVENLABS_VOICE = "21m00Tcm4TlvDq8ikWAM";

export type GoogleEncoding = "MP3" | "MP3_64_KBPS";
export type NarrationProviderName = "google" | "elevenlabs";
export type VoiceSource = "job" | "env" | "default";

export interface ResolvedVoice {
  voiceName: string;
  languageCode: string;
  source: VoiceSource;
}

export function isChirpVoice(voiceName: string): boolean {
  return /chirp/i.test(voiceName);
}

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function languageFromVoiceName(voiceName: string): string | null {
  const match = /^([a-z]{2,3}-[A-Za-z]{2})-/.exec(voiceName);
  return match ? match[1] : null;
}

export function resolveNarrationVoice(input: {
  bodyVoice?: string | null;
  envVoice?: string | null;
  bodyLanguage?: string | null;
  envLanguage?: string | null;
}): ResolvedVoice {
  const bodyVoice = nonEmpty(input.bodyVoice);
  const envVoice = nonEmpty(input.envVoice);
  const voiceName = bodyVoice ?? envVoice ?? DEFAULT_NARRATION_VOICE;
  const source: VoiceSource = bodyVoice ? "job" : envVoice ? "env" : "default";

  if (source === "default") {
    if (voiceName !== DEFAULT_NARRATION_VOICE || /charon/i.test(voiceName)) {
      throw new Error("refusing to default ProCann narration to a non-m0-23 voice");
    }
  }

  const languageCode =
    nonEmpty(input.bodyLanguage) ??
    nonEmpty(input.envLanguage) ??
    languageFromVoiceName(voiceName) ??
    DEFAULT_NARRATION_LANGUAGE;

  return { voiceName, languageCode, source };
}

// Google unless NARRATION_TTS_PROVIDER is exactly "elevenlabs".
// A missing key never selects the other provider.
export function resolveNarrationProvider(
  providerFlag: string | null | undefined,
  keys: { google: boolean; elevenlabs: boolean },
): { providerFlag: string; provider: NarrationProviderName | null } {
  const normalized = (providerFlag ?? "").trim().toLowerCase();
  const flag = normalized || "google";
  if (flag === "elevenlabs") {
    return { providerFlag: flag, provider: keys.elevenlabs ? "elevenlabs" : null };
  }
  return { providerFlag: flag, provider: keys.google ? "google" : null };
}

export function initialGoogleEncoding(voiceName: string): GoogleEncoding {
  // MP3_64_KBPS is Chirp 3 HD on v1beta1. Neural2 uses standard MP3.
  return isChirpVoice(voiceName) ? "MP3_64_KBPS" : "MP3";
}

export interface GoogleSynthesisRequest {
  url: string;
  encoding: GoogleEncoding;
  body: {
    input: { text: string };
    voice: { languageCode: string; name: string };
    audioConfig: {
      audioEncoding: GoogleEncoding;
      speakingRate: number;
      pitch?: number;
      sampleRateHertz?: number;
    };
  };
}

export function googleSynthesisRequest(
  text: string,
  voice: { voiceName: string; languageCode: string },
  encoding: GoogleEncoding,
): GoogleSynthesisRequest {
  const chirp = isChirpVoice(voice.voiceName);
  const audioConfig: GoogleSynthesisRequest["body"]["audioConfig"] = {
    audioEncoding: encoding,
    speakingRate: NARRATION_SPEAKING_RATE,
  };
  // Chirp 3 HD rejects pitch. Leave sample rate unset for that explicit
  // override so the request stays the Chirp shape. Neural2 is mono MP3
  // at its natural 24000 Hz rate.
  if (!chirp) {
    audioConfig.pitch = NARRATION_PITCH;
    audioConfig.sampleRateHertz = NARRATION_SAMPLE_RATE_HERTZ;
  }
  const url = encoding === "MP3_64_KBPS"
    ? "https://texttospeech.googleapis.com/v1beta1/text:synthesize"
    : "https://texttospeech.googleapis.com/v1/text:synthesize";
  return {
    url,
    encoding,
    body: {
      input: { text },
      voice: { languageCode: voice.languageCode, name: voice.voiceName },
      audioConfig,
    },
  };
}
