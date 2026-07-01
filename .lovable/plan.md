
# Manager Registration Token — Post-Payment Flow (read-only findings)

## 1. What fires after PayPal payment

`supabase/functions/paypal-webhook/index.ts` (lines 100–177) is the single writer for post-payment state. On `PAYMENT.CAPTURE.COMPLETED` it:

1. Marks `rvt_purchases.status = 'paid'`.
2. Updates `dispensary_applications` with `payment_status`, `payment_provider`, `payment_transaction_id`, `payment_amount`, `payment_date` — **does NOT write `registration_token` or `registration_token_expires_at`**.
3. Issues `rvt_seats`.
4. Invokes `send-manager-registration-token` (line 169) with `application_id`.

`supabase/functions/verify-dispensary-payment-paypal/index.ts` is now read-only (per the P4 2026-06-16 note in its header); it only captures the PayPal order and polls DB state. It never touches `registration_token`.

`supabase/functions/send-manager-registration-token/index.ts` (line 39) **reads** `application.registration_token` to build the URL. It does not generate one.

## 2. Where the token IS generated

Two SQL RPCs generate the token:

- `supabase/migrations/20251104141352_2436af68-2f8b-4b63-90c0-0c1552e554ef.sql` — `approve_dispensary_application()` sets `registration_token = encode(gen_random_bytes(32),'hex')` and `registration_token_expires_at = NOW() + 7 days` (lines 111, 122–123).
- `supabase/migrations/20251104170525_3ce406c1-673a-45a2-a2bb-de6090b93d28.sql` — a sibling approval RPC doing the same (lines 99–100).

Both are called from the **admin approval** path (`supabase/functions/approve-application/`, `supabase/functions/approve-with-roles/`, and the admin UI in `src/components/admin/DispensaryApplicationManager.tsx`) — **not from the payment path**.

After generation, `supabase/migrations/20260630125328_7a814a8e-a904-4900-8192-8b0a881d5c32.sql` installs trigger `trg_hash_dispensary_registration_token` (BEFORE INSERT/UPDATE OF `registration_token`) which SHA-256 hashes the value into `registration_token_hash` and **nulls the plaintext `registration_token` column** (lines 13–24). Existing rows were back-filled and their plaintext nulled (lines 28–33).

## 3. The race / missing step

There are two independent defects that compound:

**Defect A — payment path never generates the token.**
`paypal-webhook` (line 167–175) fires `send-manager-registration-token` immediately after marking the application paid, but nothing in that path calls `approve_dispensary_application()` or otherwise writes `registration_token`. If the admin approval RPC has not already run for that application, the row's `registration_token` is NULL and `registration_token_expires_at` is NULL, so the email either sends a broken URL (`.../register/manager?token=`) or crashes in `send-manager-registration-token/index.ts:33` when it does `new Date(application.registration_token_expires_at)`.

**Defect B — even when admin approval ran, the plaintext is gone.**
The hashing trigger from `20260630125328` nulls `registration_token` on every INSERT/UPDATE that sets it. So `send-manager-registration-token/index.ts:39` reads `application.registration_token` and gets `NULL` — the emailed URL is always tokenless. The only working generator is `batch-regenerate-tokens` (or the resend path) if it returns the plaintext to the caller before persisting; the post-payment webhook path never does this.

**Net effect:** post-payment token emails are unreliable by construction — the webhook depends on a value it never writes, and even when written the hashing trigger destroys it before the email sender reads it. Order of operations between webhook and admin approval RPC is also racy: whichever runs last determines what (if anything) the email contains.

## Exact file paths referenced

- `supabase/functions/paypal-webhook/index.ts` — post-payment orchestrator (lines 100–177)
- `supabase/functions/verify-dispensary-payment-paypal/index.ts` — read-only status probe
- `supabase/functions/send-manager-registration-token/index.ts` — email sender, reads `registration_token`
- `supabase/functions/approve-application/index.ts` — admin approval entry
- `supabase/functions/approve-with-roles/index.ts` — admin approval entry
- `supabase/functions/resend-manager-registration/index.ts` — manual resend
- `supabase/functions/batch-regenerate-tokens/index.ts` — bulk regen
- `supabase/functions/send-application-approved/index.ts` — approval email, also reads `registration_token`
- `supabase/migrations/20251104141352_2436af68-2f8b-4b63-90c0-0c1552e554ef.sql` — `approve_dispensary_application()` RPC (generator #1)
- `supabase/migrations/20251104170525_3ce406c1-673a-45a2-a2bb-de6090b93d28.sql` — sibling approval RPC (generator #2)
- `supabase/migrations/20260630125328_7a814a8e-a904-4900-8192-8b0a881d5c32.sql` — hashing trigger that nulls plaintext
- `src/pages/ManagerRegistration.tsx` — consumer of the emailed token
- `supabase/functions/validate-manager-registration/index.ts` — token validation on registration submit

## Recommended fix (not implemented — plan only)

Pick one of:

**Option 1 — Generate at webhook time, return plaintext once.**
In `paypal-webhook/index.ts` between steps 2 and 4:
- Generate `plainToken = crypto.randomUUID()` (or 32-byte hex) in the edge function.
- UPDATE `dispensary_applications` SET `registration_token = plainToken, registration_token_expires_at = now() + interval '7 days'` — the trigger will hash it and null the column, which is fine.
- Pass `plainToken` (not the column) directly to `send-manager-registration-token` via the invoke body; refactor `send-manager-registration-token` to accept `token` in the payload instead of re-reading the column.

**Option 2 — Have admin approval be a prerequisite of payment.**
Enforce that `paypal-webhook` refuses to send the token email unless `application.registration_token_hash IS NOT NULL`, and route pre-approval token generation into a single RPC that returns the plaintext to whoever calls it.

Option 1 is the smaller, lower-risk change and matches the pattern already used for staff invitations elsewhere in the codebase.
