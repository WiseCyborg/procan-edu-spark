
# Pre-Sunday UAT Readiness Plan (Dani + Louis)

Goal: everything that does **not** depend on Friday's Supabase spend-cap upgrade gets shipped by Saturday so Dani and Louis have a clean, end-to-end testable platform on Sunday.

## Status snapshot

- ✅ Security scan: 0 open findings (just fixed `courses` + `video_assets` RLS)
- ✅ Video infrastructure built (`get-video-url`, `SecureVideoPlayer`, `/admin/video-library`, encoding runbook)
- ⏳ Vimeo → private bucket migration: **blocked on Friday spend-cap upgrade** (Phases 1–6 in `.lovable/plan.md`)
- ❓ UAT account for Dani: not yet provisioned (per `docs/UAT_TESTER_GUIDE.md`)
- ❓ Auto-regression cron: Vault secret install pending (known issue in tester guide)

## What we ship before Sunday (no spend-cap dependency)

### 1. Provision & verify both tester accounts
- Confirm Louis (`louis@hendrickscompliance.com`) can log in, lands on `/admin`, has full admin role via `user_roles`.
- Create Dani's admin account + send invite via existing `/accept-invitation` flow. Capture credentials in the tester guide.
- Run `get_access_snapshot` for both to confirm admin scope.

### 2. Run the full UAT harness once, fix anything red
- Open `/admin` → Operations Command Center → Regression tab → **Run E2E Validation**.
- Expect `SHIPPABLE`. Any non-green check gets a same-day fix or a documented "known issue" entry in `docs/system/07_KNOWN_ISSUES_AND_GAPS.md`.
- Run `useUATRun` matrix end-to-end (application → approval → seat purchase → invite → training → exam → certificate → verify).

### 3. Install the auto-regression Vault secret (1 SQL call)
Removes the only "known issue" blocker in the tester guide so the nightly regression cron runs while Dani/Louis are testing and surfaces regressions automatically.

### 4. Seed a clean UAT dataset
- 1 approved test dispensary, 2 seats purchased (Stripe test mode), 1 invited employee mid-training, 1 employee with a passed exam + issued cert, 1 expired cert ready for renewal flow.
- Gives Dani/Louis something to *look at* on day one instead of an empty DB (addresses the "LiveActivityTicker is quiet on fresh DB" caveat).

### 5. Tester guide refresh
- Update `docs/UAT_TESTER_GUIDE.md` with Dani's row, Sunday start date, and the new seeded-data section.
- Add a one-page "what's not testable until Monday" callout for the Vimeo-hosted training videos (they still play via Vimeo this weekend — fully functional, just not yet on our private bucket).

### 6. Bug intake channel sanity check
- Verify `bugs@procannedu.com` actually delivers (send a test through the email outbox monitor).
- Confirm `/uat/feedback` page (`UATFeedback.tsx`) submits and writes to `uat_evidence`.

## What stays on Friday/post-Friday

- Vimeo → `training-videos` bucket migration (Phases 1–6 in `.lovable/plan.md`) — needs spend cap raised first.
- Decommission of `ProCannVideos` bucket.
- Removal of Vimeo legacy player branches.

**Important:** none of the above blocks Sunday UAT. The current Vimeo-embedded players work; Dani and Louis can fully exercise training, exams, certificates, manager flows, and admin tools this weekend.

## Suggested execution order (build mode)

```text
Step 1  Provision Dani + verify Louis            (~15 min)
Step 2  Install regression Vault secret          (~5 min, 1 migration)
Step 3  Seed UAT dataset                         (~30 min, one-shot edge function)
Step 4  Run full regression + triage             (~45 min)
Step 5  Refresh UAT tester guide                 (~10 min)
Step 6  Smoke-test bug intake + feedback page    (~10 min)
                                       Total: ~2 hrs
```

## Open questions before I switch to build mode

1. Do you have Dani's email address yet, or should I leave a placeholder in the tester guide and you'll invite her manually?
2. For the seeded dataset, do you want real-looking org names (e.g., "Sunrise Wellness MD") or obviously-fake (`UAT Test Dispensary 1`)?
3. Should I gate the seeded data behind a feature flag so it's easy to wipe after UAT, or just leave it in the DB and clean up Monday?
