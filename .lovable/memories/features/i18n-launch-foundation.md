---
name: i18n-launch-foundation
description: Lightweight i18n with header language selector for July 1 launch. Languages en/es/zh. Profile column preferred_language. Chatbot system prompt swaps by language; SEC-01 guardrail stays English (not translated, intentional).
type: feature
---

# i18n Launch Foundation

**Scope:** UI string externalization + header language selector + chatbot language routing. Ships with July 1, 2026 launch.

## Languages
- `en` (default), `es` (Español), `zh` (中文 Simplified)

## Architecture
- **Library:** `react-i18next` + `i18next-browser-languagedetector`
- **Strings:** `src/i18n/locales/{en,es,zh}.json` (flat key namespace)
- **Init:** `src/i18n/index.ts`, imported in `src/main.tsx` before `<App />`
- **Resolution order:** profile.preferred_language → localStorage(`procann_language`) → navigator.language → `en`
- **Missing-key fallback:** silent fall back to `en`; never render raw key

## Persistence
- **Authenticated:** `public.profiles.preferred_language TEXT NOT NULL DEFAULT 'en'`, validated by trigger to enum {en,es,zh}. Existing RLS on profiles already covers self-read/update.
- **Anonymous:** `localStorage['procann_language']`
- **Sync hook:** `usePreferredLanguage()` — pulls profile on auth, persists manual changes back to profile in background

## UI
- **Component:** `src/components/i18n/LanguageSwitcher.tsx` (DropdownMenu, code+native label, check mark on active)
- **Placement:** Header (`src/components/layout/Header.tsx`) — both public-marketing branch and authed-app branch (top-right, before profile dropdown)

## Chatbot routing
- Each client invocation of `chat-assistant` now sends `user_language` from localStorage
- Edge function `supabase/functions/chat-assistant/index.ts` resolves: explicit `user_language` → profile.preferred_language → `'en'`
- Localized system-prompt heads live in `supabase/functions/_shared/localized-prompts.ts`
- **Critical:** `GUARDRAIL_BLOCK` (SEC-01 anti-prompt-leak) is **NOT translated** — kept in English so the model recognises the English directive as higher-priority. Translating weakens the leak signal.
- Insertion order: GUARDRAIL_BLOCK → verifiedFactsBlock → localizedPromptHead → existing context

## Adding a 4th language (post-launch runbook)
1. Add ISO code to `SUPPORTED_LANGUAGES` in `src/i18n/index.ts` and `LANGUAGE_LABELS`
2. Drop `src/i18n/locales/<code>.json` (copy en.json, translate)
3. Add case to `localizedPromptHead()` in `supabase/functions/_shared/localized-prompts.ts`
4. Update `SUPPORTED` array and the trigger CHECK in a migration (drop+recreate validate_preferred_language)
5. Re-run prompt-leak probe for the new language

## Deferred (NOT in launch scope)
- COMAR translation (stays English; cited with original numbers)
- ElevenLabs multilingual TTS
- Professional translation pass (current launch uses manual for high-visibility, machine-acceptable for lower-risk; Louis QA-reviews ES/ZH)
- Course/video/quiz content translation
- French/Portuguese/Vietnamese/Korean
- RTL support, regional variants (es-MX/es-ES, Simplified/Traditional split)
