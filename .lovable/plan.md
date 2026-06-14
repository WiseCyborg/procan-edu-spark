# Pre-Call Closeout — Documentation Only

Scope: close the four remaining items before today's call without touching code, schema, edge functions, or RLS. Pure documentation + evidence updates so lovable walks in with a signed-off pack.

## 1. PAYMENT-DRIFT-01 — rewrite docs to match code

Rewrite the two drifted documents so they describe what the code actually does (`rvt_purchases` → `rvt_seats`, idempotency via `paypal_event_id`), instead of the non-existent `orders` → `payments` flow.

- `docs/audit/2026-07/02_PAYMENT_INTEGRITY.md` — replace the flow narrative, table references, and any claim that mentions `orders`/`payments` tables. Keep audit findings, severities, and evidence links intact; only the "how it works" sections change.
- `docs/system/04_EDGE_FUNCTIONS.md` — payment sections only. Update function names, request/response shapes, and the webhook idempotency description to match `unified-stripe-webhook` and the `stripe-*` functions as they exist today.
- Add a short "Doc rewrite — 2026-06-14" note at the top of each file pointing to the drift evidence file (`evidence/chatbot/docs_vs_code_drift_payments.md`) so reviewers can see the before/after rationale.
- Mark PAYMENT-DRIFT-01 as Closed in `docs/LAUNCH_READINESS_AUDIT_2026-07.md` with a one-line evidence pointer.

No code changes. The code is already correct; only the documentation moves.

## 2. CHATBOT-SEC-02 — record deferral

Currently filed as Low. Document the deferral explicitly so it's not ambiguous on the call:

- In `docs/audit/2026-07/06_CHATBOT_ARCHITECTURE.md`, under SEC-02: add "Deferred to post-launch — accepted 2026-06-14" with the rationale already captured in `sec01_metadata_contents.md` (cert numbers / org names are user-identifying but not credentials; guardrail blocks disclosure; cost/benefit favors post-launch removal).
- Mirror the deferral line in the launch-readiness index so the status column reads "Accepted — post-launch" instead of "Open".

## 3. G3 (chat_intent_log empty) — record deferral

Same pattern:

- In `06_CHATBOT_ARCHITECTURE.md` §Known Gaps, mark G3 "Accepted — post-launch" with the existing rationale (bounded; console.log present; no runtime hole).
- Mirror in the launch-readiness index.

## 4. Pre-call summary doc

Single one-page sign-off sheet Levels can read before the call:

- New file: `docs/audit/2026-07/PRE_CALL_SIGNOFF_2026-06-14.md`
- Sections: Cleared (SEC-01, ACC-01, ACC-02, AiLean gate, PAYMENT-DRIFT-01), Accepted deferrals (SEC-02, G3), Not started (video migration), Evidence index (links to every file under `evidence/chatbot/`).

## Out of scope

- Any code, edge function, schema, RLS, or migration change.
- Video migration plan — separate track, starts after the call.
- Re-running live probes — already captured in evidence files.

## Deliverables

- Rewritten `docs/audit/2026-07/02_PAYMENT_INTEGRITY.md`
- Rewritten payment sections of `docs/system/04_EDGE_FUNCTIONS.md`
- Updated `docs/audit/2026-07/06_CHATBOT_ARCHITECTURE.md` (SEC-02 + G3 deferral lines)
- Updated `docs/LAUNCH_READINESS_AUDIT_2026-07.md` (status flips for PAYMENT-DRIFT-01, SEC-02, G3)
- New `docs/audit/2026-07/PRE_CALL_SIGNOFF_2026-06-14.md`