# Payment Webhook Flow (PayPal — production)

> Filename keeps `stripe_` prefix for continuity with the audit handover doc. Production processor for course payments is **PayPal**. Stripe is only used for dispensary application fees.

## Sequence

1. Client invokes `create-course-payment-paypal` with `{ courseId }`.
2. Function inserts `orders` row (`status='pending'`, `paypal_order_id`).
3. PayPal redirect → user approves → returns to app with `token`.
4. Client invokes `verify-payment-paypal` with `{ token }`.
5. Function calls PayPal `orders/{id}/capture`. On success:
   - `INSERT INTO payments (transaction_id=capture_id, …)` — fails on unique conflict → idempotent.
   - `UPDATE orders SET status='paid', paypal_payment_id=…`.
   - `INSERT INTO course_entitlements (user_id, course_id, source='stripe', status='active')` — fails on `(user_id, course_id)` unique conflict → idempotent.
   - `INSERT INTO payment_audit_log` (always).
6. `paypal-webhook` independently receives `PAYMENT.CAPTURE.COMPLETED` and runs the same idempotent insert path. Re-deliveries are absorbed by the same unique constraints.

## Atomicity

All inserts in step 5 happen in a single Edge Function invocation. If any insert raises (other than unique-conflict), the function returns non-200 and PayPal will redeliver. Because every insert is idempotent at the constraint level, redelivery converges to the correct end state.

## Failure modes & mitigations

| Failure | Mitigation |
|---|---|
| Network drop after `payments` insert, before `course_entitlements` insert | PayPal redelivery; entitlement insert succeeds on retry; `payments` insert is no-op |
| Duplicate webhook delivery | `payments.transaction_id UNIQUE` + `course_entitlements (user_id, course_id) UNIQUE` |
| Malformed payload | Function validates required fields (`token`, capture ID); returns 400; logs in `payment_events` |
| User retries checkout for same course already entitled | UI gate (`CoursePaymentGate.tsx`) blocks; DB unique would also block |
