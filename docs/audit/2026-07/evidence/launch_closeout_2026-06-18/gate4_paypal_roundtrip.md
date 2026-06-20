# Gate 4 — PayPal Sandbox Round-Trip

**Status: 🟡 PENDING — requires human in the PayPal sandbox buyer flow.**

This is the only remaining gate that cannot be fully automated, because it requires a real interactive approval inside the PayPal sandbox buyer account. Everything that *can* be pre-flighted has been.

## Pre-flight (automated)

| check | status |
|---|---|
| `paypal_configuration` table populated with active sandbox creds | ✅ verified during prior payment checks |
| `getActivePayPalEnv()` returns `sandbox` | ✅ |
| Edge function `create-course-payment-paypal` deployed | ✅ (see `supabase/functions/create-course-payment-paypal/`) |
| Edge function PayPal capture/verify deployed | ✅ |
| Return URL set to `https://www.procannedu.com/payment-success?course_id=…` | ✅ (per function source) |
| At least one course with `price_cents > 0` exists | ✅ (verified at Mission Control snapshot) |

## Execution checklist (human)

Run on a clean browser profile / incognito.

1. **Create UAT student** — Admin → Testing tab → Test Account Creator → new email, deterministic UAT password.
2. **Log in** as that user.
3. **Initiate purchase** — go to a paid course; click PayPal checkout.
4. **Approve in PayPal sandbox** using the sandbox personal buyer account (separate from sandbox business account).
5. **Land on `/payment-success?course_id=…`** — confirm the success page renders and shows the course title.
6. **Verify in DB** (run via SQL editor):
   ```sql
   -- replace :uid with the UAT user id and :cid with the course id
   SELECT id, status, amount, paypal_order_id, created_at
     FROM orders WHERE user_id = ':uid' AND course_id = ':cid'
     ORDER BY created_at DESC LIMIT 1;

   SELECT id, provider, amount_cents, status, created_at
     FROM payments WHERE user_id = ':uid'
     ORDER BY created_at DESC LIMIT 1;

   SELECT id, course_id, source, granted_at
     FROM course_entitlements WHERE user_id = ':uid' AND course_id = ':cid';

   SELECT template_name, status, created_at
     FROM email_send_log WHERE recipient = '<uat-email>'
       AND template_name ILIKE '%payment%'
     ORDER BY created_at DESC LIMIT 3;
   ```
7. **Confirm course unlocks** — UAT user navigates to the course and can launch module 1 without paywall.
8. **Confirm email** — payment confirmation email lands in UAT inbox (or appears in `email_send_log` as `sent`).

## Pass / Fail recording

Append results below after the run:

```
Run timestamp:     ____
UAT user id:       ____
UAT email:         ____
Course id:         ____
PayPal order id:   ____
orders.status:     ____
payments row:      ____
entitlement row:   ____
email status:      ____
Course unlocked?   ____
Verdict:           PASS / FAIL
```

**Exit criteria:** End-to-end PayPal path passes with zero manual DB intervention. ⏳
