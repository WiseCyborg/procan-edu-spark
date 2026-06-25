# Full Inefficiency Audit — ProCannEdu (read-only diagnostic)

**Date:** 2026-06-25 · **Mode:** Plan / read-only. No files changed.
**Method:** live DB introspection (`information_schema`, `pg_stat`, `storage`), latest `security_scan` (200 findings), and code grep across `src/` and `supabase/`. A codebase-sweep subagent (`sub_myhhf8jp`) is still running; incremental hits will be folded in on a follow-up turn.

---

## 0. TL;DR

The app is **not safe to take live as-is**, even though Mission Control reads green. Three classes of problem make the green light dishonest:

1. **Buyable courses with no content.** Three `courses` rows (Manager Compliance, Ganjier, Sommelier) are priced + `payment_required=true` and exported as first-class tracks in `src/constants/tracks.ts`, but each has **0 modules**. A buyer can pay and land on an empty player.
2. **Three published courses have most or all of their videos missing** (`video_url IS NULL`). A student can register, log in, hit "Start course," and reach a black box. RVT itself still has 5 NULLs.
3. **A runaway write loop on `user_journey_state`** — millions of redundant `UPDATE`s driven by an effect-dep cycle in `JourneyStateProvider` + `useJourneyState`. Largest single cost / latency driver.

Fix #1, #2, #3 (plus the 3 already-known Vimeo-only RVT modules) → user paths are launch-ready. Everything else here is real but doesn't block the first buyer.

---

## 1. Findings, ranked

Severity: **CRITICAL** (blocks today) → **HIGH** (blocks week 1) → **MEDIUM** (trust/support load) → **LOW** (cleanup).

### CRITICAL-1 — Phantom buyable courses with zero modules
- **Area:** Revenue + Learner.
- **Where:**
  - DB: `courses` rows `11111111-1111-4111-a111-111111111111` (Manager Compliance, $79.99), `22222222-2222-4222-a222-222222222222` (Ganjier, $99.99), `33333333-3333-4333-a333-333333333333` (Sommelier, $99.99). All `payment_required=true`; all `count(course_modules)=0`.
  - Code: `src/constants/tracks.ts:13/16/19` exports them as `TRACK_IDS.MANAGER / GANJIER / SOMMELIER`.
- **What's broken:** Buyer-direct path can charge, mint an entitlement, and drop the learner into an empty player. The recent pinning of invitations to canonical RVT (`paypal-webhook`, `accept-invitation`) does NOT cover a buyer who reaches one of these three SKUs directly.
- **Impact:** Money taken, nothing delivered → refunds, chargebacks, reputational.
- **Fix:** Either (a) flip `payment_required=false` and hide from any track/pricing surface until content exists, or (b) hard-delete the rows + prune `TRACK_IDS`. Add CI assert: `SELECT id FROM courses WHERE payment_required AND NOT EXISTS (SELECT 1 FROM course_modules WHERE course_id=courses.id)` must be empty.
- **Blocker:** **Yes.**

### CRITICAL-2 — Published courses with NULL `video_url`
- **Area:** Learner.
- **Counts (`course_modules.video_url IS NULL`):**
  | Course | NULL / Total |
  |---|---|
  | Cannabis 101 for Consumers | **10 / 10** |
  | First Time at a Dispensary | **8 / 8** |
  | Maryland Cannabis Laws | **4 / 4** |
  | Maryland RVT | **5 / 24** |
- **Impact:** Three of seven courses have zero playable video; RVT still has gaps. Issuing certs against empty modules is a regulator-facing trust risk.
- **Fix:** Mark the three "consumer" courses `is_published=false` (preferred) or import the missing assets; close the 5 RVT NULLs before launch.
- **Blocker:** **Yes** (for the four affected courses).

### CRITICAL-3 — Runaway write loop on `user_journey_state`
- **Area:** Performance / Cost / Stability.
- **Root cause:**
  - `src/hooks/useJourneyState.tsx`: `updateJourneyState` = `useCallback(..., [user, journeyState])`. Each write calls `setJourneyState(data)` → `journeyState` identity changes → `updateJourneyState` re-creates → all derived callbacks (`trackPageVisit`, `updateStep`, …) re-create.
  - `src/providers/JourneyStateProvider.tsx:27–34`: `useEffect(() => { trackPageVisit(location.pathname) }, [user, location.pathname, trackPageVisit])`. New `trackPageVisit` identity → effect re-fires → another write → another identity change → loop.
  - Plus `WelcomeModal`, `ManagerOnboarding`, `OnboardingSetup` each call `useJourneyState()` directly instead of `useJourneyStateContext()`, each spawning its own fetch.
- **Evidence:** `pg_stat_statements` shows `UPDATE public.user_journey_state` at the top of total time despite the table only having **9 rows / 9 users**. Mean per call ~0.4 ms; aggregate is the problem.
- **Impact:** Slow nav for end users, large Supabase bill, `last_activity_at` rendered useless for inactivity detection.
- **Fix:**
  1. Make `updateJourneyState` ref-stable: read `journeyState` via `useRef`, so identity never changes.
  2. Or hoist provider effect deps to `[user?.id, location.pathname]` and call the updater via ref.
  3. Throttle `trackPageVisit` to ≤ 1 write / 5 s per user.
  4. Switch the three consumers above to `useJourneyStateContext()`.
- **Blocker:** **Yes** — both for cost predictability and slow-network UX.

### CRITICAL-4 — Three RVT modules still depend on Vimeo (known)
- **Area:** Learner / Compliance.
- `course_modules.video_url ILIKE '%vimeo%'` → 3 rows in RVT (M16, M18, M21).
- **Fix:** Upload missing MP4s to `ProCannVideos`, repoint, re-checksum. Until then, mark those modules `is_published=false` so a cert can't be earned with a 403 in the middle.
- **Blocker:** **Yes** for RVT compliance.

---

### HIGH-1 — Two storage buckets, only one is real
- `storage.buckets`: `training-videos` (private, 1 obj, 0 bytes — stale) vs `ProCannVideos` (public, 21 obj, 1.6 GB — live). Code is split:
  - `src/pages/admin/VideoLibrary.tsx:28` reads `training-videos`.
  - `supabase/functions/get-video-url/index.ts:143` defaults to `training-videos` when `video_assets.bucket_id` is null.
  - `src/components/admin/VideoAssetManager.tsx:97–109` uploads to `ProCannVideos`.
  - Migration `20260608232705_*.sql` sets `bucket_id DEFAULT 'training-videos'`.
- **Impact:** Admin Video Library page shows an empty bucket; new uploads go to a different bucket than the EF resolves by default → quietly broken rows.
- **Fix:** Standardize on `ProCannVideos`. Change default, repoint admin page + EF. Delete the stale bucket.

### HIGH-2 — `ProCannVideos` bucket is publicly listable
- Security-scan warn `SUPA_public_bucket_allows_listing` on `ProCannVideos` and `profile-photos`. Anyone can `LIST` and download every training MP4 → curriculum is effectively free.
- **Fix:** Keep public-read for performance but **drop the public-LIST policy** on `storage.objects` for these buckets. Or move to private + signed URLs end-to-end (`get-video-url` already supports this).

### HIGH-3 — `system_jobs` and `compliance_alerts` are never pruned
- `system_jobs` = 67,216 rows / 40 MB. `compliance_alerts` = 68,513 rows / 18 MB.
- **Fix:** Cron — delete `system_jobs` `status='completed' AND finished_at < now()-30d`; archive `compliance_alerts > 90d` to JSONL in storage.

### HIGH-4 — 200 security-scan findings dominated by anon-executable SECURITY DEFINER functions
- Of 200 findings: vast majority `SUPA_anon_security_definer_function_executable`; remainder = `SUPA_rls_policy_always_true` (warn) and the two `SUPA_public_bucket_allows_listing` from HIGH-2.
- **Fix:** ~2-hr classification pass: for each definer function, decide (a) intentional public RPC, (b) authenticated only, (c) misconfigured. `REVOKE EXECUTE FROM anon` on (b)/(c). Capture as `docs/audit/2026-07/evidence/definer_function_matrix.md`.

### HIGH-5 — Mission Control aggregates trail the truth
- `get_launch_readiness()` reports against `launch_audit_runs`, **not** against content completeness. The 22 NULL `video_url`s in CRITICAL-2 do not flip any tile red. That's how we got here.
- **Fix:** Add a "Content completeness" check to the aggregator: any `payment_required` course whose modules contain a NULL `video_url` flips that course to red. Re-run Mission Control after the patch and **expect it to go red** until CRITICAL-1/2 are fixed; that's the proof the check is honest.

---

### MEDIUM-1 — `TRACK_IDS` leaks phantom IDs into the FE
Once CRITICAL-1 is closed, delete the constants; replace any consumer with a query on `courses WHERE is_published`.

### MEDIUM-2 — Per-component `useJourneyState()` instead of provider context
`WelcomeModal.tsx`, `ManagerOnboarding.tsx`, `OnboardingSetup.tsx` each call `useJourneyState()` (own fetch + own subscription) rather than `useJourneyStateContext()`. Same fix lane as CRITICAL-3.

### MEDIUM-3 — Overlapping email tables make resend ambiguous
`email_logs`, `email_outbox`, `email_events`, `email_analytics`, `notification_queue`, `notification_rules` all exist. Source of truth is unclear, so any resend UI is ambiguous.
- **Fix:** Pick one as canonical sender state (likely `email_outbox` + `email_events`); document the rest as derived/sinks.

### MEDIUM-4 — Only 1 row in `certificates`
Cert generation is essentially unverified at scale. Before launch, issue 25 synthetic certs in UAT, capture the PDFs as evidence, then revoke.

### MEDIUM-5 — Two RLS policies use `USING (true)` on write paths
`SUPA_rls_policy_always_true` (warn). Locate with `pg_policies WHERE qual='true' AND cmd IN ('UPDATE','DELETE','INSERT')` and tighten to role check.

### MEDIUM-6 — `payment_events` table is empty
Either unused or losing data. Prior PayPal fixes wrote here; current count is 0. **Action:** rerun a sandbox capture end-to-end and confirm a row lands. If not, audit `paypal-webhook` for swallowed insert errors.

---

### LOW-1 — `profile-photos` bucket is public + listable (minor PII enumeration).
### LOW-2 — Old migrations still insert the three phantom courses; add a removal migration once CRITICAL-1 is closed.
### LOW-3 — `useJourneyState.tsx` fetch effect depends on full `user` object instead of `user?.id` — churn on every auth refresh, even after CRITICAL-3 fix.
### LOW-4 — Hidden ≠ deleted: phantom course rows are a temptation for future UIs (same fix as CRITICAL-1).
### LOW-5 — Dead `VideoLibrary` bucket read (cleaned up alongside HIGH-1).

---

## 2. Per-journey summary

- **Revenue path** — CRITICAL-1 (wrong SKU sellable), CRITICAL-2 (entitlement to empty content), MEDIUM-4 (cert path under-tested), MEDIUM-6 (audit table empty). PayPal pipeline itself is healthy after the RVT pin; the failures are on either side.
- **Learner path** — CRITICAL-2 (NULL videos), CRITICAL-3 (laggy nav), CRITICAL-4 (Vimeo 403 mid-course), MEDIUM-2 (duplicate mount fetches), MEDIUM-4 (cert at scale).
- **Manager path** — CRITICAL-1 only if a manager can purchase "Manager Compliance Training" (currently exposed). Otherwise the seat-invitation flow is healthy.
- **Admin path** — HIGH-1 (wrong bucket in Video Library), HIGH-3 (queue bloat), HIGH-5 (false-green Mission Control), MEDIUM-3 (ambiguous resend).
- **Data integrity** — CRITICAL-1/2/4, HIGH-1, HIGH-3.
- **Performance** — CRITICAL-3 dominates; LOW-3 is the long tail.
- **Security** — HIGH-2 (bucket listing), HIGH-4 (anon-executable definers), MEDIUM-5 (over-permissive RLS), LOW-1. No service-role exposure observed in FE; recommend a confirmation grep `rg "SERVICE_ROLE|service_role" src`.
- **Operational readiness** — HIGH-3, HIGH-5, MEDIUM-3.

---

## 3. Fix-first list (in order)

1. **CRITICAL-1** — unpublish/delete phantom courses; prune `TRACK_IDS`. (~30 min + migration.)
2. **CRITICAL-2** — unpublish the three consumer courses OR import their videos; close the 5 RVT NULLs. (Content task — needs Louis.)
3. **CRITICAL-3** — stabilize `updateJourneyState` identity; throttle `trackPageVisit`; move consumers to context. (~1 hr.)
4. **CRITICAL-4** — upload missing RVT MP4s to `ProCannVideos`; repoint M16/M18/M21. (Content task.)
5. **HIGH-5** — add content-completeness check to `get_launch_readiness()` and re-run Mission Control to prove it goes red without the fixes. (~45 min.)

## 4. Can wait until after launch

HIGH-1, HIGH-2, HIGH-3, HIGH-4, MEDIUM-2, MEDIUM-3, MEDIUM-4, MEDIUM-5, MEDIUM-6, LOW-1…5.

## 5. Suggested build sequence

| Day | Work |
|---|---|
| **Day 0 AM** | CRITICAL-1 migration + FE prune. CRITICAL-3 patch. |
| **Day 0 PM** | HIGH-5 readiness aggregator change. Re-run Mission Control and confirm it goes **red** without the content fixes — proves honesty. |
| **Day 1** | Content team uploads missing MP4s; CRITICAL-2 + CRITICAL-4 close. Re-run Mission Control; expect 🟢. |
| **Day 2** | Full UAT (synthetic buyer + invited learner end-to-end). Evidence freeze + build tag. |
| **Week 1 post-launch** | HIGH-1, HIGH-2, HIGH-3, HIGH-4, then MEDIUM-* in priority order. |

## 6. Go / no-go recommendation

**🔴 NO-GO today.** All four CRITICAL items are real-user blockers, not theoretical:
- CRITICAL-1 and CRITICAL-2 would generate refunds within hours of any launch announcement.
- CRITICAL-3 would spike the Supabase bill under any real traffic.
- CRITICAL-4 is a compliance failure mid-certification.

**🟢 GO after the Fix-first list is closed and Mission Control re-runs green WITH the HIGH-5 honesty check active** — i.e., green because the new content-completeness rule passes, not because the rule doesn't exist yet.

---

*Generated read-only on 2026-06-25. No application code, DB rows, RLS policies, or storage objects were modified.*
