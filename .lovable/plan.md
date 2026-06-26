# Go-Live Blocker Closeout Plan

Full diagnostic lives at `.lovable/plan.md`. This is the actionable build sequence.

**Verdict today: 🔴 NO-GO.** Ten items must close before launch. Six are code/migration work I can do; four need Louis (content or external dashboards).

---

## Phase 1 — Stop the bleeding (Day 0 AM, ~2 hrs)

### 1. Kill the phantom RVT course ID in the FE *(CRITICAL-5)*
- `src/pages/TrainingHandbook.tsx:16` — replace literal `'76524ea8-…'` with `TRACKS.RVT_CORE`.
- `src/components/chat/ChatAssistant.tsx:17` — same fix.
- Add ESLint rule (or a `rg` CI check) that forbids hard-coded UUIDs outside `src/constants/tracks.ts`.

### 2. Unpublish the three phantom buyable courses *(CRITICAL-1)*
- Migration: `UPDATE courses SET payment_required=false, is_published=false WHERE id IN ('11111111-…','22222222-…','33333333-…')`.
- Remove `MANAGER / GANJIER / SOMMELIER` from `src/constants/tracks.ts`.
- Strip those constants from any consumer (grep first).
- Add CI assertion: `SELECT 1 FROM courses WHERE payment_required AND NOT EXISTS (SELECT 1 FROM course_modules WHERE course_id = courses.id)` must return zero.

### 3. Fix the NULL-`expires_at` invitation back-door *(CRITICAL-8)*
- `supabase/functions/accept-org-invite/index.ts` — treat NULL `expires_at` as expired.
- Migration: backfill any NULL `expires_at` in `org_invites` to `now() - 1 day`, then `ALTER COLUMN ... SET NOT NULL DEFAULT now()+interval '14 days'`.

---

## Phase 2 — Consolidate the dangerous duplicates (Day 0 PM, ~3 hrs)

### 4. One invitation system *(CRITICAL-7)*
- Keep: `staff_invitations` → `send-invitation-email` → `/accept-invitation` → `accept-invitation` EF → `allocate_seat_to_user` RPC (atomic).
- Retire: `org_invites` + `/accept-invite` + `accept-org-invite` EF + `AcceptInvite.tsx`.
- Migrate any open `org_invites` rows to `staff_invitations`.
- Add a `/accept-invite` → `/accept-invitation` redirect for stale links.

### 5. One certificate-issuance path *(CRITICAL-9)*
- `src/pages/Course/FinalExam.tsx:745` — replace direct `supabase.functions.invoke('generate-certificate', …)` with `useCertificateIssuance()` hook call.
- Add idempotency: hook short-circuits if `certificates` already has a row for `(user_id, course_id)`.
- Add audit-log write to `generate-certificate-retry/index.ts` *(HIGH-6)*.

### 6. Stripe column / webhook decommission *(CRITICAL-6)*
- Confirm with Louis there are no live Stripe webhook registrations.
- Migration: rename Stripe columns to `legacy_stripe_*` (don't drop — preserves history). One migration file, all six columns.
- Remove Stripe field references in any FE display.

---

## Phase 3 — Stop the runaway costs (Day 0 PM, ~1 hr)

### 7. Kill the `user_journey_state` write loop *(CRITICAL-3)*
- `src/hooks/useJourneyState.tsx` — convert `updateJourneyState` to read `journeyState` via `useRef` so its identity is stable; remove `journeyState` from the `useCallback` deps.
- `src/providers/JourneyStateProvider.tsx` — drop `trackPageVisit` from effect deps; depend only on `[user?.id, location.pathname]`.
- Add 5-second throttle on `trackPageVisit` per user.
- Switch `WelcomeModal.tsx`, `ManagerOnboarding.tsx`, `OnboardingSetup.tsx` from `useJourneyState()` to `useJourneyStateContext()` — eliminates per-mount fetches.

---

## Phase 4 — Mission Control honesty (Day 0 PM, ~1 hr)

### 8. Two new checks so the green light is truthful *(HIGH-5 + HIGH-8)*
- **Content completeness:** extend `get_launch_readiness()` to flip any `payment_required` course red when ANY of its modules has `video_url IS NULL`.
- **Snapshot staleness:** UI shows a yellow badge on every Mission Control tile when `v_pipeline_metrics.calculated_at > 15 min ago`; red when > 1 hr.
- Re-run Mission Control after deploy — **expect it to go red** until Phase 5 content lands. That is the proof the checks work.

---

## Phase 5 — Content (Day 1, Louis-owned)

### 9. Close the NULL `video_url` gaps *(CRITICAL-2)*
- Either mark the three consumer courses (`Cannabis 101`, `First Time at a Dispensary`, `Maryland Cannabis Laws`) `is_published=false` until videos exist, OR import the assets. Recommend hide-until-ready.
- Close the 5 RVT NULLs (M9, M11, others — Louis to confirm assets).

### 10. Eliminate Vimeo dependency *(CRITICAL-4)*
- Louis uploads MP4s for RVT M16, M18, M21 to `ProCannVideos`.
- Migration repoints `course_modules.video_url` to the new Supabase URLs; verifies checksums.

---

## Phase 6 — Validate & freeze (Day 2)

- Full UAT: synthetic buyer (PayPal sandbox) + invited learner end-to-end with all 24 RVT modules + cert issuance + verification.
- Re-run security scan — expect 0 CRITICAL, <5 HIGH; classify any HIGH-4 definer-function findings as accepted-public or fix.
- Capture evidence to `docs/audit/2026-07/evidence/golive_freeze_2026-06-27.md`.
- Tag the build.

---

## Deferred to Week 1 post-launch

- HIGH-1 storage-bucket consolidation (`training-videos` → `ProCannVideos` only)
- HIGH-2 drop public-LIST policy on `ProCannVideos` + `profile-photos`
- HIGH-3 queue pruning cron (`system_jobs`, `compliance_alerts`)
- HIGH-4 SECURITY DEFINER function matrix sweep
- HIGH-9/10 email retry hardening + DLQ tile in admin
- HIGH-11 rate-limit / token-signature hardening on `accept-invitation`
- HIGH-12 finish migrating remaining 13 RVT-UUID inlines to `TRACKS.RVT_CORE`
- HIGH-13/14 admin UX polish (retry-refresh, dup health panel)
- HIGH-15 dead-route cleanup (`/accept-invite`, dup `/system-health`, `/verify-certificate`)
- MED-/LOW-* per `.lovable/plan.md`

---

## Files this plan will touch (when approved)

**Frontend**
- `src/pages/TrainingHandbook.tsx`
- `src/components/chat/ChatAssistant.tsx`
- `src/constants/tracks.ts`
- `src/hooks/useJourneyState.tsx`
- `src/providers/JourneyStateProvider.tsx`
- `src/components/onboarding/WelcomeModal.tsx`
- `src/components/onboarding/ManagerOnboarding.tsx`
- `src/pages/OnboardingSetup.tsx`
- `src/pages/Course/FinalExam.tsx`
- `src/hooks/useCertificateIssuance.ts`
- `src/pages/AcceptInvite.tsx` *(delete)*
- `src/App.tsx` *(route cleanup + `/accept-invite` redirect)*
- `src/pages/admin/LaunchReadiness.tsx` *(staleness badge)*

**Edge functions**
- `supabase/functions/accept-org-invite/index.ts` *(deprecate or delete after migration)*
- `supabase/functions/accept-invitation/index.ts` *(absorb any unique logic)*
- `supabase/functions/generate-certificate-retry/index.ts` *(audit log write)*

**Migrations** (separate files via the migration tool, one per concern)
1. Unpublish phantom courses + add CI-style invariant comment.
2. Rename `stripe_*` columns → `legacy_stripe_*`.
3. Backfill + NOT NULL on `org_invites.expires_at` (if path chosen) OR drop table after migration.
4. Update `get_launch_readiness()` RPC for content-completeness check.

---

## What I need from you

- **Approval** to execute Phase 1–4 + 6 as a single rolling pass (I do not need a per-phase checkpoint).
- **Louis** for Phase 5 (the 5 RVT NULL videos + M16/M18/M21 MP4 uploads). I'll stub Phase 5 with hide-until-ready so the rest can ship if Louis is delayed.
- **One decision now:** for the three consumer courses (Cannabis 101 / First Time at a Dispensary / Maryland Cannabis Laws) — **hide-until-ready** (recommended) or **block launch until videos exist**?
