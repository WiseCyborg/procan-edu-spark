# Language Switcher Audit — Read-Only Report

This is an assessment, not an implementation plan. No files will be changed.

## 1. Where the header switcher is rendered
- **Component:** `src/components/i18n/LanguageSwitcher.tsx` (shadcn `DropdownMenu` with a globe icon + 2-letter code trigger).
- **Mounted in:** `src/components/layout/Header.tsx` in two slots:
  - line 242 — public/marketing shell (anon + authed)
  - line 292 — authed app shell (hidden on public marketing routes)

## 2. Translation mechanism
- **Library:** `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- **Bootstrap:** `src/i18n/index.ts` (imported once at app entry). Uses `initReactI18next`, `fallbackLng: "en"`, `load: "languageOnly"`, `nonExplicitSupportedLngs: true` (so `es-MX` → `es`, `zh-CN` → `zh`).
- **Runtime API:** components call `useTranslation()` → `t("key")`.
- No Google Translate widget, no react-intl, no custom context.

## 3. Supported languages
Defined in `src/i18n/index.ts`:
- `SUPPORTED_LANGUAGES = ["en", "es", "zh"]`
- `LANGUAGE_LABELS`: `EN / English`, `ES / Español`, `ZH / 中文` (Simplified Chinese).
- The switcher dropdown iterates `SUPPORTED_LANGUAGES` directly, so adding a language is a one-file change plus a new locale JSON.

## 4. How strings are stored
- **Static JSON bundles** shipped with the client:
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`
  - `src/i18n/locales/zh.json`
- All three files are exactly **48 lines / ~40 keys**, covering only: top-nav labels, a few auth field labels, 5 chatbot strings, 5 common words, 2 error strings, 2 welcome strings.
- **Per-user persistence:** `profiles.preferred_language` in Supabase, synced by `src/hooks/usePreferredLanguage.tsx`. On login, the DB value overrides `localStorage`; on manual switch, `localStorage` (`procann_language`) updates immediately and the profile is patched in the background.
- No DB-backed translation catalog, no translation API, no per-request server translation.

## 5. Chatbot (AiLean) language handling
- The chatbot UI components — `src/components/ailean/AiLeanCoach.tsx`, `src/components/chat/EnhancedChatAssistant.tsx`, `src/components/AIFAQChat.tsx` — do **not** import `useTranslation` or reference `i18n` at all (verified via ripgrep).
- The `chatbot.*` keys in the locale JSONs (`title`, `placeholder`, `send`, `clear`, `error.generic`) exist but are **unused** — dead translations.
- The LLM prompts sent to the AI gateway are not language-aware; nothing forwards `i18n.language` to the edge functions or system prompts. Responses come back in whatever language the model infers from the user's input, not from the switcher.

## 6. What actually changes when a user switches language
- **Only strings wrapped in `t(...)`.** Ripgrep shows `useTranslation` is imported in exactly **3 files** across the entire `src/` tree:
  1. `src/components/layout/Header.tsx`
  2. `src/components/i18n/LanguageSwitcher.tsx`
  3. `src/hooks/usePreferredLanguage.tsx`
- In practice this means **only the top navigation / header menu items translate**. The rest of the page — landing hero, marketing sections, dashboards, forms, course content, certificates, chatbot, footer, toasts, error boundaries — stays in English regardless of selection.
- No route-level locale prefix, no HTML `lang` attribute swap, no RTL handling (not needed for the current set).

## 7. Coverage gaps (honest list)
- **~80 pages under `src/pages/` are not translated.** None call `useTranslation`.
- Marketing / conversion surfaces (landing page, `/employers`, `/get-started`, `/org/apply`, `/contact-procann`) are English-only despite the switcher being visible on them — the primary business risk, because Spanish is a real audience for MD cannabis workforce.
- Course content, module bodies, quiz questions, exam prompts, and certificates are stored in English in the DB with no translation column.
- Auth pages, dashboards, admin/Mission Control, seat management, verify-certificate portal — all English-only.
- Chatbot UI chrome and AI responses — see §5.
- Toasts, form validation messages, Zod error strings, error boundaries — hardcoded English.
- Email templates (Resend/Supabase Auth) — not wired to `preferred_language`.
- The locale JSONs themselves have low coverage — even the ~40 keys present are mostly nav-only; there is no `landing.*`, `dashboard.*`, `course.*`, `certificate.*`, `form.*` namespace.

## 8. Is it production-safe?
**Functionally safe, but misleading to users.** Assessment:

Working correctly:
- Switcher renders, persists to `localStorage` and `profiles.preferred_language`, hydrates on login, falls back to English cleanly, and never renders a raw key (`returnNull: false`, `fallbackLng: "en"`).
- No crashes, no console errors expected, no security concern.

Real problems:
- **Advertises multilingual support that doesn't exist.** A user selecting Español or 中文 sees the header change and effectively nothing else. This is a trust/UX bug more than a technical one, and is arguably worse than not showing the switcher at all — especially on marketing pages where the switcher is visible pre-signup.
- **Chatbot i18n keys are dead code** (defined in all three JSONs, referenced nowhere).
- **`preferred_language` is written to the DB but never read by any edge function**, so server-side flows (emails, cert generation, AI prompts) cannot honor it.
- No missing-key telemetry — gaps are silent.

## Recommended next actions (for a future build-mode session, not now)
Pick one, in priority order:
1. Decide policy: either (a) hide the switcher on routes that aren't translated, or (b) commit to translating the landing page + auth + primary CTAs first.
2. Wire `i18n.language` (or `profiles.preferred_language`) into the AiLean edge functions' system prompt so chatbot responses match the UI selection.
3. Expand locale JSONs with `landing.*`, `auth.*`, `common.*` namespaces and convert the highest-traffic pages (landing, `/auth`, `/get-started`) to `useTranslation`.
4. Add a dev-mode `saveMissing` handler to i18next to log untranslated keys during QA.

No code will be changed until you approve a specific direction.
