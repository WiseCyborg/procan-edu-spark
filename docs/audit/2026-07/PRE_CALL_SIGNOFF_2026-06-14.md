# Pre-Call Sign-Off — 2026-06-14

One-page summary of where the launch-readiness audit stands going into today's call. All items below are evidence-backed in `evidence/chatbot/`.

## Cleared (no further action before July 1)

| Item | Closed | Evidence |
|---|---|---|
| CHATBOT-SEC-01 — System-prompt leak via injection | 2026-06-13 | [`sec01_retest.md`](evidence/chatbot/sec01_retest.md) — 5/5 jailbreak variants refused live (literal, "repeat above", paraphrase, French, base64) |
| CHATBOT-ACC-01 — RVT price hallucination | 2026-06-13 | [`acc_retest.md`](evidence/chatbot/acc_retest.md) — bot returns canonical "$149 per seat" |
| CHATBOT-ACC-02 — Wrong year ("still in 2024") | 2026-06-13 | [`acc_retest.md`](evidence/chatbot/acc_retest.md) — `todayISO()` injection; bot returns 2026 |
| AiLean role gate — anonymous / student / manager | 2026-06-13 | [`test_transcripts.md`](evidence/chatbot/test_transcripts.md) addendum — 401 / 403 / 200 live-verified |
| PAYMENT-DRIFT-01 — Doc 02 state machine mismatch | 2026-06-14 | [`docs_vs_code_drift_payments.md`](evidence/chatbot/docs_vs_code_drift_payments.md); rewritten [`02_PAYMENT_INTEGRITY.md`](02_PAYMENT_INTEGRITY.md) and payment sections of [`docs/system/04_EDGE_FUNCTIONS.md`](../../system/04_EDGE_FUNCTIONS.md) |

## Accepted deferrals (tracked for post-launch)

| Item | Accepted | Rationale |
|---|---|---|
| CHATBOT-SEC-02 — Metadata reduction | 2026-06-14 | Leaked metadata is user-identifying but not credential material. SEC-01 guardrail already blocks disclosure of the prompt envelope. Removing the fields (`certificate_number`, `expiry_date`, client-supplied `organizationId`) is a defence-in-depth hardening, not a runtime gap. [`sec01_metadata_contents.md`](evidence/chatbot/sec01_metadata_contents.md). |
| CHATBOT-G3 — `chat_intent_log` empty | 2026-06-14 | Bounded: 0 rows ever, no INSERT in code, `console.log` only. Observability gap, not a security or correctness gap. Edge logs cover the interim. |

## Not started (next track)

| Item | Owner | Trigger |
|---|---|---|
| Vimeo → Supabase video migration | Lovable | Begins after this call |

## Evidence index (chatbot domain)

- [`test_transcripts.md`](evidence/chatbot/test_transcripts.md) — initial 20-prompt run + AiLean role-gate addendum
- [`sec01_retest.md`](evidence/chatbot/sec01_retest.md) — 5-variant jailbreak re-test for SEC-01
- [`sec01_metadata_contents.md`](evidence/chatbot/sec01_metadata_contents.md) — field-by-field classification of role-context payload
- [`acc_retest.md`](evidence/chatbot/acc_retest.md) — ACC-01 / ACC-02 re-test after verifiedFactsBlock + todayISO
- [`docs_vs_code_drift.md`](evidence/chatbot/docs_vs_code_drift.md) — chatbot doc drift (Doc 05/06)
- [`docs_vs_code_drift_payments.md`](evidence/chatbot/docs_vs_code_drift_payments.md) — payment doc drift (Doc 02 + 04)

## Domain status going into the call

| Domain | Status |
|---|---|
| 1. Auth & RLS | ✅ Pass with notes |
| 2. Payment integrity | ✅ Cleared |
| 3. Email verification | ✅ Pass with notes |
| 4. Video access control | ✅ Pass |
| 5. Data governance | ✅ Pass with notes |
| 6. Chatbot architecture | ✅ Cleared |

No open blockers for July 1.

---

2026-06-16 19:55 UTC — **NO-GO** — pipelines 0/7 (snapshot writer crashed on pre-existing `supabase.sql` bug at `pipeline-health-agent` L261-262), regression not executed (orchestrator timed out before invoke), video 2/2 verified at DB+code level (welcome-intro Vimeo backfilled, section_* paths intact; no MP4 assets to smoke), cleanup verified yes (function deleted, 404 probe confirmed, no `OPS_*` secret persisted). Evidence: `evidence/e2e_run_2026-06-16.md`.
