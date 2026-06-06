# 05 — Chatbot & Voice Architecture

The platform ships **three interleaved conversational surfaces**:

| Surface | Component | Edge function | Modality |
|---------|-----------|---------------|----------|
| Internal text assistant | `InternalChatbot` / `chat-assistant` | `chat-assistant-enhanced` (public) | Text |
| Draggable voice assistant | `DraggableVoiceAssistant` | `voice-to-text`, `text-to-voice`, `chat-assistant-enhanced` | Voice + text |
| Avatar coach (AiLean) | `ailean-coach` | `openai-avatar-voice`, `avatar-agent` | Voice + animated avatar |

All three share the same **LLM gateway** and the same **conversation persistence model** (`chat_intent_log`, `agent_events`).

## LLM provider

Calls flow through the **Lovable AI Gateway** (`AI_GATEWAY_API_KEY`). The gateway abstracts model selection — current default is GPT-4o-class for text, with `openai-avatar-voice` and Vonage voice for media. No direct OpenAI/Anthropic keys live in the frontend.

## Prompt assembly (text assistant)

1. **System prompt** — base persona + COMAR/MD compliance disclaimers.
2. **Role context** — injected from `get_access_snapshot`: `is_admin`, `is_manager`, `active_org_id`, `member_type`. Determines what the bot is allowed to reveal.
3. **Page context** — current pathname, active course/module id (from `JourneyStateProvider`).
4. **History window** — last N user/assistant turns from local state. **Not persisted across reloads** today.
5. **User turn** — raw message + any uploaded image refs.

Logged to `chat_intent_log` (1 row per turn) for analytics — not for memory recall.

## Escalation path

`RequestSupportButton` → `request-procann-support` (JWT-guarded) → writes to `support_requests` + `support_queue`. A coordinator/admin picks it up via `CommunicationHubPage`.

Agent-side escalations (autonomous agents giving up) go to `agent_escalations` with severity + suggested action.

## Voice pipeline

```text
mic ──▶ voice-to-text (Whisper) ──▶ chat-assistant-enhanced ──▶ text-to-voice (OpenAI TTS) ──▶ speaker
                                                  │
                                                  └─▶ avatar-agent (lip-sync frames) for AiLean surface
```

Vonage Verify is *not* part of the chatbot path — it's MFA only (`vonage-verify-start`, `vonage-verify-check`).

## Persistence

| Source | Stored | Where |
|--------|--------|-------|
| Each chat turn | intent classification + tokens | `chat_intent_log` |
| Agent runs (cron AI agents) | inputs, outputs, run status | `ai_agent_runs` |
| Agent decisions worth surfacing | event + payload | `agent_events`, `agent_escalations` |
| Insights produced | summary, severity, link | `ai_insights` |
| Per-user activation tokens | hashed token + org | `ailean_activation_tokens` |
| Voice session metadata | duration, transcript ref | `ailean_sessions` |

## Known gaps

1. **No long-term per-user memory.** The bot does not remember prior sessions; history resets on reload. Roadmap item: bind a memory table keyed by `(user_id, scope)` and inject in step 4 above.
2. **No tool-calling / function-calling enabled.** The bot can answer but cannot, e.g., "show me my outstanding modules" via a Supabase RPC. It just describes how to find them.
3. **Page-context coverage is partial.** Some routes (`/admin/*` deep pages) don't push their context into the assistant, so suggestions are generic.
4. **Voice + text histories are siloed.** A voice conversation and a follow-up text conversation start from scratch.
5. **No safety eval on outputs** beyond the system prompt's compliance disclaimers.
