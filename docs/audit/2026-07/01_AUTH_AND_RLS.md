# Domain 1 — Authentication & Authorization (RLS)

## Posture summary

All 173 public tables have RLS enabled (project memory: `mem://infrastructure/database/column-name-standardization` + `docs/system/03_SCHEMA_AND_RLS.md`). The 7 sensitive table groups from the audit doc map as follows (see [00_TABLE_NAME_MAPPING.md](00_TABLE_NAME_MAPPING.md)):

| Table group | Policy posture | Enforcement |
|---|---|---|
| `profiles` / `profiles_private` | Owner-scoped: `auth.uid() = user_id`. Admin via `has_role('admin')`. | RLS + pgcrypto on `_private`. |
| `course_entitlements` | Owner read; INSERT/UPDATE only by admin/dispensary_manager/training_coordinator role; service_role for webhook. | RLS + role check + `(user_id, course_id) UNIQUE`. |
| `consumer_enrollments` | Owner read/write only; service_role for backend. | RLS. |
| `payments` / `orders` | Owner read; service_role write only (webhooks). | RLS + `stripe_session_id UNIQUE`, `transaction_id UNIQUE`. |
| `exam_attempts` / `user_progress` | Owner read/write; admin read all. | RLS. |
| `module_attestations` | Owner SELECT + INSERT; trainer/admin SELECT; no UPDATE/DELETE policy → append-only. | RLS + `(user_id, module_id) UNIQUE`. |
| `comar_versions` | Public SELECT (regulatory transparency); admin manage. | Intentional. |
| `admin_operations_audit` / `certificate_audit_log` | Admin SELECT only; INSERT only by admin role or service_role; no UPDATE/DELETE → immutable. | RLS. |

Complete `pg_policies` dump for these tables: [`evidence/rls_policies_dump.sql`](evidence/rls_policies_dump.sql).

## Test cases (negative-access)

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Authenticate as `test_student_A`. `select * from course_entitlements where user_id = '<student_B>'`. | 0 rows. | ✅ Owner policy filters. |
| 2 | Same student. `select * from payments where user_id = '<student_B>'`. | 0 rows. | ✅ |
| 3 | Authenticate as instructor (no `admin` role). Read `exam_attempts` of student outside their org. | 0 rows. | ✅ — instructor cannot see cross-org attempts. |
| 4 | Anonymous (no JWT). `select * from profiles`. | 401 / 0 rows depending on PostgREST setup. | ✅ — no anon GRANT on these tables. |
| 5 | Authenticated student attempts `update course_entitlements set status='active' where user_id=auth.uid()`. | RLS denies (only role-bearing users can write). | ✅ |
| 6 | Authenticated student attempts `delete from module_attestations where id=…`. | RLS denies — no DELETE policy exists for non-admins. | ✅ append-only. |

Transcripts: [`evidence/rls_negative_tests.md`](evidence/rls_negative_tests.md).

## Findings

| ID | Severity | Description | Recommendation |
|---|---|---|---|
| AUTH-01 | Info | `certificates` table has policy `Admins can view all certificates` granted to `public` role rather than `authenticated`. The body still checks `EXISTS user_roles … role='admin'`, so behavior is correct, but the role grant is wider than needed. | Re-scope policy to `authenticated`. |
| AUTH-02 | Info | `course_entitlements` policy `Service role can manage entitlements` checks `auth.jwt() ->> 'role' = 'service_role'` and is granted to `public`. Functionally equivalent to `TO service_role`, but inconsistent with other tables. | Standardize to `TO service_role`. |

No critical/high findings.

## Success criteria

| Criterion | Status |
|---|---|
| All sensitive tables have RLS enabled & enforced at DB layer | ✅ |
| Zero cross-student data leakage in negative tests | ✅ |
| Anonymous users blocked | ✅ |
| Student cannot self-grant entitlement | ✅ |
