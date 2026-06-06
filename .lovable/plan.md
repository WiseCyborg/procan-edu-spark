# UAT Tester Form — Step-by-Step Checklist (All Roles)

Both testers (Louis & Dani) will run through every role. We already have `uat_runs`, `uat_tasks`, and `uat_evidence` tables — we'll seed them with a canonical task catalog and build a dedicated tester page on top.

## Scope

**Roles covered** (each tester runs all four):
1. **Public Visitor** — marketing site, signup, certificate verification
2. **Org Manager** — org setup, seat purchase, invites, dashboards, compliance
3. **Employee / Student** — accept invite, profile, courses, exam, certificate
4. **Platform Admin** — admin console, approvals, mission control, audit

**Detail level: 3/5** — ~8–12 steps per role (medium), each step has: action, deep link, expected result, pass/fail, notes, optional screenshot.

## Deliverables

### 1. Seed task catalog (migration + seed)
Insert ~40 canonical `uat_tasks` rows (one template run per tester) grouped by `role_to_test`. Each row: `task_code`, `title`, `description` (the step instructions), `role_to_test`, `deep_link`, `expected_result`, `priority`.

Example task codes:
- `PUB-01` Visit homepage and verify hero loads
- `PUB-02` Submit contact form → check confirmation email
- `PUB-03` Verify a known certificate via QR/code
- `MGR-01` Sign in as Louis, land on org dashboard
- `MGR-02` Purchase seats (Stripe test mode)
- `MGR-03` Invite an employee → email delivered
- `MGR-04` Assign a course to a seat
- `STU-01` Accept invite via email link
- `STU-02` Complete profile to 100%
- `STU-03` Start course, complete module, verify resume state
- `STU-04` Take exam, pass, receive certificate
- `ADM-01` Approve a pending org application
- `ADM-02` Reset a user's exam state
- `ADM-03` Verify mission control metrics match DB

### 2. In-app tester form — `/uat/feedback`
A new authenticated page only visible to users in `uat_accounts`:
- **Header**: tester name, current run code, progress (e.g. "12 / 38 complete"), "Start New Run" button
- **Role tabs**: Public · Manager · Student · Admin
- **Per-step card**: title, instructions, "Open deep link" button, expected result, Pass/Fail/Skip toggle, notes textarea, optional screenshot upload (Supabase storage), auto-save on blur
- **Submit run** button at the bottom → marks `uat_runs.status='completed'`, computes summary metrics (pass rate per role), and emails a summary to admin
- Writes to existing `uat_tasks` (status, completed_by, completed_at, evidence) and `uat_evidence` (one row per step with screenshot/notes)

Reuses: `react-hook-form` + `zod`, `RequireAccess`, TanStack Query, existing storage bucket pattern.

### 3. Printable PDF backup
Extend the existing UAT PDF generator (`/tmp/make_uat_pdf.py`) to produce `UAT_TESTER_CHECKLIST.pdf`:
- One section per role with numbered steps, expected result, and a checkbox + notes line per step
- Same content as the in-app form so a tester can do it offline and transcribe later
- Saved to `/mnt/documents/UAT_TESTER_CHECKLIST.pdf` with QA pass via `pdftoppm`

## Technical details

### Database
- **No schema changes.** Use existing tables.
- One migration to **seed the canonical task catalog** as a reusable template (insert into `uat_tasks` with `run_id = NULL` acting as templates, or into a new lightweight `uat_task_templates` if we prefer to keep template vs run rows separate — recommend the latter, single small table).
- RPC `start_uat_run(tester_user_id)` → inserts a `uat_runs` row and clones template tasks into `uat_tasks` for that run.
- RPC `submit_uat_step(task_id, status, notes, evidence_path)` → updates `uat_tasks` + inserts `uat_evidence`.

### Frontend
```
src/pages/uat/UATFeedback.tsx        # main page, tabs per role
src/components/uat/UATStepCard.tsx   # single step row
src/components/uat/UATRunHeader.tsx  # progress + run controls
src/hooks/useUATRun.ts                # fetch/start run, mutations
```
Route added under `App.tsx` guarded by `RequireAccess` + `uat_accounts` check.

### PDF
Extend existing reportlab script. Render four `Heading1` sections; per step use a Paragraph with `☐` glyph (Helvetica supports it) + notes underline. QA with `pdftoppm -jpeg -r 150`.

## Out of scope
- Mobile-specific UI polish (works responsive but not redesigned for phone)
- Auto-screenshot capture (testers upload manually)
- Re-running individual failed steps without starting a fresh run (can add later)

## Approval needed
Confirm the role list (4 roles above) and that seeding ~40 steps total is the right granularity, then I'll switch to build mode and ship migration + page + PDF together.
