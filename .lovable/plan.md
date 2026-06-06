# Issue 1001 — PayPal Payment Flow Rebuild

## Decisions locked in
1. **Processor:** PayPal (fix contract, keep existing webhook scaffold)
2. **Permissions:** Grant `dispensary_manager` role + org membership at admin approval time (existing `has_any_role` check stays)
3. **Provisioning:** Webhook is the source of truth — auth user + seats + entitlements + welcome email all created after PayPal capture

## Architecture

```text
DispensaryApplication ──► admin approves ──► trigger:
                                             • create organization (if not exists)
                                             • create profiles row (pending, no auth user yet)
                                             • grant dispensary_manager role
                                             • create org_membership
                                             • send approval email w/ /payment/:applicationId link
                                                            │
                                                            ▼
                                       Payment.tsx auto-invokes create-dispensary-payment-paypal
                                                            │
                                                            ▼
                                                  PayPal Checkout
                                                            │
                                          ┌─────────────────┴─────────────────┐
                                          ▼                                   ▼
                                    return_url                          cancel_url
                                 /payment-success                      /payment-cancel
                                          │                                   │
                                          │   (parallel)                      └─► retry CTA
                                          ▼
                                  paypal-webhook (idempotent)
                                  • mark application paid
                                  • create auth user (admin API)
                                  • issue rvt_seats (qty)
                                  • trigger auto-creates course_entitlements (org_seat)
                                  • send ManagerRegistration token email
                                  • write payment_events row
```

## Build steps

### 1. Migration — `payment_events` audit table + approval trigger
- Create `public.payment_events` (`id`, `application_id`, `paypal_event_id UNIQUE`, `event_type`, `amount`, `status`, `error_message`, `payload jsonb`, `created_at`); GRANT to `service_role` + admin SELECT policy.
- Add columns to `dispensary_applications` if missing: `payment_completed_at timestamptz`, `coordinator_user_id uuid`.
- Trigger `on_application_approved` (AFTER UPDATE when `application_status` flips to `approved`):
  - Insert `organizations` row (idempotent on license_number)
  - Insert `user_roles (user_id=NULL placeholder via deferred)` — actually defer role grant until webhook (user doesn't exist yet)
  - **Correction:** role + org_membership creation moves to webhook step (Decision 3 means no auth user at approval). Approval trigger only creates `organizations` row + sends approval email via `pg_net` → `send-approval-email`.

### 2. Edge function rebuild — `create-dispensary-payment-paypal`
- Switch to **public** function (`verify_jwt = false`) — applicant has no auth yet.
- Input: `{ application_id }` only.
- Server-side: load `dispensary_applications` by id, verify `application_status='approved'` AND `payment_status` not in (`paid`,`completed`).
- Derive `quantity = estimated_employees || requested_credits || 10`, `amount = quantity * 49`.
- Derive org via `license_number` lookup → `organizations` row (created by approval trigger).
- Use `getPayPalEnvForOrg` for sandbox vs live.
- Create `rvt_purchases` row (org_id, qty, status=pending, idempotency_key=application_id).
- Return `{ url, orderId, purchaseId }`. PayPal `return_url = ${DOMAINS.PRODUCTION}/payment-success?application_id=${id}&purchase_id=${purchaseId}`, `cancel_url = ${DOMAINS.PRODUCTION}/payment-cancel?application_id=${id}`.
- Rate limit by `application_id` (5/hour).

### 3. `Payment.tsx` — auto-redirect
- Accept both `/payment/:applicationId` and `?application_id=` (back-compat scenario 6).
- On mount: fetch application via `invokePublicFunction('get-application-payment-status', { application_id })` (new tiny public function — no auth needed, returns only safe fields + payment_status).
- States:
  - `approved + unpaid` → immediately call `create-dispensary-payment-paypal`, `window.location.href = url`. Show spinner only.
  - `paid|completed` → confirmation card + auto-redirect to `/auth?role=dispensary_manager&tab=accesskey` after 3s.
  - `not_approved` / `not_found` → branded error.
- Manual "Retry payment" button only surfaces if auto-redirect fails (network error).

### 4. `paypal-webhook` — provisioning
Add `CHECKOUT.ORDER.APPROVED` / `PAYMENT.CAPTURE.COMPLETED` branch for dispensary application orders (detect via `purchase_units[0].reference_id` = purchase_id; join `rvt_purchases.metadata` → `application_id`):
1. **Idempotency:** insert into `payment_events` with `paypal_event_id` UNIQUE — if conflict, return 200 (no-op).
2. Mark `dispensary_applications`: `payment_status='paid'`, `payment_completed_at=now()`.
3. Mark `rvt_purchases.status='completed'`, `payment_completed_at=now()`.
4. **Create auth user** via `supabase.auth.admin.createUser({ email: contact_email, email_confirm: false })`; store `coordinator_user_id` on application + `profiles.user_id` + `profiles.organization_id`.
5. Insert `user_roles (user_id, role='dispensary_manager')`.
6. Insert `organization_members (org_id, user_id, role='manager')`.
7. Insert `rvt_seats` × quantity with `source='org_seat'` (trigger auto-creates `course_entitlements`).
8. Enqueue `send-manager-registration-token` email (existing function) with magic-link to `/register/manager?token=...`.
9. On any failure: update `payment_events.status='failed'`, `error_message`; enqueue admin alert job. Do not throw 500 (return 200 so PayPal doesn't retry-storm) — PayPal will retry only on 5xx.
10. Validate PayPal webhook signature (existing helper).

### 5. Routes + pages — `App.tsx`
- Confirm `/payment/:applicationId` mounted (it is).
- Add `/payment-success` → new `PaymentSuccess.tsx`: polls `get-application-payment-status` until `payment_status='paid'` (max 30s), then redirects to `/auth?role=dispensary_manager&tab=accesskey`. Branded loader + receipt summary.
- Add `/payment-cancel` → new `PaymentCancel.tsx`: explains cancellation, "Retry payment" button back to `/payment/:applicationId`, "Contact support" link.

### 6. Shared constants
- Create `supabase/functions/_shared/config.ts` exporting `PRICE_PER_SEAT = 49` and `DEFAULT_QUANTITY = 10`. Import in `Payment.tsx` (via a parallel `src/config/payment.ts` mirror) and the edge function.

### 7. `supabase/config.toml`
- `[functions.create-dispensary-payment-paypal] verify_jwt = false`
- `[functions.get-application-payment-status] verify_jwt = false`
- Keep `paypal-webhook` as-is (PayPal calls it unauthenticated).

## Verification matrix (must pass before READY)

| # | Scenario | Pass criteria |
|---|---|---|
| 1 | Approved applicant clicks email link | Auto-redirect to PayPal, no button click; webhook fires; `payment_status='paid'`; manager email arrives |
| 2 | Already-paid revisits `/payment/:id` | Confirmation + redirect to /auth; zero new PayPal order; no duplicate `rvt_purchases` |
| 3 | Unauthenticated visit | Public route loads; payment proceeds via application_id |
| 4 | Wrong logged-in user opens someone else's link | Public flow ignores auth user; pay still scoped to application_id; no cross-account leak (no PII beyond org_name shown) |
| 5 | Invalid application_id | Branded 404 page, no stack trace |
| 6 | Legacy `?application_id=` query | Same flow as path param |
| 7 | Webhook capture success | `payment_events` row, `dispensary_applications.payment_status='paid'`, auth user + role + seats + entitlements created, welcome email sent |
| 8 | Webhook fires twice (same event_id) | UNIQUE constraint blocks; one provisioning; one email |
| 9 | Provisioning step fails mid-webhook | `payment_events.status='failed'`, admin alert job enqueued, idempotent retry possible |
| 10 | User cancels on PayPal | Lands `/payment-cancel`, retry button works, no account created |

## Out of scope
Refunds UI, automated retry/backoff inside edge function, `/checkout` route refactor, COMAR scraper (separate ticket), `DispensaryApplication.tsx` / `ManagerRegistration.tsx` UI changes.

## Final deliverable format
After build I will return one READY / NOT READY verdict per fix (1–6) plus per-scenario pass/fail with edge-function-log excerpts.
