# Docs-vs-Code Drift Scan — Chatbot Architecture

**Target docs:** `docs/system/05_CHATBOT_ARCHITECTURE.md`, plus chatbot-relevant claims in `docs/system/04_EDGE_FUNCTIONS.md`.
**Method:** For each factual claim, grep the codebase for the symbol/table/function it depends on, then read the relevant code to confirm.
**Date:** 2026-06-13

## Legend

- ✅ **Confirmed** — code matches docs
- ⚠ **Drift** — partial match (e.g., logs to console but not table)
- ❌ **Missing** — docs describe behavior that does not exist in code
- 🔄 **Inverted** — code does something the docs don't mention

---

## Claim-by-claim table

| # | Doc | Claim | Code reality | Status | Evidence | Severity |
|---|---|---|---|---|---|---|
| 1 | 05 §LLM provider | "Calls flow through the Lovable AI Gateway (`AI_GATEWAY_API_KEY`)" | Env var is named `LOVABLE_API_KEY`, not `AI_GATEWAY_API_KEY`. | ⚠ | `chat-assistant/index.ts:5` | Low |
| 2 | 05 §LLM provider | "current default is GPT-4o-class for text" | Default model is `google/gemini-2.5-flash` for both `chat-assistant` and `ailean-coach`. | ❌ | `chat-assistant/index.ts:237`, `ailean-coach/index.ts:138` | Low (doc cosmetic) |
| 3 | 05 §Prompt assembly step 4 | "History window — last N user/assistant turns from local state" | `chat-assistant` does NOT pass history to the model. The `context.conversationHistory` string array is concatenated into the system prompt as one summary line. `ailean-coach` DOES pass full history. | ⚠ | `chat-assistant/index.ts:174` vs `ailean-coach/index.ts:121–128` | Medium |
| 4 | 05 §Persistence — chat turns | "Each chat turn → intent classification + tokens → `chat_intent_log` (1 row per turn)" | **Zero rows ever** in `chat_intent_log`. No INSERT anywhere in the codebase. Only `console.log` exists in `chat-assistant`. | ❌ | DB: `SELECT count(*) FROM chat_intent_log` → 0; grep: `rg "chat_intent_log" supabase/functions src` → only type definition | Medium (**this is G3**) |
| 5 | 05 §Persistence — agent runs | "Agent runs (cron AI agents) → `ai_agent_runs`" | Confirmed. 14 edge functions INSERT into `ai_agent_runs`. | ✅ | `ai-rvt-renewal-monitor`, `ai-curriculum-optimizer`, `enrollment-lifecycle-agent`, etc. | — |
| 6 | 05 §Persistence — agent events | "Agent decisions worth surfacing → `agent_events`, `agent_escalations`" | Confirmed for `agent_events` (6 functions write). `agent_escalations` is written by **only** `pipeline-health-agent` — claim is technically true but narrower than implied. | ✅ / ⚠ | `rg "agent_escalations"` → 1 writer | Low |
| 7 | 05 §Persistence — insights | "Insights produced → `ai_insights`" | Confirmed. 3 producers (`analyze-payment-patterns`, `monitor-form-submissions`, `generate-daily-digest`). | ✅ | — | — |
| 8 | 05 §Persistence — AiLean activation | "Per-user activation tokens → `ailean_activation_tokens`" | Confirmed. Written by `AiLeanActivationQR.tsx` and `ActivateAiLean.tsx`. | ✅ | — | — |
| 9 | 05 §Persistence — voice | "Voice session metadata → `ailean_sessions`" | Table exists and is written by `useAiLeanPersistence.tsx`. Columns documented (`duration`, `transcript ref`) are actually `messages` (jsonb) + `scenario_type` — close enough but not exact. | ⚠ | `useAiLeanPersistence.tsx:75–90` | Low |
| 10 | 05 §Escalation path | "`RequestSupportButton` → `request-procann-support` (JWT-guarded) → writes to `support_requests` + `support_queue`" | Function writes `support_requests` only. `support_queue` is not touched by this function. Admin alert is queued via RPC `queue_job('admin_alert')`. | ⚠ | `request-procann-support/index.ts:53, 75–93` | Low (**CHATBOT-DRIFT-02**) |
| 11 | 05 §Surfaces table | "Edge function: `chat-assistant-enhanced`" (referenced 3 times across the doc) | **No such function exists.** Real functions are `chat-assistant` and `internal-chat-assistant`. `chat-assistant-enhanced` also appears in `docs/system/04_EDGE_FUNCTIONS.md:22`. | ❌ | `ls supabase/functions/` — function absent | Low (**CHATBOT-DRIFT-01**) |
| 12 | 05 §Voice pipeline | "mic → voice-to-text → chat-assistant-enhanced → text-to-voice" | Real pipeline is mic → `voice-to-text` → `chat-assistant` (or `internal-chat-assistant`) → `text-to-voice`. Confirmed in `DraggableVoiceAssistant.tsx:388, 519`. | ⚠ | grep results above | Low |
| 13 | 05 §Voice pipeline | "avatar-agent (lip-sync frames) for AiLean surface" | `avatar-agent` exists and writes to `agent_events`. Lip-sync claim cannot be confirmed from code alone (audio playback is client-side). | ✅ structurally | `supabase/functions/avatar-agent/index.ts:201` | — |
| 14 | 05 §Voice pipeline footer | "Vonage Verify is *not* part of the chatbot path — it's MFA only" | Confirmed. Zero references to vonage in any chatbot edge function. | ✅ | `rg vonage supabase/functions/chat-assistant supabase/functions/ailean-coach …` → no matches | — |
| 15 | 05 §Known gaps #1 | "No long-term per-user memory. History resets on reload." | Confirmed for `chat-assistant` (single-turn). AiLean has DB-backed history but each session resets on reload of the AiLean route unless the user re-selects the session. | ✅ | — | — |
| 16 | 05 §Known gaps #2 | "No tool-calling / function-calling enabled." | Confirmed. No `tools` array passed to the AI Gateway in either function. | ✅ | `chat-assistant/index.ts:236–251`, `ailean-coach/index.ts:130–143` | — |
| 17 | 05 §Known gaps #3 | "Page-context coverage is partial." | Confirmed. Many admin routes do not push context into `ChatAssistant`. | ✅ | — | — |
| 18 | 05 §Known gaps #5 | "No safety eval on outputs beyond the system prompt's compliance disclaimers." | Confirmed — and the live test (Probe 2) demonstrates the cost: partial system-prompt leak. | ✅ + 🔄 | See `test_transcripts.md` Probe 2 | High — drives `CHATBOT-SEC-01` |

---

## Summary

| Status | Count |
|---|---|
| ✅ Confirmed | 8 |
| ⚠ Drift (partial) | 6 |
| ❌ Missing | 3 |
| 🔄 Inverted | 1 (overlapping with ✅) |
| **Total claims audited** | **17** |

## Drift items grouped by severity

**Medium** (worth fixing before launch):
- #4 — `chat_intent_log` documented but never written. → fix doc, OR add the insert. Either acceptable.

**Low** (documentation hygiene, post-launch fine):
- #1, #2 — env var name and "GPT-4o-class" claim are stale.
- #3 — clarify that `chat-assistant` is single-turn and `ailean-coach` is multi-turn.
- #6 — narrow the agent_escalations claim to "pipeline-health-agent only".
- #9 — fix the `ailean_sessions` column names in the doc.
- #10 — drop the `support_queue` mention from the escalation flow.
- #11, #12 — replace `chat-assistant-enhanced` with `chat-assistant` everywhere.

**None of these drift items block July 1 launch.** They are all documentation-side corrections except #4, which is a small code addition if the analytics behavior is wanted.

## Confidence in the rest of the audit pack

The drift items are concentrated in `docs/system/05_CHATBOT_ARCHITECTURE.md`, which appears to have been written ahead of the final code consolidation (e.g., `chat-assistant-enhanced` was likely an earlier function name). Spot checks of the other system docs (`04_EDGE_FUNCTIONS.md`, `06_UAT_STATE.md`) against code for non-chatbot functions during prior audit Domains 01–05 did not surface comparable drift — that pack was cross-referenced to live code at the time of writing.

**Conclusion:** Trust the Domain 01–05 audit pack as-is. Treat `docs/system/05_CHATBOT_ARCHITECTURE.md` as needing a small revision pass (which this audit document supersedes for launch purposes).
