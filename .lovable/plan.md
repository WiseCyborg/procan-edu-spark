# System Visibility Pack

Deliver one authoritative snapshot of the implementation state so an external lead (or you) can audit ProCannEdu without guessing. Output is generated from real artifacts: the React route tree, Supabase schema/RLS via `pg_catalog`, edge function directory, and current UAT tables.

## What gets produced

1. **`/mnt/documents/PROCANNEDU_SYSTEM_VISIBILITY.pdf`** — single shareable PDF, ~25–40 pages.
2. **`/docs/system/` markdown bundle** in the repo, diffable per release:
   - `01_ROUTE_MAP.md`
   - `02_ROLES_MATRIX.md`
   - `03_SCHEMA_AND_RLS.md`
   - `04_EDGE_FUNCTIONS.md`
   - `05_CHATBOT_ARCHITECTURE.md`
   - `06_UAT_STATE.md`
   - `07_KNOWN_ISSUES_AND_GAPS.md`
   - `README.md` (index + how to regenerate)
3. **`scripts/generate-system-pack.ts`** — re-runnable generator so the pack stays current.

## Section contents

### 1. Route map
Parsed from `src/App.tsx`. For each route: path, page component, guard (`ProtectedRouteGuard`, `AdminRouteGuard`, `ManagerGuard`, `CoordinatorGuard`, `MemberTypeGuard`, `RequireAccess`), allowed roles/member types, and a one-line purpose. Grouped: Public, Auth, Student, Manager, Coordinator, Admin, UAT, Compliance.

### 2. Roles & permissions matrix
Three layers documented side-by-side:
- **Supabase Auth** — anonymous vs authenticated.
- **`organization_members.member_type`** — employee / coordinator / manager / owner.
- **`user_roles.role`** — student / dispensary_manager / training_coordinator / admin / trainer / consumer / mca_inspector.

Plus the `role_permissions` table (admin permission flags) and the `get_access_snapshot` RPC output fields. Cross-table matrix: Role × (page access, course access, admin tools, billing, audit log, chatbot scope).

### 3. Schema & RLS
Auto-extracted from `information_schema` + `pg_policies`:
- All ~170 public tables grouped by domain (Auth & Identity, Training, Certificates, Exams, Payments, Comms, UAT, Ops/Health, AI/Agents, Compliance).
- Per table: columns + types, FK targets, RLS on/off, policy names + USING/WITH CHECK expressions, GRANTs.
- Dedicated subsection for `SECURITY DEFINER` functions (`has_role`, `get_access_snapshot`, `start_uat_run`, `submit_uat_step`, etc.) with signature and purpose.
- Storage buckets and their policies.

### 4. Edge functions
Enumerated from `supabase/functions/`. Per function: name, `verify_jwt` setting (from `config.toml`), purpose, secrets it reads, callers in the frontend. Highlights public vs authenticated functions.

### 5. Chatbot architecture
Traced from `InternalChatbot.tsx` + `internal-chat-assistant` edge function:
- Provider (Lovable AI Gateway / model), prompt assembly, role + page context injected, conversation history window, escalation path via `RequestSupportButton`, persistence (or lack thereof).
- Gaps: no long-term memory, no progress-tracking yet, no role-scoped tool calls.

### 6. UAT state
Live snapshot of current tables:
- `uat_task_templates` (36 seeded steps × 4 roles)
- `uat_runs`, `uat_tasks`, `uat_evidence` row counts
- Status of `/uat/feedback` page, `start_uat_run` / `submit_uat_step` RPCs
- `uat_accounts` allowlist
- Existing artifacts: `UAT_TESTER_CHECKLIST.pdf`, `docs/UAT_TESTER_GUIDE.md`
- Reconciliation table: uploaded `LOVABLE_BUILD_PROMPT.md` items → "Already shipped" / "Delta to apply" / "Out of scope".

### 7. Known issues & gaps
Pulled from `PIPELINE_FIX_SUMMARY.md`, `docs/SECURITY_FIX_IMPLEMENTATION.md`, recent migrations, and Supabase linter output. Plus the four next-step initiatives from your message (UAT Control Center, Operational Readiness Layer, Security Visibility Dashboard, AI Support Agent) ranked with effort estimates.

## Technical approach

```text
scripts/generate-system-pack.ts
  ├─ parseRoutes(src/App.tsx)            → 01_ROUTE_MAP.md
  ├─ parseGuards + role_permissions      → 02_ROLES_MATRIX.md
  ├─ psql introspection                  → 03_SCHEMA_AND_RLS.md
  │     • information_schema.columns
  │     • pg_policies
  │     • pg_proc (SECURITY DEFINER)
  │     • storage.buckets + policies
  ├─ scan supabase/functions/* + config  → 04_EDGE_FUNCTIONS.md
  ├─ trace chatbot files                 → 05_CHATBOT_ARCHITECTURE.md
  ├─ query uat_* tables                  → 06_UAT_STATE.md
  └─ collate fix summaries + linter      → 07_KNOWN_ISSUES_AND_GAPS.md

python3 /tmp/make_visibility_pdf.py
  → /mnt/documents/PROCANNEDU_SYSTEM_VISIBILITY.pdf
  (reportlab; QA via pdftoppm)
```

The generator runs read-only — no migrations, no schema changes. PDF is rebuilt from the markdown so the two stay in sync.

## Open decisions (please pick before I switch to build mode)

1. **Sensitivity** — include real row counts, org names, and recent UAT activity, or keep it structure-only so it's safe to share with outside reviewers?
2. **Depth of schema section** — summary (table + RLS flag), medium (+ every policy expression), or full (+ all columns, FKs, triggers, SECURITY DEFINER bodies)? Full will push the PDF to ~80 pages.
3. **Live dashboard** — also build `/admin/visibility` that renders all of this from real data on demand? Adds ~1 extra build step but means no more stale PDFs.

Once you confirm those three, I'll switch to build mode and ship the markdown + PDF in one pass.
