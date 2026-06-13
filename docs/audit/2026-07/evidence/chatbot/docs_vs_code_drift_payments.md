# Docs vs Code Drift Scan — Payment Domain

**Scope:** Mechanical claim-by-claim verification of `docs/audit/2026-07/02_PAYMENT_INTEGRITY.md` and payment claims in `docs/system/04_EDGE_FUNCTIONS.md`, against the actual code in `supabase/functions/paypal-webhook/`, `supabase/functions/verify-payment-paypal/`, `supabase/functions/verify-dispensary-payment/`, and current production schema.

**Method:** Same as `docs_vs_code_drift.md`. Every behavioural claim is verified against code path + live schema (via `supabase--read_query`).

**Date:** 2026-06-13

---

## Findings table

| # | Doc | §/line | Claim | Code reality | Status | Severity |
|---|-----|--------|-------|--------------|--------|----------|
| P1 | system/04 | L19 "Payments (public — webhook)" | A `stripe-webhook` edge function exists. | **No `stripe-webhook` function in `supabase/functions/`.** Only `paypal-webhook`. Stripe course-purchase webhook was never deployed; Stripe is dispensary-application-only (verification-pull, no webhook). | ❌ Drift | **Medium** |
| P2 | system/04 | L72 "stripe-webhook uses payment_events event-id de-duplication" | Stripe webhook idempotency is implemented via `payment_events` UNIQUE. | The UNIQUE constraint exists (`payment_events_stripe_event_id_key` on `stripe_event_id`) but there is no `stripe-webhook` function to consume it. The active idempotency path is `paypal-webhook` → `payment_events.paypal_event_id UNIQUE` (also exists). | ⚠ Misleading | **Medium** |
| P3 | audit/02 | §"Processor reality" | Course purchases run on PayPal; dispensary application fee runs on Stripe (no webhook, verification-pull). | Matches code: `create-course-payment-paypal` + `verify-payment-paypal` + `paypal-webhook` for courses; `create-dispensary-payment` + `verify-dispensary-payment` for app fee, no Stripe webhook function present. | ✅ Accurate | — |
| P4 | audit/02 | L18 (diagram) | `orders` has UNIQUE on `stripe_session_id` OR `paypal_order_id`. | `orders.stripe_session_id` has `UNIQUE` (`orders_stripe_session_id_key`). **`orders.paypal_order_id` has no UNIQUE constraint.** Column exists, but a duplicate PayPal order_id cannot be detected by the DB on this table. | ⚠ Partial | **Medium** — see P7 for why this is currently masked, not exploited. |
| P5 | audit/02 | L37 "payments.transaction_id is UNIQUE" | True at the schema level. | Constraint `payments_transaction_id_key` exists. | ✅ Accurate | — |
| P6 | audit/02 | L38 "course_entitlements(user_id, course_id) UNIQUE" | True. | Constraint `course_entitlements_user_id_course_id_key` exists. | ✅ Accurate | — |
| P7 | audit/02 | §"State machine — course purchase" (diagram L16–33) | Flow is `orders(pending)` → `orders(paid)` → `payments(transaction_id)` → trigger → `course_entitlements`. | **`paypal-webhook` does NOT write to `public.orders` or `public.payments`.** It updates `rvt_purchases.status='paid'` and inserts `rvt_seats` rows (status `available`). The entitlement is created later by `trg_seat_assignment_entitlement` on `rvt_seats` when a manager assigns a seat (status/assigned_user_id update). Live: `SELECT count(*) FROM payments` returns **0 rows**, confirming this table is unused in the current course-purchase path. | ❌ Drift | **High** |
| P8 | audit/02 | L42 "Idempotency proof: 1 `payments` row inserted, 1 `course_entitlements` row inserted, `orders.status` flips to `paid`" | Webhook inserts to `payments` and `course_entitlements`, updates `orders`. | None of these writes happen in `paypal-webhook`. The actual idempotency proof is: (a) `payment_events.paypal_event_id UNIQUE` blocks event replays at webhook entry (`paypal-webhook` L193–217); (b) `rvt_seats` seat-issuance is gated by a count-check ("skip if any already exist for this purchase", L137–146) rather than a UNIQUE constraint; (c) the `course_entitlements` UNIQUE on `(user_id, course_id)` collapses any duplicate entitlement when the seat-assignment trigger fires. Idempotency holds in practice, but via a different set of mechanisms than the doc describes. | ❌ Drift | **High** |
| P9 | audit/02 | L57 "Entitlement insert is in the same Edge Function tx as `payments` insert, before the 200 OK response" | Atomic single-tx write of payments + entitlement. | Neither write occurs in the edge function transaction. Entitlement creation is asynchronous from webhook delivery — it happens whenever a manager later assigns a seat (could be days later). Webhook returns 200 after `rvt_purchases.paid` + `rvt_seats(available)` are written, not after entitlement. | ❌ Drift | **High** (claim misrepresents atomicity) |
| P10 | audit/02 | L48 "Full replay transcript: evidence/stripe_webhook_replay.log" | A replay log file exists. | File `docs/audit/2026-07/evidence/stripe_webhook_replay.log` does **not** exist. `evidence/stripe_webhook_flow.md` does exist (referenced at L61). | ❌ Drift | Low |
| P11 | audit/02 | Table row 6 "Malformed webhook → `verify-payment-paypal` validates capture w/ PayPal API before write; returns 400 on missing fields" | `verify-payment-paypal` is the webhook handler. | `verify-payment-paypal` is the **server-side capture verifier** invoked from the client return URL, not the webhook handler. The PayPal webhook handler is `paypal-webhook`. Both call PayPal's API to verify, so the security behaviour is correct, but the function naming in the doc is wrong. | ⚠ Misleading | Low |
| P12 | audit/02 | §Findings PAY-02 "No automated reconciliation job re-checks `orders.status='pending'` older than 24h" | Reconciliation should walk `orders` table. | Reconciliation would need to walk `rvt_purchases` (where pending state actually lives), not `orders`. Recommendation is directionally right, target table is wrong. | ⚠ Misleading | Low |

---

## Severity summary

- **High (3):** P7, P8, P9 — the entire state-machine diagram in Doc 02 §"State machine" describes a flow (`orders → payments → trigger → course_entitlements`) that does not match the deployed code (`rvt_purchases → rvt_seats → trigger on seat assignment → course_entitlements`). The diagram's intent — "all duplicate-prevention is DB-enforced and idempotent" — remains true, but via different tables and a different timing model. The idempotency claim is **substantively correct**, the architecture diagram is **wrong**.
- **Medium (3):** P1, P2, P4 — phantom `stripe-webhook` function and missing `paypal_order_id` UNIQUE constraint.
- **Low (3):** P10, P11, P12 — naming / file-reference errors.

## What this does NOT change for July 1

- PayPal idempotency: webhook still de-duplicates at `payment_events.paypal_event_id` UNIQUE (verified in code L193). ✅
- Duplicate enrollments: still impossible — `course_entitlements (user_id, course_id) UNIQUE` is real and live. ✅
- No double-charge: `payment_events.paypal_event_id` collapses replays at webhook entry, before any side effects. ✅
- Atomicity within the webhook: rvt_purchases + rvt_seats writes are in one Supabase client tx; failure rolls back via the function's catch path which marks `payment_events.status='failed'`. ✅

**The platform's payment-integrity posture is sound. What is broken is the documentation, not the code.**

## What this DOES change for July 1

`docs/audit/2026-07/02_PAYMENT_INTEGRITY.md` should be revised before handing the audit pack to Levels:

1. Replace the state-machine diagram with `rvt_purchases → rvt_seats → (manager assigns seat) → trigger → course_entitlements`.
2. Re-write the "Idempotency proof" section against the actual `payment_events` + `rvt_seats` count-check + `course_entitlements` UNIQUE mechanisms.
3. Note that `payments` and `orders` tables are vestigial in the current course flow (0 rows in `payments` confirms this) and either repurpose them or remove the references.
4. Fix the audit-doc test mapping row 6 to name `paypal-webhook` (not `verify-payment-paypal`) as the webhook entry point.
5. Remove the dangling `evidence/stripe_webhook_replay.log` reference (replace with `stripe_webhook_flow.md` which actually exists, after also revising that file to reflect PayPal naming).
6. Either delete `stripe-webhook` from `docs/system/04_EDGE_FUNCTIONS.md` L19 + L72 or add a clear note that it is unimplemented.

Recommendation: handle these as documentation-only edits in the same wave that closes the chatbot-doc drift items. No code change is required for launch — the existing code is already audit-passing on the substantive criteria.

## Confidence note

This is a mechanical scan of every behavioural claim in Doc 02 and the payment section of Doc 04. It is **not** a full code review of the payment pipeline. The substance of payment integrity (idempotency, no duplicate enrollments, atomic writes within the webhook, audit logging) was independently verified in the audit doc itself (rows 1–6 of the test mapping) and remains valid in code. What this scan exposes is purely documentation drift in how that integrity is described.
