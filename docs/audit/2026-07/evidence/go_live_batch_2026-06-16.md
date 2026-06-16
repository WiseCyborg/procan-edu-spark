# Go-Live Blocker Batch — 2026-06-16

Status snapshot of the 12-blocker plan after the first implementation pass.

## Landed (deployed)

| ID | Description | Files | Verified |
|---|---|---|---|
| **A2** | `seat-reconciliation-agent`: removed phantom `course_id` insert into `rvt_join_codes`; added `.select()` + error inspection; phantom auto-fix events can no longer be emitted | `supabase/functions/seat-reconciliation-agent/index.ts` | Schema confirms `rvt_join_codes` has no `course_id` column; new insert payload aligns with actual schema |
| **A3** | `application-state-agent`: fixed the same `supabase.rpc(...)` PromiseLike-as-column counter bug previously fixed in pipeline-health-agent; added checked write for `registration_token` generation | `supabase/functions/application-state-agent/index.ts` | Read-modify-write pattern matches the pipeline-health-agent fix |
| **A3** | `organization-integrity-agent`: added checked write for expired-token regeneration | `supabase/functions/organization-integrity-agent/index.ts` | Same pattern |
| **B1** | UAT/E2E/smoke residue filter shipped as `_shared/test-org-filter.ts`; applied at three high-traffic detector entry points (orgs needing join codes, stuck-pending applications, approved-not-configured loop, unregistered-manager loop) | `supabase/functions/_shared/test-org-filter.ts` + 3 agents | Regex matches `UAT Test*`, `E2E Test*`, `Smoke Test*`, and literal `ABC` |
| **P1** | `create-dispensary-payment-paypal` now accepts a second mode: `{ organization_id, quantity, idempotencyKey }` with Authorization-header JWT validation, org-membership check, and role check (`dispensary_manager` OR `training_coordinator`). `PurchaseSeats.tsx` updated to pass `organization_id` | `supabase/functions/create-dispensary-payment-paypal/index.ts`, `src/pages/PurchaseSeats.tsx` | Top-up uses idempotency key `topup_{orgId}_{client_idem}`; webhook still parses `purchase_{id}_org_{id}_qty_{n}` unchanged |
| **P2** | PayPal webhook: signature verification is now **mandatory in production**. If `PAYPAL_WEBHOOK_ID` env is missing OR sig-check throws, function returns 401. Sandbox still permits absent webhook ID with a warning | `supabase/functions/paypal-webhook/index.ts` | Driven off `getActivePayPalEnv()` |
| **P3** | PayPal webhook now parses both course `custom_id` formats: legacy `course:{userId}:{courseId}` AND current `course_{courseId}_user_{userId}` | `supabase/functions/paypal-webhook/index.ts` | Webhook can now mark `orders.status='completed'` even if the buyer's browser never reaches `/payment-success` |
| **Config** | `post-migration-regression` flipped to `verify_jwt = true`. 22 unlisted functions added with explicit `verify_jwt` declarations | `supabase/config.toml` | All admin/management functions defaulted to `true`; cron/scraper/retry to `false` |

## Not landed — needs decision or follow-up

| ID | Why it didn't ship in this pass |
|---|---|
| **P4** (dual-provisioning race in `verify-dispensary-payment-paypal`) | Decision needed: demote verify to read-only (drop ~150 lines), or add the same seat-count idempotency guard the webhook has. Recommend the former. |
| **P5** (`usePaymentStatus` querying vestigial `orders`) | Multi-component refactor; needs to source from `course_entitlements` + `rvt_seats`. Will draft as its own micro-plan. |
| **B2/B3** (duplicate licenses for `DA-23-12345`, `DA-25-12345`, `123456689`) | Awaiting named human owner (Danielle, Louis, or joint) before any data change. |
| **Email-domain check** (`procannedu.com` Resend verification) | Out-of-band — needs Resend dashboard screenshot. |
| **UAT-Pass** | Sequenced for after the above three land. |

## Required production-side action

**`PAYPAL_WEBHOOK_ID` must be set in production secrets before the new webhook deploys reach the production environment.** With this batch live, a production PayPal event arriving without `PAYPAL_WEBHOOK_ID` set will be rejected with 401, which is the desired behaviour but will block real payments if the secret is unset. Confirm the secret exists in the production Supabase project, OR confirm the project is still in sandbox mode (`paypal_configuration.environment = 'sandbox'`).

## Re-verification checklist

After the next pipeline-health-agent run completes:

1. `agent_events` for `seat_reconciliation`: confirm any `auto_fixed:true` events have a corresponding `rvt_join_codes` row whose id matches `metadata.join_code_id`.
2. `agent_configs` row for `application_state`: `run_count` and `success_count` increment by exactly 1 each invocation.
3. `pipeline_health_events`: no new `stuck_after_approval` or `no_registration_token` events sourced from orgs named `UAT Test*`, `E2E Test*`, or `ABC`.
4. `payment_events` (post next real or sandbox course capture): the previously-unrecognized `course_{...}_user_{...}` custom_id should now produce `status='processed'`.

---

## Update 2026-06-16 (PM): P4, P5, B2/B3 landed

### P4 — Dual-provisioning race eliminated
`verify-dispensary-payment-paypal` rewritten as read-only. It now (a) captures the PayPal order so it doesn't get stuck in APPROVED, and (b) reports DB state: `status: 'provisioned'` if the webhook has landed, `status: 'pending_webhook'` if not. `PaymentSuccess.tsx` polls `pending_webhook` up to ~30s before showing a "we'll email your receipt" fallback. The webhook (`paypal-webhook`) is now the single writer for `rvt_purchases` / `rvt_seats` / `rvt_join_codes` / application status / confirmation emails.

### P5 — `usePaymentStatus` reads real entitlements
Hook rewritten to query `course_entitlements` first (covers Stripe, admin grants, promo codes, and seat-trigger assignments) and fall back to `rvt_seats` filtered by `assigned_user_id` + `course_id` + status in (`assigned`,`used`). The vestigial `orders` table is no longer consulted. Signature unchanged, so `CourseLayout`, `TrainingHandbook`, and `ChatAssistant` need no edits.

### B2/B3 — Duplicate license resolution scaffolded (not executed)
- New one-shot edge function `resolve-duplicate-license` (admin-only, JWT-verified, service-role-internal). Reparents children, soft-deletes the retired org, writes `admin_operations_audit`. Refuses if both orgs have members.
- Sign-off worksheet at `docs/audit/2026-07/evidence/duplicate_license_signoff_2026-06-16.md` with per-license impact counts and a recommended keep/retire pick for each pair.
- Discovery: all six rows are `ABC`-named test orgs under `daniellebrooks502@gmail.com`. Alternate path documented (scrub all six instead of merging) — owner picks.
- **No DB writes yet.** Execution waits on a signed worksheet.

### Remaining before GO
1. Configure `PAYPAL_WEBHOOK_ID` in production secrets (P2 still gates production).
2. Danielle/Louis sign the duplicate-license worksheet, then admin runs `resolve-duplicate-license` for each pair.
3. UAT pass — one full role-path with evidence captured.
