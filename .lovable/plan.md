# Gate 4 — PayPal Sandbox Round-Trip (Automated Execution)

Run a full end-to-end PayPal sandbox purchase as a fresh UAT student, verify every downstream effect, then regenerate the launch closeout and final Mission Control snapshot.

## Inputs
- **Buyer (PayPal sandbox personal):** `sb-eq4dp47066600@personal.example.com` / `[<0&o1Gk`
- **UAT student:** created fresh during the run (deterministic UAT password)
- **Course:** first published paid course (`price_cents > 0`) — selected via SQL at runtime

## Steps

1. **Pre-flight (SQL + edge):**
   - Confirm `paypal_configuration.environment = 'sandbox'`.
   - Pick a paid published course; capture `course_id`, title, price.
   - Confirm `create-course-payment-paypal` is deployed.

2. **Create UAT student:**
   - Insert via admin test-account path (deterministic password from UAT password standard).
   - Capture `user_id`, email.
   - Confirm `profiles` row, email-verified state, no pre-existing entitlements.

3. **Initiate order (as UAT student):**
   - Sign in as UAT student in a clean browser session.
   - Trigger PayPal checkout on the chosen course.
   - Capture the PayPal approval URL and `paypal_order_id`.
   - Verify `orders` row exists with `status = 'pending'`.

4. **Buyer approval (PayPal sandbox):**
   - `browser--navigate_to_url` to the approval URL.
   - Log in with the sandbox buyer credentials.
   - Approve the payment; capture screenshot on the return page (`/payment-success?course_id=…`).

5. **Post-capture verification (SQL):**
   - `orders.status = 'completed'` with `paypal_order_id` populated.
   - `payments` row with `provider = 'paypal'`, correct `amount_cents`, `status = 'succeeded'`.
   - `course_entitlements` row for (user, course) with `status = 'active'`.
   - `email_send_log` (or `email_logs`) shows `payment-confirmation` template `sent` to UAT email.

6. **Course unlock check:**
   - As UAT student in browser, navigate to the course; confirm paywall is gone and module 1 is launchable.
   - Screenshot the unlocked course state.

7. **Evidence + closeout:**
   - Overwrite `docs/audit/2026-07/evidence/launch_closeout_2026-06-18/gate4_paypal_roundtrip.md` with a PASS/FAIL table, IDs, timestamps, and screenshots embedded inline (paths under the same folder).
   - Update `docs/audit/2026-07/evidence/launch_closeout_2026-06-18/README.md` Gate 4 row to 🟢 PASS (or 🔴 FAIL with reason).
   - Regenerate `docs/audit/2026-07/evidence/mission_control_summary_2026-06-18.md` with final aggregate (🟢 PRODUCTION GO or 🔴 NO-GO) and a one-line rationale per gate.

## Risk + side effects (acknowledge before approval)
- Creates a **real** UAT user, a **real** `orders` row, a **real** PayPal sandbox transaction, and a **real** `course_entitlements` row. None of this touches live PayPal — sandbox only.
- If any step fails, the AI stops, records the failure in `gate4_paypal_roundtrip.md` as FAIL with full context, and flips Mission Control to 🔴 NO-GO. No silent retries, no DB hand-patching.
- The unrelated `permission denied for table exam_attempts` console warning from `LiveActivityTicker` is out of scope and will not be touched.

## Deliverables
- Updated `gate4_paypal_roundtrip.md` with full evidence
- Updated `launch_closeout_2026-06-18/README.md`
- Regenerated `mission_control_summary_2026-06-18.md` with final GO / NO-GO
