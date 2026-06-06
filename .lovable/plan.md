# Phase 2 — Conservative Edge Function Cleanup

Goal: free 11 more function slots and remove their UI/edge callers without breaking PayPal, admin dashboards, or scheduled jobs.

## Verified caller map (word-boundary grep)

### Stripe — 5 functions

| Function | Real callers | Action |
|---|---|---|
| `stripe-webhook` | `run-e2e-validation/index.ts` H1 check (lines 1218-1233) | Rewrite H1 to probe `paypal-webhook` instead |
| `create-course-checkout` | `src/components/courses/UniversalCourseCard.tsx:54` | Repoint to `create-course-payment-paypal` (same shape) |
| `create-course-payment` | none (earlier matches were `create-course-payment-paypal` substring) | Delete only |
| `verify-course-payment` | none | Delete only |
| `verify-payment` | none (earlier matches were `verify-payment-paypal` substring) | Delete only |

### Admin diagnostics — 6 functions

| Function | Real callers | Action |
|---|---|---|
| `test-paypal-connection` | `IntegrationHealthMonitor.tsx`, `PayPalManagementPanel.tsx`, `PayPalModeToggle.tsx`, `PayPalConfigurationPanel.tsx` | Remove the "Test PayPal" button + handler from each |
| `test-smtp-connection` | `IntegrationHealthMonitor.tsx`, `EmailMonitoringDashboard.tsx` | Remove SMTP test button + handler |
| `test-email-providers` | `IntegrationHealthMonitor.tsx`, `EnhancedEmailHealthDashboard.tsx`, `EmailProviderSettings.tsx`, `OwnersIntelligence.tsx` | Remove provider test button + handler |
| `diagnostic-email` | none — UI references use `_diagnostic-email` (a different, already-non-existent name) | Delete only |
| `diagnose-email-system` | `EmailSystemDiagnostics.tsx` | Remove component's diagnostic run button |
| `render-template-preview` | `EmailTemplateManager.tsx` | Remove "Preview rendered" action |

### Holds (per your direction — not touched)
- `check-paypal-secrets`, `configure-encryption-key`
- All migration / population functions
- COMAR automation, pg_cron, audit trail, coach grounding, certificate, and payment-verification functions

## Implementation steps

1. **Stripe wiring changes**
   - `UniversalCourseCard.tsx`: change `supabase.functions.invoke('create-course-checkout', ...)` to `'create-course-payment-paypal'`. Keep payload shape; if it diverges, log and surface a branded error.
   - `run-e2e-validation/index.ts` H1: change probe URL from `/functions/v1/stripe-webhook` to `/functions/v1/paypal-webhook`. Update label `H1 Webhook Exists` description from "Stripe" → "PayPal" so the audit report stays truthful.

2. **Admin-UI button removals** (UI-only; no business logic touched)
   - `IntegrationHealthMonitor.tsx`: drop the PayPal/SMTP/email-provider test cards. If the file becomes empty, leave a stub placeholder card "Integration tests retired".
   - `PayPalManagementPanel.tsx`, `PayPalModeToggle.tsx`, `PayPalConfigurationPanel.tsx`: remove "Test connection" buttons + state + the `invoke` call. Keep the rest of the panel (config edit, env toggle) intact.
   - `EmailMonitoringDashboard.tsx`: remove SMTP test button.
   - `EnhancedEmailHealthDashboard.tsx`, `EmailProviderSettings.tsx`, `OwnersIntelligence.tsx`: remove provider test button + its handler. In `OwnersIntelligence.tsx` drop the `'test-email-providers'` entry from the agent list rather than removing the whole agent runner.
   - `EmailSystemDiagnostics.tsx`: remove the diagnostic-run button. If the component becomes empty, delete the route mount too (will check before deleting).
   - `EmailTemplateManager.tsx`: remove "Preview rendered" action; keep raw-source preview.

3. **Delete edge function folders** (after UI is decoupled)
   ```
   stripe-webhook
   create-course-checkout
   create-course-payment
   verify-course-payment
   verify-payment
   test-paypal-connection
   test-smtp-connection
   test-email-providers
   diagnostic-email
   diagnose-email-system
   render-template-preview
   ```
   Strip their `[functions.<name>]` blocks from `supabase/config.toml`.

4. **Remote deletion**: call `supabase--delete_edge_functions` for the 11 names.

5. **Redeploy PayPal pipeline**: `supabase--deploy_edge_functions` for `paypal-webhook`, `create-dispensary-payment-paypal`, `create-course-payment-paypal`, `verify-payment-paypal`, `verify-dispensary-payment-paypal`, `get-application-payment-status` — these were blocked by the 205 cap.

6. **Smoke test (read-only)**
   - `ls supabase/functions | wc -l` → expect 191 (was 202 after Phase 1).
   - `supabase--curl_edge_functions` GET `/paypal-webhook` → expect 200/401/405.
   - `supabase--curl_edge_functions` POST `/create-course-payment-paypal` with a known course_id (no checkout completion, just verify it returns a URL or a structured error).
   - Verify no remaining src/* reference to any of the 11 deleted names (`rg -nw "<name>" src supabase/functions`).

## Not in scope
- No DB migrations.
- No removal of secrets (`STRIPE_*` env vars stay — they're harmless after function deletion and may be reused later; user explicitly asked to hold on secret cleanup).
- No changes to `run-e2e-validation` beyond the H1 URL swap.
- No COMAR / cron / audit / certificate / payment-verification function touches.

## Risk notes
- The Stripe webhook endpoint at `…/functions/v1/stripe-webhook` will return 404 after delete. If Stripe still has any webhook subscription pointing there, those deliveries will fail silently. Recommend (separately) removing the webhook in the Stripe dashboard — flagged in the closing message, not done here.
- `UniversalCourseCard` payload may have differed between `create-course-checkout` and `create-course-payment-paypal`. Will diff both function signatures before swapping; if incompatible, will adapt the payload in the card rather than the function.
