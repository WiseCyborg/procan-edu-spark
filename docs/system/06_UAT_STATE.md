# 06 — UAT State

## Live counts (read-only snapshot)

| Table | Rows | Meaning |
|-------|-----:|---------|
| `uat_task_templates` | **38** | Canonical steps testers walk through (seeded by the last migration) |
| `uat_runs` | 0 | No tester has started a run yet |
| `uat_tasks` | 0 | No per-run cloned tasks yet |
| `uat_evidence` | 0 | No pass/fail submissions yet |
| `uat_accounts` | 2 | Allowlisted testers (Louis + Dani) |

### Template breakdown by role

| `role_to_test` | Steps |
|----------------|------:|
| `public` | 8 |
| `dispensary_manager` | 10 |
| `employee` | 10 |
| `admin` | 10 |
| **Total** | **38** |

> Note: the seed uses role keys `public / dispensary_manager / employee / admin`. Earlier docs referenced `manager / student`. The form normalizes labels in the UI — verify the tabs in `UATFeedback.tsx` align with these four keys.

## Pages shipped

| Route | Component | Purpose |
|-------|-----------|---------|
| `/uat/feedback` | `UATFeedback` | **Primary tester form** — role tabs, per-step cards, Pass/Fail/Skip + notes + screenshot upload |
| `/uat/validation-checklist` | `UATValidationPage` | Older internal validation grid |
| `/uat/evidence` | `UATEvidenceSubmission` | Standalone evidence uploader |
| `/admin/uat-test-matrix` | `UATTestMatrix` | Admin overview of all runs |

## RPCs in play

| RPC | Purpose |
|-----|---------|
| `start_uat_run()` | Clones the 38 templates into `uat_tasks` for the caller's new run |
| `submit_uat_step(task_id, status, notes, evidence)` | Writes result + evidence row, updates run progress |

Both are `SECURITY DEFINER`, restricted to authenticated users whose email appears in `uat_accounts`.

## Hook & component layer

| File | Responsibility |
|------|----------------|
| `src/hooks/useUATRun.ts` | Run state, RPC mutations, TanStack Query keys |
| `src/components/uat/UATStepCard.tsx` | One step card (instructions, deep link, status, notes, upload) |
| `src/pages/uat/UATFeedback.tsx` | Page shell, role tabs, progress bar |

## Offline backup

`UAT_TESTER_CHECKLIST.pdf` (9 pages, mirrors the 38 steps with checkboxes + note lines). Useful for paper-trail testing or when the form is being edited.

## Reconciliation vs `LOVABLE_BUILD_PROMPT.md` (uploaded)

| Build-prompt item | Status |
|-------------------|--------|
| `uat_task_templates` table with check constraint on `role_to_test` | ✅ Shipped |
| RLS: authenticated SELECT, admin ALL | ✅ Shipped |
| Seed of ~40 canonical tasks | ✅ 38 shipped (close enough; deltas listed below) |
| `/uat/feedback` route | ✅ Shipped |
| Role tabs in form | ✅ Shipped |
| Pass/Fail/Skip + notes + screenshot upload | ✅ Shipped |
| `start_uat_run()` / `submit_uat_step()` RPCs | ✅ Shipped |
| PDF backup | ✅ `UAT_TESTER_CHECKLIST.pdf` |
| Step counts (PUB-10, MGR-10, EMP-10, ADM-10) | ⚠ Public is 8, not 10 — 2 steps short |
| Role keys `manager` / `student` in the original prompt | ⚠ Implemented as `dispensary_manager` / `employee` to match `app_role` enum |

## Recommended next moves

1. **Top up Public-Visitor steps from 8 → 10** to match the build-prompt promise.
2. **Confirm role-key labels** in `UATFeedback.tsx` match the seeded `role_to_test` values to avoid empty tabs.
3. **Smoke-test a real run end-to-end** with Louis's account — call `start_uat_run()`, submit one step per role, verify rows in `uat_tasks` + `uat_evidence`.
4. **Add a tiny admin view** on `/admin/uat-test-matrix` showing run completion % per tester (5 min of work, large clarity payoff).
