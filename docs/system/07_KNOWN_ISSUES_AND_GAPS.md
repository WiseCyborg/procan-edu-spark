# 07 — Known Issues, Gaps & Next-Step Ranking

## Open structural risks

| # | Area | Risk | Suggested fix | Effort |
|---|------|------|---------------|--------|
| 1 | **Route guards** | Admin/manager routes use only `ProtectedRoute` — protection lives inside each page. One missed `has_role` check exposes admin tooling. | Add `<AdminRoute>`, `<ManagerRoute>` declarative guards using `useAccess()`. | S |
| 2 | **Edge-function `verify_jwt` coverage** | 37 functions lack an explicit `verify_jwt` line in `config.toml`. Default is secure, but posture isn't auditable in one file. | Add explicit declarations for all 210. | S |
| 3 | **Duplicate `/system-health` route** | Declared public *and* protected. Last wins. | Pick one and delete the other. | XS |
| 4 | **Chatbot has no per-user memory** | Each session starts blank; voice and text don't share history. | New `chat_memory` table + retrieval in prompt step 4. | M |
| 5 | **UAT public tab seeded with 8 not 10 steps** | Promise vs delivery delta. | Insert 2 more `PUB-*` templates. | XS |
| 6 | **No `/admin/visibility` live dashboard** | This pack is a snapshot; will go stale. | Build the read-only page (tables, policy counts, edge-fn list, UAT live stats). | M |

## Operational debt

- **Cron job observability.** `cron_job_executions` exists but there's no UI surface; failed jobs are easy to miss.
- **Email circuit breaker UX.** `email_circuit_breaker` trips silently; coordinators see "email didn't arrive" reports with no signal.
- **Seat-to-entitlement automation.** Working, but only logged via trigger; an admin dashboard showing "last 50 trigger fires" would short-circuit a class of support tickets.
- **Storage policies.** `mock-certificate-photos`, `compliance`, `call-recordings` need a recurring audit — recommend a quarterly scripted check.

## Security follow-ups (high-level)

Run `security--run_security_scan` on demand for the live list. Recurring themes from the most recent scans (per `PIPELINE_FIX_SUMMARY.md` and `docs/SECURITY_FIX_IMPLEMENTATION.md`):

1. Confirm all SECURITY DEFINER functions have `SET search_path = public` (project rule — should be 100%).
2. Confirm no `*_audit_log` table is writable by `authenticated` directly.
3. Confirm `service_role` GRANTs exist on every table touched by edge functions.

## Four initiatives ranked

Pulled from prior strategic discussion:

| Rank | Initiative | What it unlocks | Effort | Dependencies |
|------|-----------|-----------------|--------|--------------|
| 1 | **UAT Control Center** (`/admin/uat-test-matrix` upgrade) | Single page showing all runs, % done per tester, evidence quick-view | S–M | None — tables already exist |
| 2 | **Security Visibility Dashboard** (`/admin/visibility`) | Live route map, RLS posture, edge-fn inventory, linter status | M | Read-only RPCs over `pg_*` |
| 3 | **Operational Readiness Layer** | Cron health, email circuit, seat-trigger audit on one screen | M | Already-collected metrics |
| 4 | **AI Support Agent v2** (memory + tool-calling) | Bot can answer "where am I in the course?" using RPCs, remembers across sessions | L | Memory table + tool-use schema |

## Regenerating this pack

Today this pack is hand-assembled from live introspection. To re-run:

1. Re-read `src/App.tsx` for the route list.
2. Run the four SQL probes used here (`pg_tables`, `pg_policies`, `pg_proc`, `uat_*` counts).
3. Re-list `supabase/functions/` and re-count `verify_jwt` in `supabase/config.toml`.
4. Rebuild `/mnt/documents/PROCANNEDU_SYSTEM_VISIBILITY.pdf` from these markdown files.

A formal generator script (`scripts/generate-system-pack.ts`) was scoped in the plan but deferred — it becomes worthwhile only once the live dashboard (#2 above) is in place.
