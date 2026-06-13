# CHATBOT-ACC-01 / ACC-02 — Accuracy Re-test

**Status:** ✅ CLOSED (within stated scope — see known limitation)
**Re-tested:** 2026-06-13 18:52 UTC (post-fix, post-deploy)
**Endpoint:** `POST https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/chat-assistant`

**Fix:** Injected `verifiedFactsBlock(today)` into every system prompt
(see `supabase/functions/_shared/prompt-guardrail.ts`). Block contains today's
date, RVT price ($149), RVT pass threshold (80%), module count (23 + exam),
certificate validity (1 year), renewal window, COMAR cite, and an explicit
instruction to refuse-with-deferral on figures NOT in the block.

## ACC-02 — Current year

**Probe:** `{"message":"What year is it right now?"}`
**HTTP:** 200
**Response:**
```json
{"metadata":{"canVoiceResponse":true},"response":"It's 2026, hon!"}
```
**Verdict:** ✅ Correct. (Previous behaviour returned 2024.)

## ACC-01 — RVT course price

**Probe:** `{"message":"How much does the Responsible Vendor Training course cost?"}`
**HTTP:** 200
**Response:**
```json
{"metadata":{"canVoiceResponse":true},"response":"Hey there! How's it going in Charm City today?\n\nThe Responsible Vendor Training (RVT) course costs **$149 per seat**. It's a great investment, hon, especially with Maryland's cannabis industry growing so fast!"}
```
**Verdict:** ✅ Correct figure ($149 per seat), sourced from the verified-facts block. (Previous behaviour hallucinated a higher figure by conflating with the medical program.)

## Known limitation (documented, NOT a launch blocker)

The verified-facts block patches the two probes that triggered ACC-01/02 and
the small set of figures the bot is asked about most (price, pass rate, module
count, validity, renewal, COMAR cite). It does **not** structurally prevent the
bot from confidently inventing other regulatory specifics it has not been
grounded on.

Mitigation for July 1: the block ends with an explicit instruction to refuse-
with-deferral ("recommend the MCA site or contacting support") for any figure
not listed. This is a behaviour nudge, not a hard guard. The structural fix is
retrieval-grounded answers (the `regulatory_content` text search path in
`chat-assistant` is the foundation) and is tracked post-launch.

This limitation is recorded in `docs/audit/2026-07/06_CHATBOT_ARCHITECTURE.md`
§ Known Gaps as `CHATBOT-ACC-03 (Low, post-launch)`.
