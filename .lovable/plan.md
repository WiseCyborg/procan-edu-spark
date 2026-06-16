# Plan: P4, P5, B2/B3 — finish the go-live blocker batch

Closes the remaining items from the go-live audit so the only thing left is a clean UAT pass.

## P4 — Eliminate the dual-provisioning race in PayPal seat purchases

**Problem.** Both `paypal-webhook` (server-to-server, signature-verified) and `verify-dispensary-payment-paypal` (browser-invoked from `PaymentSuccess.tsx` and the admin reconciliation dashboard) insert into `rvt_seats` and `rvt_purchases`. If both run for the same order, the webhook's idempotency check ("skip if any seats exist for this purchase") races the verify endpoint and can yield duplicate purchases or skipped seats depending on ordering.

**Fix.** Make `paypal-webhook` the single writer; demote `verify-dispensary-payment-paypal` to read-only status reporting.

Changes to `supabase/functions/verify-dispensary-payment-paypal/index.ts`:
- Remove the `rvt_seats` insert (around line 180) and the `rvt_purchases` insert (around line 206).
- Keep PayPal order capture (so PayPal-side state still settles) but stop mirroring it into our tables.
- Read existing `rvt_purchases` / `rvt_seats` rows by `paypal_order_id` and return their state to the caller.
- If the webhook has not yet landed, return `{ success: true, status: "pending_webhook", seats_provisioned: false }` with a 200 (no 500). `PaymentSuccess.tsx` already polls; this keeps the spinner honest instead of racing to write.
- Keep `payment_audit_log` writes so we still see who triggered verification.

Changes to `src/pages/PaymentSuccess.tsx`:
- Treat `pending_webhook` as "keep polling" up to ~30s, then show a "we will email your receipt as soon as PayPal confirms — your seats will appear on your dashboard" message instead of an error.

No change to `create-dispensary-payment-paypal` or `paypal-webhook`.

## P5 — Source `usePaymentStatus` from real entitlements

**Problem.** `src/hooks/usePaymentStatus.tsx` queries the vestigial `orders` table, which is not written by the current PayPal flow. It is consumed by `CourseLayout`, `TrainingHandbook`, and `ChatAssistant` to gate access. Today it returns `hasPaid: false` for legitimately enrolled users.

**Fix.** Rewrite the hook to check the actual sources of truth, preserving its signature so callers don't change:

1. `course_entitlements` — row with `user_id`, `course_id`, `status = 'active'` (covers direct course purchases and admin grants).
2. `rvt_seats` — row with `assigned_user_id = user.id` joined to a purchase whose `course_id` matches (covers seat-based access from the dispensary flow).
3. Fall back to `false` only when neither exists.

`orderInfo` becomes a small shape: `{ source: 'entitlement' | 'seat', granted_at, ... }`. Existing call sites only use `hasPaid` / `isLoading`, so this is safe.

Keep TanStack staleTime at 5 min. No schema changes.

## B2/B3 — Resolve duplicate license pairs (process plan, not a data write)

**Problem.** Three Maryland license numbers are attached to two `organizations` rows each: `DA-23-12345`, `DA-25-12345`, `123456689`. The detector will keep firing until each pair is reduced to one row.

**Fix (process, no schema change).**

1. Generate a sign-off worksheet at `docs/audit/2026-07/evidence/duplicate_license_signoff_2026-06-16.md` that lists for each license number:
   - both `organizations.id` values and their `name`, `created_at`, `legal_business_name`, `dispensary_manager_email`, member count from `organization_members`, and whether either is referenced by `rvt_purchases`, `course_entitlements`, `dispensary_applications`, or `staff_invitations`.
   - The default "keep" recommendation (oldest org with non-zero member/entitlement count; the other is the stub).
   - A signature line: `Decision owner: __________  Decision: keep <id>, retire <id>  Date: ______`.

2. Add a one-shot service-role edge function `resolve-duplicate-license` (per the project's one-shot-repair pattern) that, given `{ license_number, keep_org_id, retire_org_id }`:
   - Reparents `organization_members`, `rvt_purchases`, `rvt_seats`, `course_entitlements`, `dispensary_applications`, `staff_invitations`, and `org_invites` from `retire_org_id` to `keep_org_id` inside a single transaction.
   - Soft-deletes the retired org (sets `deprovisioned_at`, blanks `license_number`) so the detector stops firing without losing the audit trail.
   - Writes an `admin_operations_audit` row with the decision-owner name passed in.
   - Refuses to run if both orgs have members (manual merge required — escalates with a clear error).

3. Do NOT invoke the function automatically. The plan ends with the worksheet ready for Danielle/Louis to sign; execution is a separate step once the decision-owner row is filled in.

## Verification

- P4: place a sandbox PayPal order, force the verify endpoint to run before the webhook (DevTools throttling), confirm a single purchase row and N seats; let the webhook fire, confirm no duplicates.
- P5: pick one user with a live `course_entitlements` row and zero `orders` rows; load `CourseLayout` and confirm `hasPaid === true`; clear the entitlement and confirm `hasPaid` flips.
- B2/B3: open the worksheet and confirm all three license numbers have populated keep/retire candidates and impact counts.

## Out of scope

- Backfilling/cleaning the `orders` table (deprecated; tracked separately).
- B4–B6 detector tuning beyond what landed in B1.
- Actually executing the duplicate-license merges — that requires a signed worksheet first.

## Technical details

Files touched:
- `supabase/functions/verify-dispensary-payment-paypal/index.ts` (delete two inserts, return pending status)
- `src/pages/PaymentSuccess.tsx` (handle `pending_webhook`)
- `src/hooks/usePaymentStatus.tsx` (rewrite query)
- `supabase/functions/resolve-duplicate-license/index.ts` (new, one-shot, service-role, JWT-validated admin only)
- `supabase/config.toml` (register the new function, `verify_jwt = true`)
- `docs/audit/2026-07/evidence/duplicate_license_signoff_2026-06-16.md` (new)
- `.lovable/plan.md` (mark P4/P5/B2/B3 status)
- `docs/audit/2026-07/evidence/go_live_batch_2026-06-16.md` (append results)

No database migrations.

---

## Status update — 2026-06-16

- **P4** — DONE. `verify-dispensary-payment-paypal` is read-only; `PaymentSuccess.tsx` polls `pending_webhook`.
- **P5** — DONE. `usePaymentStatus` reads `course_entitlements` then `rvt_seats`; `orders` table no longer consulted.
- **B2/B3** — Scaffolded. New `resolve-duplicate-license` edge function (admin-only) + sign-off worksheet at `docs/audit/2026-07/evidence/duplicate_license_signoff_2026-06-16.md`. Awaiting Danielle/Louis sign-off before execution.

See `docs/audit/2026-07/evidence/go_live_batch_2026-06-16.md` for the full evidence trail.
