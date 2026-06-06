# PayPal Pipeline Redeploy + Smoke Test

User confirmed the 11 deleted edge functions are gone from the Supabase dashboard and quota slots are freed. Proceeding with redeploy and verification.

## Step 1 — Redeploy PayPal pipeline

Deploy the 6 PayPal functions that were blocked by the quota cap:

- `paypal-webhook`
- `create-course-payment-paypal`
- `verify-payment-paypal`
- `create-dispensary-payment-paypal`
- `verify-dispensary-payment-paypal`
- `get-application-payment-status`

## Step 2 — Static verification (no live payment)

1. `rg -nw "stripe-webhook|create-course-checkout|create-course-payment|verify-course-payment|verify-payment" src supabase/functions` — confirm zero hits for the 5 deleted Stripe function names (excluding `-paypal` suffix matches).
2. `ls supabase/functions | wc -l` — confirm folder count matches expected post-cleanup.
3. Confirm `supabase/config.toml` has no orphan `[functions.<name>]` blocks for deleted functions.

## Step 3 — Edge function smoke probes

Use `supabase--curl_edge_functions` to ping each redeployed function:

- `GET /paypal-webhook` → expect 200/401/405 (not 404)
- `POST /create-course-payment-paypal` with a known course_id → expect either a PayPal approval URL in the response or a structured `{ success: false, error_code }` (not a 500)
- `POST /create-dispensary-payment-paypal` with a test application_id → same expectation
- `GET /get-application-payment-status?application_id=<test>` → expect 200 with status payload

## Step 4 — Log review

- `supabase--edge_function_logs` for `paypal-webhook` and both `create-*-paypal` functions, looking for boot errors, missing-secret errors, or 5xx responses from the smoke probes.
- Check `check-paypal-secrets` to verify PayPal credentials are present in the environment.

## Step 5 — Reporting

Report pass/fail for each of the user's 8 acceptance criteria, with the caveat that 3 of them require a real human-driven PayPal checkout that cannot be fully exercised from the tool harness:

| # | Check | How verified |
|---|---|---|
| 1 | Course checkout starts | `create-course-payment-paypal` returns approval URL |
| 2 | PayPal approval page opens | Manual — flagged for user to test in browser |
| 3 | User returns successfully after payment | Manual — flagged for user to test |
| 4 | Payment status updates in Supabase | Inspect `payments` table after manual test, OR confirm webhook handler logic on inspection |
| 5 | Enrollment unlocks only after verified payment | Inspect `course_entitlements` trigger + `paypal-webhook` handler code |
| 6 | Confirmation email sends | Check `send-payment-*` queue after manual test |
| 7 | No Stripe routes or functions still called | `rg` confirmation from Step 2 |
| 8 | Edge function logs show no payment errors | Log review from Step 4 |

For checks 2, 3, 4, 6 the final pass/fail requires the user to complete one real sandbox PayPal checkout from the live preview — I will provide the exact URL to click and what rows/logs to verify afterward.

## Not in scope

- No code edits.
- No further deletions.
- No changes to secrets, DB schema, or RLS policies.
- No touching of held-back functions (`check-paypal-secrets`, `configure-encryption-key`, migration/COMAR/cron/audit/cert/payment-verification).
