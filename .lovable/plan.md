# Issue 1001 — Stripe/PayPal Payment Redirect Fix

## Problem
Dispensary owner (Danielle) completed registration and landed in the authenticated dashboard **without ever being redirected to checkout**. Payment status is ambiguous; she is inside the platform but has not paid. This blocks conversion and creates a billing/audit gap.

## Required End-to-End Flow
```text
Registration form submitted
  → AUTO redirect to PayPal/Stripe Checkout (no manual "Go to Payment" button)
  → Customer pays
  → Webhook marks dispensary_applications.payment_status = 'paid' + creates order row
  → AUTO redirect to success page → dashboard
  → Coordinator account active, seats provisioned
```

## Root Causes to Investigate & Fix
1. **Registration submit handler does not invoke checkout.** Today the flow drops the user on the dashboard or on `/payment/:applicationId` with a manual button (`src/pages/Payment.tsx`). The submit path must call `create-dispensary-payment-paypal` and `window.location.href = approvalUrl` immediately on success.
2. **Contract mismatch with `create-dispensary-payment-paypal`.** Payment.tsx sends `{ application_id, credits, amount, organization_name, contact_email }`; the function must accept exactly that shape and return `{ approvalUrl }`. Audit and align.
3. **Permissions gate.** Function currently requires `dispensary_manager` role, which an applicant does not yet have. Decision needed: (a) make this endpoint accept an approved-application token instead of a role, or (b) reorder flow so manager role is granted at approval time (pre-payment) — recommend (a) to avoid privilege escalation.
4. **Webhook → DB write.** Confirm PayPal capture webhook updates `dispensary_applications.payment_status='paid'` and inserts `orders` row idempotently. Without this, success redirect lands on an unpaid record.
5. **Success/cancel URLs.** Must be absolute (`https://www.procannedu.com/...`), not `req.headers.origin`, so they survive PayPal's redirect chain.

## Deliverables

### 1. Registration auto-redirect
- Wire the registration form submit handler: on successful application create → immediately invoke `create-dispensary-payment-paypal` → redirect to `approvalUrl`.
- Remove the intermediate "click to pay" screen from the happy path. Keep `/payment/:applicationId` only as a recovery route for users who bounce back from email links.

### 2. Edge function audit (`create-dispensary-payment-paypal`)
- Accept `{ application_id }` as the sole required input; derive `credits`, `amount`, org info server-side from `dispensary_applications` (don't trust client).
- Drop `dispensary_manager` role check; instead verify the caller's auth user matches `dispensary_applications.contact_email` OR the application is in `approved` status and an unused checkout.
- Return `{ approvalUrl, orderId }`.
- Use absolute production URLs for `return_url`/`cancel_url`.

### 3. Webhook hardening
- Confirm `paypal-webhook` edge function: validates signature, idempotent on `event.id`, writes `orders` row, updates `dispensary_applications.payment_status`, fires confirmation email.
- Add structured log to `cron_job_executions` or a dedicated `payment_events` row on every webhook receipt (success + failure).

### 4. Six-scenario verification matrix
| # | Scenario | Expected |
|---|---|---|
| 1 | New approved applicant submits registration | Auto-redirect to PayPal, returns paid, lands on dashboard |
| 2 | Already-paid application revisits `/payment/:id` | Friendly "payment complete" + redirect to auth |
| 3 | Unauthenticated visitor hits `/payment/:id` | Loads (public route), can pay via approval token |
| 4 | Different user hits someone else's `/payment/:id` | 403 / branded error |
| 5 | Invalid application id | Branded not-found |
| 6 | Legacy `/payment?application_id=...` query string | Still works |

### 5. Deploy-readiness verdict
Single explicit **READY** or **NOT READY** statement with blockers enumerated. No "mostly done."

## Out of Scope (this ticket)
- Migrating from PayPal to Stripe Checkout.
- Refactor to dedicated `/checkout` route.
- Retry/backoff inside the payment function.
- Refunds UI.

## Technical Notes
- Files: `src/pages/Payment.tsx`, registration form component (TBD — locate dispensary registration submit handler), `supabase/functions/create-dispensary-payment-paypal/index.ts`, `supabase/functions/paypal-webhook/index.ts`, `src/App.tsx` routes.
- Pricing constant: `PRICE_PER_SEAT = 49` lives in `Payment.tsx`; move to shared config so function + UI agree.
- Use `DOMAINS.PRODUCTION` from `supabase/functions/_shared/domains.ts` for return URLs.

## Confirmation Needed Before Build
1. Keep **PayPal** as the processor, or migrate to Stripe Checkout (Lovable's built-in Stripe is available)?
2. Confirm flow choice for permissions: **(a)** application-token-based checkout (recommended), or **(b)** grant `dispensary_manager` role at approval time so existing role check passes?
3. Confirm `paypal-webhook` edge function exists and is the source of truth for marking `payment_status='paid'`.
