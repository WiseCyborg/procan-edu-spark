# Translation Coverage Audit — Honest Assessment

## Locale files (src/i18n/locales/)

| File | Size | Top-level key groups |
|---|---|---|
| en.json | 12,233 bytes (~12 KB) | 134 |
| es.json | 13,952 bytes (~14 KB) | 134 |
| zh.json | 11,059 bytes (~11 KB) | 134 |

All three files are in structural sync (134 top-level groups each). Counting leaf strings (nested keys under `faq.items.*`, `nav.*`, `chatbot.*`, `listen.*`, `i18n.*`, etc.), each locale holds roughly **~180–200 translatable leaf strings**, dominated by the 35 FAQ Q/A pairs added in the last i18n pass.

## Hardcoded English strings in src/ (684 .ts/.tsx files)

Measured with ripgrep heuristics — undercount likely, since these patterns miss multi-line JSX, template literals, and dynamic strings:

| Category | Count |
|---|---|
| JSX text nodes (`>Some Text<`) | 3,230 |
| `placeholder="..."` literals | 278 |
| `aria-label="..."` literals | 17 |
| `title="..."` JSX props | 46 |
| `label="..."` literals | 67 |
| Toast `title:`/`description:` literals | 1,450 |
| **Rough total translatable strings** | **~5,088** |

Files that actually import `useTranslation` / `react-i18next`: **8 out of 684** (~1.2%).
Total `t('...')` call sites across the codebase: **56**.

## Honest coverage ratio

- Translated strings in use: **~56 `t()` call sites** (plus 35 FAQ items rendered via a loop, so effectively ~90 user-visible translated strings).
- Estimated translatable strings in codebase: **~5,000+**.
- **Real UI translation coverage: ~1.5–2%.**

Even being generous and assuming every leaf key in en.json (~200) is wired somewhere: coverage is still **~4%**.

## What this means in practice

- Nav header, FAQ page, AiLean chatbot UI shell, Listen button, MT badge — translated.
- Everything else — landing page, auth, dashboards, course player content chrome, admin Mission Control, checkout, certificates, toasts, form validation messages, error states, email capture, manager/employer flows — **English only**, regardless of the switcher setting.
- The 1,450 toast literals are the single biggest untranslated surface and the most user-visible during flows.

## Recommendation (not executed in plan mode)

If you want to advertise multilingual support honestly, the next pass needs to target, in order of user impact:
1. Toasts (1,450) — centralize via a `t()`-wrapped toast helper.
2. Landing page + auth (highest-traffic English strings).
3. Course player chrome + certificate UI.
4. Dashboards (student, manager, employer).

Otherwise, consider gating the ES/ZH options behind a "Beta — limited coverage" label so users aren't misled.

No files will be changed in plan mode. Approve to proceed with a scoped translation-expansion plan, or tell me which surface to prioritize first.
