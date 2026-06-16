
# What's Missing — Deep Dive for UAT / Go-Live

Two parallel audits ran (payment flow end-to-end, and non-payment readiness). Net verdict: **NO-GO** today. The architecture is sound; the blockers are concentrated in (a) one broken agent that publishes phantom health data, (b) **five payment blockers — including one that lets anyone forge a paid order**, (c) zero executed UAT evidence, and (d) three unresolved data-integrity items waiting on a named human decision.

This plan is the **inventory and the fix order**. Each block below is an executable sub-plan I'll come back with separately once you greenlight scope.

---

## A. Payment flow — what it actually is today

**Processor:** PayPal is the only live processor. Stripe code is deployed but dead (no UI calls it, `STRIPE_SECRET_KEY` still required by two dead functions).

**Four flows, three of them broken:**

```text
Flow A — Dispensary application + seats (PRIMARY)
  Payment.tsx → create-dispensary-payment-paypal → PayPal
  → paypal-webhook (PAYMENT.CAPTURE.COMPLETED)
  → rvt_purchases=paid, rvt_seats inserted, send-manager-registration-token
  → manager registers, assigns seat
  → DB trigger fn_upsert_entitlement_on_seat_assign → course_entitlements
  STATUS: ✅ Works — but webhook signature is skippable (BLOCKER-P2)

Flow B — Manager in-app seat top-up (/purchase-seats)
  PurchaseSeats.tsx calls create-dispensary-payment-paypal WITHOUT application_id
  Function returns MISSING_APPLICATION_ID → toast error
  STATUS: ❌ Completely dead (BLOCKER-P1)

Flow C — Individual consumer course purchase
  create-course-payment-paypal sets custom_id="course_{id}_user_{id}"
  paypal-webhook only branches on "course:" prefix → unrecognized → orders never marked paid
  Client-side verify-payment-paypal saves it ONLY if the browser reaches /payment-success
  STATUS: ❌ Buyer loses access if tab closes (BLOCKER-P3)

Flow D — Legacy Stripe dispensary
  STATUS: 💀 Dead code, still deployed, still requires STRIPE_SECRET_KEY
```

---

## B. The 12 blockers (in fix order)

### Payment blockers
1. **P1 — Manager seat top-up is dead.** `PurchaseSeats.tsx:83-91` omits `application_id`. Fix: either pass it, or branch the function to accept `organization_id + quantity` for authenticated top-ups.
2. **P2 — PayPal webhook signature verification is skippable.** `paypal-webhook/index.ts:208-229` only verifies if `PAYPAL_WEBHOOK_ID` env var is set; if absent, it logs a warning and accepts the event. Anyone with the URL can forge `PAYMENT.CAPTURE.COMPLETED` and trigger seat provisioning. Fix: make `PAYPAL_WEBHOOK_ID` mandatory in production; return 401 if absent.
3. **P3 — Course-purchase webhook routing broken.** `create-course-payment-paypal:82` uses `"course_..."`; webhook checks `"course:"`. Fix: normalize both to one prefix.
4. **P4 — Dual-provisioning race.** `verify-dispensary-payment-paypal` and `paypal-webhook` both INSERT seats, only the webhook checks for existing rows. Fix: demote verify to read-only status check.
5. **P5 — `usePaymentStatus` queries vestigial `orders` table.** Webhook-provisioned buyers always show `hasPaid=false`. Org employees are saved by a parallel `rvt_seats` check, but any future component that trusts `usePaymentStatus` will be wrong. Fix: source-of-truth is `course_entitlements` + `rvt_seats`; rewrite the hook.

### Pipeline / health-agent blockers (carried from last session)
6. **A2 — `seat-reconciliation-agent` phantom auto-fixes.** Inserts non-existent `course_id` column into `rvt_join_codes`; 41/53 "auto-fixed" events are phantom. Fix: remove `course_id` from the insert, add `.select()` + error check.
7. **A3 — Unchecked writes in sibling agents.** `application-state-agent` and `organization-integrity-agent` use the same unchecked-write pattern. Currently happens to write to the right columns, but any future schema drift will silently produce phantom fixes. Fix: add `.select()` + error inspection to every `.insert/.update` that feeds `auto_fixed:true`.
8. **B1 — Detector filter for UAT/E2E residue.** 10/11 `stuck_after_approval` events and several `no_registration_token` come from `UAT Test Dispensary*`, `E2E Test Org *`, `ABC`. Until filtered, `needs_admin_attention` is inflated by ~15 and the dashboard is untrustworthy as a launch signal.
9. **B2/B3 — Duplicate licenses.** Three pairs (`DA-23-12345`, `DA-25-12345`, `123456689`) each claim the same regulatory number on two orgs. Needs a **named human owner** (Danielle or Louis) to pick the canonical org per pair. No code-only fix is appropriate.

### Security / configuration blockers
10. **22 edge functions missing from `supabase/config.toml`.** No explicit `verify_jwt` declaration; cannot sign off auth posture. Includes `admin-activate-user`, `install-regression-vault-secret`, `seed-uat-dataset`, `purge-uat-seed-dataset`. Fix: add entries, default `verify_jwt = true` for admin-capable functions.
11. **`post-migration-regression` has `verify_jwt = false`.** Anyone can trigger a full regression run. Fix: one-line config flip.
12. **Email domain (`procannedu.com`) Resend verification status not recorded anywhere.** If SPF/DKIM/DMARC aren't green, every transactional email is dropped or marked spoofed. Fix: capture screenshot evidence; if not verified, run domain check tool.

### Operational
13. **UAT evidence = 0.** `uat_runs = uat_tasks = uat_evidence = 0`. Two parallel tracking systems exist (`uat_task_templates/uat_tasks/uat_evidence` RPC-driven, and `uat_test_results` direct-insert) and aren't reconciled. Until at least one tester completes one full role-path pass, sign-off is unsupported.

---

## C. Should-fix (strongly recommended pre-launch, not blocking)

- **P-S1**: No pending-purchase reconciliation job — abandoned checkouts leave `rvt_purchases.status='pending'` forever.
- **P-S2**: `orders.paypal_order_id` has no UNIQUE constraint — retry creates duplicate rows.
- **P-S3**: `allocate-seats-on-payment` is a third standalone provisioner with weak auth; either retire it or harden it.
- **P-S4**: `send-manager-registration-token` doesn't null-check the token; manager can land on a broken registration URL.
- **P-S5**: `Pricing.tsx` consumer CTAs all route to `/dispensary-application` instead of an individual-buyer flow.
- **Ops-S1**: `OPERATIONS_RUNBOOK.md` has `[Your Email]` placeholders and a hardcoded anon JWT (key is public but the endpoint it's calling — `jobs-processor` — is `verify_jwt=false`, so the URL is the actual sensitive part).
- **Ops-S2**: `jobs-processor`, `comprehensive-health-check`, `configure-encryption-key`, `chat-assistant` all have `verify_jwt=false` without obvious in-code auth gates. Audit each; close or document.
- **Ops-S3**: Reconcile the two UAT tracking systems before testers start, or pick one and disable the other.
- **Ops-S4**: 5 `SECURITY DEFINER` views without `SET search_path=public` (from `PIPELINE_FIX_SUMMARY.md:114`).

---

## D. Nice-to-have (post-launch safe)

- Retire `orders` / `payments` tables (0 rows in prod).
- Replace `pipeline-health-agent` read-modify-write counter with a DB-level atomic UPDATE to close the known TOCTOU race.
- Add manual-replay button for `payment_events WHERE status='failed'`.
- Split `informational_count` out of `issues_detected` in `pipeline_health_snapshot`.
- Vimeo → Supabase Storage video migration.
- CHATBOT-SEC-02 (metadata reduction) and CHATBOT-G3 (`chat_intent_log` writes) — both already accepted deferrals.
- `/admin/visibility` live dashboard.

---

## E. Recommended path to GO (minimum viable, ~1–2 business days wall-clock)

```text
Day 1 morning   (engineering, parallel):
  RF-1  P2 — make PAYPAL_WEBHOOK_ID mandatory + signature enforcement
  RF-2  P3 — normalize course custom_id prefix
  RF-3  P1 — fix PurchaseSeats application_id (or branch function)
  RF-4  A2 — remove course_id from seat-reconciliation insert + add error check
  RF-5  A3 — add error checks to application-state + organization-integrity writes
  RF-6  B1 — detector filter for UAT/E2E residue
  RF-7  config.toml: add 22 missing entries; flip post-migration-regression to true

Day 1 afternoon (business + ops):
  RF-8  B2/B3 — name the duplicate-license owner; get one decision per pair
  RF-9  Confirm procannedu.com Resend verification (screenshot)
  RF-10 Replace runbook [Your Email] placeholders + confirm PagerDuty rotation
  RF-11 Pick one UAT tracking system; disable the other

Day 2 morning:
  RF-12 P4 — demote verify-dispensary-payment-paypal to read-only
  RF-13 P5 — rewrite usePaymentStatus to use course_entitlements + rvt_seats
  RF-14 Re-run E2E regression; require issues_detected ≤ 5, needs_admin_attention = 0
  RF-15 At least one tester completes one full role-path UAT pass
        (uat_runs > 0, uat_evidence > 0, all 4 roles touched)

Then: GO call.
```

---

## F. What I'd like to do next (waiting on your word)

I haven't touched code yet — this is the read-only inventory. Tell me which sub-plan to draft first, and whether you want them as individual approvals or one combined "P-tier blockers" plan:

1. **Plan P** — payment blockers P1–P5 (one combined plan, since P4 and P5 depend on understanding P2's webhook path).
2. **Plan A2/A3** — the agent unchecked-write fixes (small, ~30 lines total).
3. **Plan B1** — detector filter for UAT/E2E residue (the single highest-leverage change for dashboard trust).
4. **Plan Config** — `supabase/config.toml` 22 missing entries + `post-migration-regression` flip.
5. **Plan UAT-Pass** — the procedural plan for getting Dani or Louis through one full role-path with evidence captured.

Plan B2/B3 (duplicate licenses) is **not on this list** — it needs a named human first. Tell me who owns it (Danielle, Louis, or both jointly) and I'll add a "Human Decisions Required" section to `PRE_CALL_SIGNOFF_2026-06-14.md` with the three pairs and decision lines.

**My recommendation:** approve **Plan P (combined)** + **Plan A2/A3** + **Plan B1** + **Plan Config** in one batch — they're independent, total well under a day of engineering, and unblock the rest. Hold **Plan UAT-Pass** until after those land so testers aren't chasing phantom-data or broken-checkout symptoms.
