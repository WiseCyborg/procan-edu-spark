# Gate 4 — PayPal Sandbox Round-Trip

**Status: 🔴 FAIL (launch blocker) — found by static + DB audit, before initiating the live sandbox capture.**

The PayPal **course-purchase** code path does not grant course access. Running the
live sandbox checkout would have completed the PayPal transaction and marked the
order paid, but the buyer would still hit the paywall — because no
`course_entitlements` row is ever created for a direct PayPal course purchase.
Per the gate's stop-on-failure rule, the live capture was not executed.

Run timestamp: 2026-06-20T08:36Z
Auditor: automated (Lovable)

## Pre-flight (passed)

| check | result | evidence |
|---|---|---|
| `paypal_configuration.environment` | `sandbox` | SELECT on `paypal_configuration` (id `6eec4f0e-7c83-4d86-b901-0664f3c4f46f`, updated 2025-10-31) |
| At least one paid+active course exists | yes | cheapest paid course: `First Time at a Dispensary` ($19.99, `fd6dc848-89a5-498e-a9e9-9647228fb532`); planned test course: `Maryland Responsible Vendor Training (RVT)` ($49.99, `e6841a2f-4e92-47c3-9ed4-243ccc22338b`) |
| `create-course-payment-paypal` deployed | yes | `supabase/functions/create-course-payment-paypal/index.ts` |
| `verify-payment-paypal` deployed | yes | `supabase/functions/verify-payment-paypal/index.ts` |
| `paypal-webhook` deployed | yes | `supabase/functions/paypal-webhook/index.ts` |
| Sandbox buyer credentials supplied | yes | `sb-eq4dp47066600@personal.example.com` / `[<0&o1Gk` |

## Blocker — no entitlement provisioning on direct PayPal course purchase

### Truth source for course access
`src/hooks/usePaymentStatus.tsx` (P5, 2026-06-16) treats course access as:
1. `course_entitlements` row with `status='active'` for `(user_id, course_id)`; or
2. `rvt_seats` row assigned to the user for the course (org-seat path).

Direct PayPal purchases must produce (1). They don't.

### What the PayPal path actually does
- `create-course-payment-paypal/index.ts:116` inserts an `orders` row with
  `status='pending'` and `custom_id = "course_{courseId}_user_{userId}"`. No
  entitlement.
- `verify-payment-paypal/index.ts:70-83` (called from `PaymentSuccess.tsx:88`
  after the buyer returns) updates `orders.status='paid'` and fires the
  `send-payment-confirmation` email. **No insert into `course_entitlements`.**
- `paypal-webhook/index.ts:333-348` (course branch) updates
  `orders.status='completed'` and records `payment_events`. **No insert into
  `course_entitlements`.**
- `PaymentSuccess.tsx:88-106` calls `verify-payment-paypal`, shows a toast, then
  redirects to `/courses/{courseId}`. **No client-side entitlement write.**

### Database-side check
Only one entitlement-related routine exists:

```
select routine_name from information_schema.routines
where routine_schema='public'
  and (routine_name ilike '%entitlement%' or routine_name ilike '%order%');
→ fn_upsert_entitlement_on_seat_assign
```

That trigger fires on `rvt_seats` assignment (org-seat path) only. There is **no
trigger on `orders` or `payments`**, so even `orders.status='paid'/'completed'`
does not cascade into `course_entitlements`.

```
select trigger_name from information_schema.triggers
where event_object_table in ('orders','payments')
  and event_object_schema='public';
→ (no rows)
```

### Codebase grep — all writers of `course_entitlements`
```
supabase/functions/create-uat-account/index.ts       (org-seat path, employee accountType)
supabase/functions/accept-org-invite/index.ts        (org invite seat assignment)
supabase/functions/run-e2e-validation/index.ts       (test harness; self-cleans)
supabase/functions/get-video-url/index.ts            (read-only check)
```
Zero PayPal-flow writers.

### Net effect on a live buyer
1. Buyer pays in PayPal sandbox → `orders.status='paid'`, confirmation email
   sent, redirect to `/courses/{courseId}`.
2. `usePaymentStatus` sees no `course_entitlements` and no `rvt_seats` row →
   returns `hasPaid: false`.
3. `CoursePaymentGate` re-renders → buyer sees the "Course Payment Required"
   paywall on the course they just paid for.

This is a P0 launch blocker for any direct-purchase course flow.

## Why the live capture was not executed

The plan's stop-on-failure rule:
> If any step fails, the AI stops, records the failure ... flips Mission Control
> to 🔴 NO-GO. No silent retries, no DB hand-patching.

The blocker is fully determined from code + DB state. Running PayPal sandbox now
would consume a real (sandbox) order and a real `orders` row, would not change
the verdict, and would force a manual DB cleanup. Held until the entitlement
provisioning fix lands.

(Secondary, unrelated: the `supabase--curl_edge_functions` tool's preview
session token is not currently injected for this sandbox, so the admin-only
`create-uat-account` could not be invoked from chat in this turn. Not a gate
finding; only relevant if the live capture is re-attempted.)

## Required remediation (separate work item — not done in this run)

Either of these closes the blocker. The webhook path is the
production-correct one; the verify path is the synchronous fallback the
PaymentSuccess page already relies on.

**Option 1 — extend `verify-payment-paypal` (course branch, around line 95):**

```ts
await supabaseService
  .from("course_entitlements")
  .upsert({
    user_id: order.user_id,
    course_id: order.course_id,
    source: "direct_purchase",
    status: "active",
    purchased_at: new Date().toISOString(),
    metadata: { paypal_order_id: orderId, amount_cents: order.amount },
  }, { onConflict: "user_id,course_id" });
```

**Option 2 — extend `paypal-webhook` (course branch, around line 344) with the same upsert,** so the entitlement is created from the authoritative server-to-server event even if the buyer closes the tab before returning.

Recommended: do **both** (webhook is truth, verify is the fast-path UX). Then add a regression test that asserts a `course_entitlements` row exists after a sandbox PayPal capture for a course purchase.

After the fix lands, re-run this gate end-to-end with the sandbox buyer.

## Pass / fail recording

```
Run timestamp:     2026-06-20T08:36Z
UAT user id:       — (not created; blocker found pre-checkout)
UAT email:         —
Course id:         e6841a2f-4e92-47c3-9ed4-243ccc22338b (planned)
PayPal order id:   —
orders.status:     —
payments row:      —
entitlement row:   would not have been created (blocker)
email status:      —
Course unlocked?   NO — would remain paywalled
Verdict:           FAIL — launch blocker
```

**Exit criteria for re-run:** entitlement upsert is added to both
`verify-payment-paypal` and `paypal-webhook` (course branch); a sandbox capture
produces an active `course_entitlements` row; `usePaymentStatus` returns
`hasPaid: true` and the course launches without paywall.
