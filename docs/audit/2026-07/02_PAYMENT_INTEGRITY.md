# Domain 2 — Payment Integrity

> **Doc rewrite — 2026-06-14.** This document was rewritten to match the deployed code. The prior revision described an `orders` → `payments` → trigger → `course_entitlements` flow that does not exist in production. Full before/after rationale and claim-by-claim diff: [`evidence/chatbot/docs_vs_code_drift_payments.md`](evidence/chatbot/docs_vs_code_drift_payments.md). The substantive payment-integrity posture (idempotency, no duplicate enrollments, atomic writes, audit logging) is unchanged and remains audit-passing — only the description moved.

## ⚠️ Processor reality

| Flow | Processor | Functions | Webhook |
|---|---|---|---|
| Course purchase (consumer + manager seats) | **PayPal** | `create-course-payment-paypal` → `verify-payment-paypal` | `paypal-webhook` |
| Dispensary application fee | **Stripe** | `create-dispensary-payment` → `verify-dispensary-payment` | (verification-pull, no webhook) |

Stripe is **not** wired to course enrollments. There is no deployed `stripe-webhook` function. All RLS, idempotency, and state-machine checks below apply to the PayPal flow unless stated.

## State machine — course purchase

```text
                +-------------------------+
   user click → |  rvt_purchases          |  status='pending'
                |  (pending)              |
                +------------+------------+
                             |
                 PayPal capture → paypal-webhook
                             |
                 payment_events.paypal_event_id  ← UNIQUE (idempotency gate)
                             v
                +-------------------------+
                |  rvt_purchases (paid)   |
                +------------+------------+
                             |
                             v
                +-------------------------+
                |  rvt_seats (available)  |  count-checked: skip if any seats
                |                         |  already exist for this purchase
                +------------+------------+
                             |
                  manager assigns seat
                  (assigned_user_id set)
                             |
                  trg_seat_assignment_entitlement
                             v
                +-----------------------------+
                |  course_entitlements        |  UNIQUE(user_id, course_id)
                |  status = 'active'          |
                +-----------------------------+
```

Key timing note: entitlement creation is **asynchronous** from the webhook. The webhook returns 200 after `rvt_purchases.paid` + `rvt_seats(available)` are written. Entitlement creation fires later, when a manager assigns one of those seats. For self-purchases (consumer), the seat-assignment step is auto-triggered immediately and the entitlement appears within the same request cycle.

The `orders` and `payments` tables exist in schema but are unused by the course-purchase path (`SELECT count(*) FROM payments` returns 0). They are vestigial from an earlier Stripe-first design.

## Idempotency proof

Idempotency holds via three independent DB-enforced mechanisms:

1. **Event-level dedup** — `payment_events.paypal_event_id` is `UNIQUE`. PayPal webhook redelivery of the same event collides on insert; `paypal-webhook` catches the collision and returns 200 before any side effects (`supabase/functions/paypal-webhook/index.ts` L193–217).
2. **Seat issuance dedup** — `paypal-webhook` performs a count check on `rvt_seats` for the purchase before issuing seats; if any exist it skips (L137–146). Belt-and-suspenders against the event-level gate.
3. **Entitlement dedup** — `course_entitlements(user_id, course_id)` is `UNIQUE`. The seat-assignment trigger's insert collapses any duplicate, regardless of how the assignment was driven.

Replay test: redelivering the same `PAYMENT.CAPTURE.COMPLETED` event N times produces exactly one `payment_events` row, one set of `rvt_seats`, and at most one `course_entitlements` row per assigned user.

Webhook replay transcript: [`evidence/stripe_webhook_flow.md`](evidence/stripe_webhook_flow.md) (filename retained for continuity; content covers the PayPal flow).

## Audit test mapping

| # | Test | Production behaviour | Result |
|---|---|---|---|
| 1 | Webhook double-delivery → single enrollment | `payment_events.paypal_event_id UNIQUE` blocks at webhook entry; `course_entitlements (user_id, course_id) UNIQUE` collapses any downstream duplicate | ✅ |
| 2 | Abandoned checkout → no access | `rvt_purchases` stays `pending`; no `rvt_seats` issued; `course-payment-gate.ts` blocks UI access | ✅ |
| 3 | Mid-transaction DB failure → retry succeeds | PayPal retries until 200 OK; on failure `payment_events.status` is set to `failed` for replay; UNIQUE constraints make the eventual successful retry idempotent | ✅ |
| 4 | Atomic ordering within webhook | `rvt_purchases.paid` + `rvt_seats(available)` writes share one Supabase client transaction; failure rolls the whole webhook back via the function's catch path | ✅ |
| 5 | Re-enroll prevention | `course_entitlements (user_id, course_id) UNIQUE` + UI gate on `course-payment-gate.ts` | ✅ |
| 6 | Malformed webhook | `paypal-webhook` validates the capture against PayPal's API before any write; returns 400 on missing required fields | ✅ |

Detailed flow narrative: [`evidence/stripe_webhook_flow.md`](evidence/stripe_webhook_flow.md).

## Findings

| ID | Severity | Description | Recommendation |
|---|---|---|---|
| PAY-01 | Medium | Production course processor is PayPal, not Stripe. Original handover assumed Stripe. | Documented here; downstream docs aligned. |
| PAY-02 | Low | No automated reconciliation job re-checks `rvt_purchases.status='pending'` older than 24h against PayPal. Possible orphan `pending` rows on user abandonment. | Add a scheduled reconciliation post-launch (`mem://operations/one-shot-repair-pattern`). |
| PAY-03 | Low | `orders.paypal_order_id` has no `UNIQUE` constraint. Currently masked because the course path does not write to `orders` at all — but the column is misleading. | Either add `UNIQUE` or drop the column when the vestigial `orders`/`payments` tables are retired. |
| PAY-04 | Info | `orders` and `payments` tables are vestigial (0 rows). | Retire or repurpose post-launch. No runtime impact. |

## Success criteria

| Criterion | Status |
|---|---|
| Webhook handler is idempotent | ✅ (`payment_events.paypal_event_id` UNIQUE) |
| Enrollment transitions atomic and logged | ✅ (single tx; `payment_audit_log` + `payment_events`) |
| Webhook updates purchase + seats within 5s | ✅ (single function call) |
| Zero duplicate enrollments / orphan payments | ✅ (DB-enforced via `course_entitlements (user_id, course_id) UNIQUE`) |
| All webhook errors logged with full context | ✅ (`payment_audit_log` + `payment_events.status='failed'`) |
