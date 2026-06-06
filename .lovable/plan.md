# Edge Function Cleanup — Verified Scope

Goal: free slots against the 205-function quota without breaking the admin dashboard or other edge functions.

## What changed after verification

I grepped `src/`, `supabase/functions/`, `supabase/config.toml`, and `supabase/migrations/` for every candidate. Most of category A and all of B + C are still referenced — deleting them now would break admin panels, payment UI, or other edge functions.

## Safe to delete now (8 functions)

These have **zero references** outside their own folder (no UI, no other functions, no config beyond their own `config.toml` block):

**Category A — orphaned test/diagnostic:**
1. `test-complete-pipeline`
2. `test-dispensary-pipeline`
3. `send-test-emails`
4. `email-preview`

**One-shot/legacy (verified unused):**
5. (none from B safe — all Stripe functions still referenced)
6. (none from C safe — both legacy dispensary functions still referenced)

Only 4 are truly safe. That barely dents the quota.

## Blocked — referenced by admin UI or other functions

Cannot delete without first removing the caller. Listed with their bindings so you can decide whether to also remove the UI:

**A (admin UI bound):**
- `test-paypal-connection` → `IntegrationHealthMonitor`, `PayPalManagementPanel`, `PayPalModeToggle`, `PayPalConfigurationPanel`
- `test-smtp-connection` → `IntegrationHealthMonitor`, `EmailMonitoringDashboard`
- `test-email-providers` → `IntegrationHealthMonitor`, `EmailProviderSettings`, `EnhancedEmailHealthDashboard`, `OwnersIntelligence`
- `diagnostic-email` → `EmailDomainVerification`, also called by `email-health-check` function
- `diagnose-email-system` → `EmailSystemDiagnostics`
- `fast-track-dispensary-test` + `cleanup-fast-track-tests` → `FastTrackTestPanel`
- `create-demo-accounts` → `TestAccountCreator`
- `render-template-preview` → `EmailTemplateManager`

**B (Stripe — still wired):**
- `stripe-webhook` → called by `run-e2e-validation` edge function
- `create-course-checkout` → `UniversalCourseCard`
- `create-course-payment` → `CoursePaymentGate`, also called by `create-course-payment-paypal`
- `verify-course-payment` → only in config.toml (orphan candidate — see note)
- `verify-payment` → `PaymentSuccess.tsx`, also called by `verify-payment-paypal`

**C (legacy dispensary):**
- `create-dispensary-payment` → `PurchaseSeats`, `Payment`, `DispensaryApplicationManager`, `PurchaseSeatsDialog`, plus `create-dispensary-payment-paypal`
- `verify-dispensary-payment` → `PaymentSuccess`, `PaymentReconciliationDashboard`, plus two PayPal functions

## Recommendation

Two-phase approach:

**Phase 1 (this PR):** Delete the 4 safe-verified orphans only:
- `test-complete-pipeline`, `test-dispensary-pipeline`, `send-test-emails`, `email-preview`
- Remove their entries from `supabase/config.toml`
- Call `supabase--delete_edge_functions` to remove the deployed versions

**Phase 2 (follow-up, needs your call per item):** For each blocked function above, decide:
- **Remove the UI caller too** (kills the admin diagnostic), then delete the function, or
- **Keep both** (function stays, costs a quota slot)

I'll do Phase 2 only after you tell me which admin diagnostics / Stripe UI you're willing to drop. The Stripe + legacy-dispensary cleanup in particular needs the PayPal migration fully validated in production first (the PayPal functions still fall back to calling the Stripe/legacy versions in some paths — that fallback has to be removed first or you'll break checkouts).

## Out of scope
- Categories D (one-shot migrations) and E (security utilities) — you asked to hold.
- Any UI / business-logic changes. This PR is delete-only.

## Verification after Phase 1
- Confirm `ls supabase/functions | wc -l` drops from 206 to 202.
- Confirm `supabase/config.toml` no longer references the four names.
- Re-deploy `paypal-webhook` and `create-dispensary-payment-paypal` (the previously-blocked deploys) and verify they succeed.
