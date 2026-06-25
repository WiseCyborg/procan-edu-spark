# Go-Live Blocker Checklist

Four hard items remain between today's 🟡 Conditional GO and a clean 🟢 Production GO. Everything else (30-day stabilization, OPS dashboards, PAY-001 reconciliation) is post-launch.

## 1. Live PayPal capture — Gate 4 closeout
**Why blocker:** Gate 4 currently passes on synthetic webhook events only. We need one real money round-trip in production (or production-mode sandbox) to prove the full path: checkout → capture → `payment_events` row → `orders.paid_at` set → `course_entitlements` row written → student lands on the course gate unlocked.

**Action:**
- Run one $49.99 PayPal purchase as a fresh UAT student against the live `paypal-webhook`.
- Verify the four DB rows exist and `RequireAccess` lets the user into the RVT course without manual intervention.
- Save the capture ID + DB row screenshots to `docs/audit/2026-07/evidence/launch_closeout_2026-06-18/gate4_live_capture.md`.

## 2. UX-001 — "Start Course" redirect
**Why blocker:** Unpaid users clicking "Start Course" on `/courses` get routed through `RequireAccess` → `/payment` (the dispensary application page) instead of the `CoursePaymentGate` paywall. Server-side entitlement is correct, but the entry point is broken for the most common conversion path.

**Action:** One-line route change on the unpaid branch — send to the course paywall, not `/payment`. Frontend only, no edge function or DB change.

## 3. SEC-001 — Role matrix sweep
**Why blocker:** Last security event triage (Gate 1) classified 8 admin role changes as expected UAT activity. Before go-live we need a clean snapshot proving no unexpected `admin` / `manager` grants exist in production.

**Action:**
- Query `user_roles` joined to `auth.users` and confirm every `admin` / `manager` row maps to a known operator.
- Revoke anything unrecognized.
- Save the snapshot to `docs/audit/2026-07/evidence/sec001_role_sweep.md`.

## 4. Evidence freeze + build tag
**Why blocker:** The 🟢 verdict has to be tied to a specific commit so we can roll back cleanly and so the audit trail is reproducible.

**Action:**
- Re-run Mission Control snapshot on the post-fix HEAD; expect all five gates green.
- Update `docs/audit/2026-07/evidence/mission_control_summary_2026-06-18.md` with the final commit SHA and timestamp.
- Tag the build `launch-go-1.0.0`.

## Out of scope (intentionally deferred)
- PAY-001 reconciliation job (post-launch, week 1)
- OPS-001 / OPS-002 production health dashboards
- CERT-001 certificate audit sweep
- Full 30-day stabilization plan

## Sequencing
Do them in order: **2 → 1 → 3 → 4**. UX-001 first because the live capture in #1 should exercise the fixed flow; SEC-001 right before the freeze so the snapshot is current.

## Want me to execute?
Say the word and I'll start with UX-001 (smallest, frontend-only) and then drive the rest one at a time.
