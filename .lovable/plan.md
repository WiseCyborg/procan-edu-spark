# Go-Live Blocker Audit — 2026-06-25

Live signals checked just now against the prod DB and the running preview:

| Signal | Value | Status |
|---|---|---|
| `course_entitlements` rows | 9 | ok (seeded) |
| `payment_events` rows | **0** | ❌ Gate 4 still unproven on real traffic |
| `system_jobs_deadletter` rows | **7** (new since cleanup) | ❌ regression |
| `course_modules` real unmapped | 0 (29 accepted exclusions) | ok |
| `video_assets` real orphans | 0 | ok |
| `comar_versions` rows | 1 | ok |
| `security_events` high/critical (7d) | 0 | ok |
| Console on `/` | `permission denied for table exam_attempts` every 30s | ❌ public-facing error |

Net: **four real blockers** between today and a clean 🟢 Production GO. Everything else from the prior Mission Control snapshot is still green.

---

## Blocker 1 — Gate 4: live PayPal capture never executed
**What it is.** `payment_events` is empty. We have synthetic regression coverage for `verify-payment-paypal` and `paypal-webhook`, plus the schema/grant fixes from the closeout, but no real capture has ever round-tripped: checkout → capture → `payment_events` row → `orders.paid_at` → `course_entitlements` row.

**Why it blocks.** Until one real capture lands, the only evidence the entitlement-grant path works end-to-end is synthetic. Mission Control's GO verdict was explicitly conditional on this single live transaction.

**Resolution path.**
1. Use the live PayPal account against a real (or production-mode sandbox) checkout from `/get-started`.
2. Verify in DB: one row each in `payment_events`, `orders` (with `paid_at` set), `course_entitlements` (source=`paypal`).
3. Verify in UI: the buyer's `/courses` shows the RVT course unlocked.
4. Capture screenshots + the four row IDs into `docs/audit/2026-07/evidence/gate4_live_capture_2026-06-25.md`.
5. If any step fails, the edge-function logs for `verify-payment-paypal` and `paypal-webhook` are the first stop — entitlement-write errors are no longer swallowed.

---

## Blocker 2 — Public landing page logs `permission denied for table exam_attempts`
**What it is.** `src/components/LiveActivityTicker.tsx` queries `exam_attempts` from the anon role on `/`. Console shows the 42501 error firing every 30s for every visitor.

**Why it blocks.** It's not a data leak (RLS denied the read), but it's a permanent red error in DevTools on the landing page during a conversion push. Anyone evaluating the platform sees a broken widget and a Postgres error string.

**Resolution path.** Pick one — both are surgical, frontend/edge-only:
- **A (preferred).** Replace the direct table read with a `SECURITY DEFINER` RPC (or edge function) that returns a count + recent-completion summary — no PII, no row access. Grant execute to `anon`.
- **B.** Hide the ticker on public routes; only render it once the user is authenticated.

Either way: re-load `/`, confirm console is clean.

---

## Blocker 3 — Deadletter regression: `seat_utilization_alert` jobs with no handler
**What it is.** 7 jobs of type `seat_utilization_alert` have piled up in `system_jobs_deadletter` since 2026-06-22, all with `last_error = "No handler for job type: seat_utilization_alert"`. A scheduler is still emitting them; the `jobs-processor` has no case for them.

**Why it blocks.** OPS-001 closeout claim was "deadletter = 0." It will drift back to hundreds within weeks and re-fire admin alerts on launch day.

**Resolution path.**
1. Find the emitter (cron entry or trigger that inserts `seat_utilization_alert` into `system_jobs`).
2. Decide: **implement** the handler (probably an org-level email when seat usage crosses a threshold) **or remove** the emitter if the alert isn't a real product requirement yet.
3. Purge the 7 existing DLQ rows.
4. Watch `jobs-processor` logs for 24h to confirm no recurrence.

---

## Blocker 4 — Evidence freeze + build tag never finalized
**What it is.** The Mission Control summary was updated to 🟢 GO on the prior commit, but the post-GO closeout (A1–A4: freeze evidence dir, tag the build with SHA, commit the UAT runbook, file UX-001 as closed) was paused when we shifted to the landing-page conversion pass.

**Why it blocks.** No frozen artifact = no defensible "we launched on this build" record. If anything regresses post-launch, there's no SHA-pinned baseline to diff against.

**Resolution path.**
1. Re-run Mission Control snapshot at current HEAD; write `docs/audit/2026-07/evidence/mission_control_summary_<today>.md`.
2. Mark prior `evidence/` directory read-only (rename to `frozen-<sha>/`).
3. Record current commit SHA + a one-line release note in `docs/audit/2026-07/RELEASE.md`.
4. Close UX-001 in the doc (RequireAccess fix already shipped — just needs verification line).

---

## Items checked and confirmed NOT blockers
- **Unmapped modules trust check** — DB says real=0, accepted_exclusions=29 (6 awaiting Louis, 1 orientation, 22 consumer text-only). My earlier ad-hoc query used a looser regex and reported 17; the canonical `count_unmapped_modules()` RPC is correct.
- **Orphan video assets** — 0 real, 4 accepted (storage-hosted orientation assets).
- **High/critical security events** — 0 in the last 7 days.
- **COMAR seed, Stripe decommission, SEC-001 role sweep, RequireAccess UX-001 fix** — all confirmed shipped at HEAD.

---

## Suggested execution order
1. Blocker 2 (10 min, pure frontend, removes a visible error during any demo).
2. Blocker 3 (30–60 min depending on whether we implement or remove the handler).
3. Blocker 1 (requires you to run the live checkout; I verify the DB rows after).
4. Blocker 4 (snapshot + freeze + tag, ~15 min, must be last so the frozen evidence reflects all three fixes).

After all four: 🟢 Production GO with frozen evidence pinned to a known SHA.

Tell me which one to start with — or "all four, in that order" and I'll work through them.
