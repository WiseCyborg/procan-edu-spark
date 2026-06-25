# Blocker Sweep — 2026-06-25

Pre-launch sweep against current HEAD. Three of four blockers closed; one remains and requires a real payment capture.

## ✅ Blocker 2 — Public landing-page Postgres error
- **Was:** `LiveActivityTicker` queried `exam_attempts` from the anon role on every visit to `/`; RLS denied the read and a red 42501 error logged to console every 30s for every visitor.
- **Now:** Replaced the table read with `public.get_public_activity_stats(p_limit int)` — `SECURITY DEFINER`, returns only `passed_at` timestamps (no PII, no user IDs), `EXECUTE` granted to `anon` + `authenticated`.
- **Verification:**
  ```
  curl -s -X POST <project>/rest/v1/rpc/get_public_activity_stats \
    -H "apikey: <anon>" -H "Content-Type: application/json" -d '{"p_limit":3}'
  → [{"passed_at":"2026-06-16T19:49:39.677355+00:00"}]
  ```
- **Status:** 🟢 Closed.

## ✅ Blocker 3 — Deadletter regression (`seat_utilization_alert`)
- **Was:** 7 jobs piled up in `system_jobs_deadletter` since 2026-06-22 with `last_error = "No handler for job type: seat_utilization_alert"`. Emitter: `ai-seat-utilization-agent` at line 56. Processor: `jobs-processor` had no matching handler.
- **Now:**
  1. Added `seat_utilization_alert` handler in `supabase/functions/jobs-processor/index.ts` — inserts an info-severity row into `compliance_alerts` keyed on org. No email blast; visible in admin dashboard.
  2. Purged the 7 obsolete DLQ rows in the same migration.
- **Watch:** `jobs-processor` logs over the next 24h. If a new `seat_utilization_alert` enters `system_jobs`, it should `✅ Completed`, not DLQ.
- **Status:** 🟢 Closed.

## ⏸ Blocker 1 — Live PayPal capture
- **Was / still is:** `payment_events` rows = **0**. Synthetic regression coverage proves the code path; only a real money round-trip will prove the full chain in production.
- **Action required (manual):** Run one real checkout from `/get-started` against the live PayPal account.
- **Then verify:**
  ```sql
  SELECT count(*) FROM public.payment_events;            -- expect ≥ 1
  SELECT id, paid_at FROM public.orders ORDER BY created_at DESC LIMIT 1;
  SELECT user_id, course_id, source, status
  FROM public.course_entitlements
  WHERE source = 'paypal' ORDER BY created_at DESC LIMIT 1;
  ```
- **Status:** 🔴 Open — waiting on you.

## ⏸ Blocker 4 — Evidence freeze + build tag
- Held until Blocker 1 closes; freezing now would pin evidence to an unproven payment path.
- **Status:** ⏳ Queued behind Blocker 1.

## NOT blockers (re-confirmed)
- Real unmapped modules = 0 (29 accepted exclusions classified).
- Real orphan video assets = 0.
- High/critical security events in last 7d = 0.
- Stripe decommission, COMAR seed, SEC-001, UX-001 RequireAccess fix — shipped at HEAD.
