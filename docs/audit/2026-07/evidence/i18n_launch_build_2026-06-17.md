# Evidence — i18n Launch Foundation Build

**Date:** 2026-06-17
**Owner:** AI agent (build), Louis (translation QA), Will (sign-off)
**Spec:** `ProCannEdu_i18n_Launch_Package.md` uploaded 2026-06-17

## What landed

### Database
- Migration: `profiles.preferred_language TEXT NOT NULL DEFAULT 'en'`
- Trigger `profiles_validate_preferred_language` enforces `{en, es, zh}` (used instead of CHECK constraint so future languages don't require column-drop)
- Existing profiles RLS (self read/update) covers the new column — no new policies needed

### Frontend
| File | Purpose |
|---|---|
| `src/i18n/index.ts` | i18next bootstrap, language detector, helpers |
| `src/i18n/locales/{en,es,zh}.json` | ~45 launch-scope strings (nav, chatbot UI, auth labels, common) |
| `src/hooks/usePreferredLanguage.tsx` | Profile↔i18n sync; pulls on auth, persists on change |
| `src/components/i18n/LanguageSwitcher.tsx` | Header dropdown (EN/ES/ZH) |
| `src/components/layout/Header.tsx` | LanguageSwitcher mounted (public + authed branches); all visible labels switched to `t()` |
| `src/main.tsx` | Imports `./i18n` before `<App />` |

### Chatbot
| File | Purpose |
|---|---|
| `supabase/functions/_shared/localized-prompts.ts` | `localizedPromptHead(lang, isoDate)` + `normalizeChatLanguage()` |
| `supabase/functions/chat-assistant/index.ts` | Accepts `user_language`; resolves via client → profile → 'en'; prepends localized head after GUARDRAIL + verified-facts |
| `src/hooks/useCharmAI.tsx`, `src/components/AIFAQChat.tsx`, `src/components/chat/DraggableVoiceAssistant.tsx`, `src/components/chat/ChatAssistant.tsx` | All chat-assistant invocations now pass `user_language` from localStorage |

### Guardrail decision
SEC-01 `GUARDRAIL_BLOCK` is **NOT translated** — kept in English in all three localized prompt configurations. Rationale documented in `localized-prompts.ts`: the model treats the English directive as higher-priority; translating dilutes the anti-leak signal. Localized heads merely add a language directive and a note that COMAR citations remain in English.

## Acceptance checklist (per launch package §7)

| # | Test | Status |
|---|---|---|
| 1 | Selector visible on desktop, tablet, mobile, every page | **AUTO** — mounted in shared `<Header />`. Manual UAT spot-check pending |
| 2 | Switch + no page reload | **DONE** — `i18n.changeLanguage()` is client-only re-render |
| 3 | Persist (anon) — pick ES, reload → still ES | **DONE** — `localStorage['procann_language']` set by detector cache + `setLanguage()` |
| 4 | Persist (auth) — pick ZH, log out/in → still ZH | **DONE** — `usePreferredLanguage` writes to `profiles.preferred_language` |
| 5 | String coverage spot-check ≥10 strings ES + ZH | **PENDING Louis QA** — 45 strings ship; native-speaker review still required |
| 6 | Browser detection — clear storage, browser=ES → defaults ES | **DONE** — `LanguageDetector` order: localStorage, navigator, htmlTag |
| 7 | Chatbot routing — set ES, ask in Spanish → Spanish reply | **PENDING manual test** post-deploy |
| 8 | Schema: column + trigger + RLS self-update only | **DONE** — migration applied, existing RLS covers |
| 9 | Guardrail intact — leak probe per language returns refusal | **PENDING manual test** post-deploy |

## Not in this build (per spec §8 + plan)

- COMAR translation (stays English; spec-confirmed deferred)
- ElevenLabs multilingual TTS
- Professional translator pass
- Course/video content localization
- French/Portuguese/Vietnamese/Korean
- Regional variants and RTL
- **Hardcoded Vimeo iframes** in `TrainingHandbook.tsx`/`Index.tsx` (video punch-list item 4 — separate ticket)
- **`welcome-intro` Storage fallback verification** (video punch-list item 3 — separate ticket)

## Sign-off gate

UAT may begin. Production gate:
- [ ] Louis QA review of ES + ZH strings (45 keys)
- [ ] Manual prompt-leak probe per language (tests 7 + 9)
- [ ] Video punch-list items 3 + 4 closed (separate workstream)
