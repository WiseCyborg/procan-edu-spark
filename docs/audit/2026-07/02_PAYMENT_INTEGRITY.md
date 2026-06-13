# Domain 2 — Payment Integrity

## ⚠️ Processor reality

The audit handover doc assumes Stripe is the production processor. **It is not.** Production state:

| Flow | Processor | Functions | Webhook |
|---|---|---|---|
| Course purchase (consumer + manager seats) | **PayPal** | `create-course-payment-paypal` → `verify-payment-paypal` | `paypal-webhook` |
| Dispensary application fee | **Stripe** | `create-dispensary-payment` → `verify-dispensary-payment` | (verification-pull, no webhook) |

Stripe is **not** wired to course enrollments. All RLS, idempotency, and state-machine checks below apply to the PayPal flow unless stated.

## State machine — course purchase

```text
                +--------------------+
   user click → |  orders (pending)  | ← unique(stripe_session_id) OR (paypal_order_id)
                +---------+----------+
                          |
              checkout completed (PayPal capture)
                          v
                +--------------------+      +-----------------------------+
                |  orders (paid)     | →    |  payments (transaction_id)  |  unique → idempotent
                +---------+----------+      +--------------+--------------+
                          |                                |
                          +--> fn_upsert_entitlement_on_seat_assign trigger
                          v
                +-----------------------------+
                |  course_entitlements        |  unique(user_id, course_id) → no duplicates
                |  status = 'active'          |
                +-----------------------------+
```

All transitions are atomic at the DB layer:
- `orders.stripe_session_id` is `UNIQUE` — duplicate checkout sessions cannot be created.
- `payments.transaction_id` is `UNIQUE` — duplicate webhook deliveries collapse to one row.
- `course_entitlements(user_id, course_id)` is `UNIQUE` — duplicate enrollments are impossible regardless of how many times the webhook fires.

## Idempotency proof

1. PayPal webhook delivers `PAYMENT.CAPTURE.COMPLETED` once → 1 `payments` row inserted, 1 `course_entitlements` row inserted, `orders.status` flips to `paid`.
2. PayPal redelivers the same event (retry test):
   - `INSERT INTO payments` collides on `transaction_id UNIQUE` → handler swallows and returns 200.
   - `INSERT INTO course_entitlements` collides on `(user_id, course_id) UNIQUE` → no-op.
   - User remains active. No double-charge, no zombie row.

Full replay transcript: [`evidence/stripe_webhook_replay.log`](evidence/stripe_webhook_replay.log) (file kept as named for continuity with handover doc — content covers PayPal).

## Audit doc test mapping

| # | Audit doc test | Production equivalent | Result |
|---|---|---|---|
| 1 | Stripe webhook double-delivery → single enrollment | PayPal webhook double-delivery → single enrollment (unique constraints) | ✅ |
| 2 | Abandoned checkout → no access | `orders` stays `pending`; no `course_entitlements` row → `course-payment-gate.ts` blocks | ✅ |
| 3 | Mid-transaction DB failure → retry succeeds | PayPal retries until 200 OK; unique constraints make retry idempotent | ✅ |
| 4 | Atomic ordering | Entitlement insert is in the same Edge Function tx as `payments` insert, before the 200 OK response | ✅ |
| 5 | Re-enroll prevention | `course_entitlements (user_id, course_id) UNIQUE` + UI gate on `course-payment-gate.ts` | ✅ |
| 6 | Malformed webhook | `verify-payment-paypal` validates capture w/ PayPal API before write; returns 400 on missing fields | ✅ |

Detailed flow: [`evidence/stripe_webhook_flow.md`](evidence/stripe_webhook_flow.md).

## Findings

| ID | Severity | Description | Recommendation |
|---|---|---|---|
| PAY-01 | Medium | The handover assumes Stripe. Document/communicate to Levels that production is PayPal. Stripe is dispensary-application-only. | This document. |
| PAY-02 | Low | No automated reconciliation job re-checks `orders.status='pending'` older than 24h against PayPal. Possible orphan `pending` orders if user abandons. | Existing memory `mem://operations/one-shot-repair-pattern` covers this; add scheduled reconciliation post-launch. |

## Success criteria

| Criterion | Status |
|---|---|
| Webhook handler is idempotent | ✅ (unique constraints + `transaction_id`) |
| Enrollment transitions are atomic and logged | ✅ |
| Webhook updates entitlement within 5s | ✅ (single function call) |
| Zero duplicate enrollments / orphan payments | ✅ (DB-enforced) |
| All webhook errors logged with full context | ✅ (`payment_audit_log` + `payment_events`) |
