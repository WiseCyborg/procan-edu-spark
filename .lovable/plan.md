# Fix the 9 listed gaps — reality-checked against the real schema

The uploaded `07_KNOWN_ISSUES_AND_GAPS.md` was written against a simplified, partially-imagined version of this app. Before implementing anything I mapped every gap to the live database and codebase.

## Gap-by-gap reconciliation

| # | Uploaded gap | Real status | Action |
|---|---|---|---|
| 1 | `has_role()` deploy order | `has_role` exists and is widely used. No deploy-order bug in current code. | **Skip** — non-issue. |
| 2 | Cert PDF generation has no retry, `pdf_path` stays NULL silently | Real column is `pdf_url`. A `generate-certificate-retry` edge function already exists. What's missing: a persistent error row + admin visibility when both attempts fail. | **Fix (light)** — add `certificate_generation_errors` table + write a row on final failure in `generate-certificate` / `generate-certificate-retry`. |
| 3 | `stripe-webhook` has no idempotency on `stripe_events` | Table is `payment_events` (already has `UNIQUE(stripe_event_id)`). Webhook uses an **in-memory Set** for idempotency — lost on every cold start, so duplicate Stripe retries CAN double-process. | **Fix** — replace the in-memory check with a DB lookup against `payment_events.stripe_event_id` before processing; rely on the existing unique index. |
| 4 | `chat_sessions` / `chat_messages` never persisted | **Neither table exists.** Fabricated against an imagined schema. The real internal chatbot is stateless by design. | **Skip** — non-applicable. Persisting chat is a feature, not a bug fix; out of scope here. |
| 5 | `exam_answers` not deleted on reset | **`exam_answers` table does not exist.** Answers live inside `exam_attempts` JSONB. `reset_exam_state` RPC already exists. | **Skip** — non-applicable. |
| 6 | `compliance_records` refresh is nightly | **`compliance_records` table does not exist.** Real tables are `compliance_metrics`, `compliance_alerts`, `compliance_incidents`; certificate issuance already updates them via triggers. | **Skip** — non-applicable. |
| 7 | `uat-screenshots` bucket policy unverified | Storage-dashboard check, not a code change. | **Skip in code** — note it in `docs/system/07_KNOWN_ISSUES_AND_GAPS.md` as an env-verification task. |
| 8 | `profile_complete` vs `completeness_pct` mismatch | **Neither column exists on `profiles`.** Completeness is computed via a different mechanism (`useProfileCompletion`). | **Skip** — non-applicable. |
| 9 | `audit_log` missing indexes | **`audit_log` does not exist.** Real tables are `admin_operations_audit`, `security_audit_log`, `certificate_audit_log`. Quick check shows these have PK + a couple of single-column indexes but no `(user_id, created_at)` composite. | **Fix** — add composite indexes on the three real audit tables to keep admin filters fast. |

**Net: 3 actionable fixes (gaps 2, 3, 9), 6 not applicable.**

## What I will implement

### 1. Stripe webhook persistent idempotency (gap 3)
In `supabase/functions/stripe-webhook/index.ts`:
- Remove the `processedEvents` in-memory Set.
- Before the switch, `SELECT id, status FROM payment_events WHERE stripe_event_id = $1`. If the row exists with `status IN ('completed','processing')`, return `{received:true, skipped:true}` immediately.
- Change the initial insert to use `.upsert({...}, { onConflict: 'stripe_event_id', ignoreDuplicates: true })` so concurrent retries can't both insert.
- No schema change required (unique index already exists).

### 2. Certificate generation error log (gap 2)
- **Migration:** create `public.certificate_generation_errors(id, certificate_id, user_id, course_id, attempt_number, error_message, error_detail jsonb, created_at)` with GRANTs + RLS (admin read, service_role all).
- In `generate-certificate` and `generate-certificate-retry`, when the final attempt fails, insert one row before returning the error response. Existing happy paths untouched.
- Surface in the admin UI later (out of scope here — log only, no UI).

### 3. Audit-log composite indexes (gap 9)
- **Migration:** `CREATE INDEX CONCURRENTLY IF NOT EXISTS` on:
  - `admin_operations_audit (admin_user_id, created_at DESC)`
  - `security_audit_log (user_id, created_at DESC)` and `(event_type, created_at DESC)`
  - `certificate_audit_log (action, created_at DESC)`
- Read-only impact, no policy changes.

### 4. Update `docs/system/07_KNOWN_ISSUES_AND_GAPS.md`
Replace the fabricated-table entries with this reconciled table so the doc reflects reality, and mark gaps 2/3/9 as fixed once the migrations land.

## Out of scope (explicit)
- Persisting chatbot conversations (gap 4) — that's a product feature, ask separately if you want it built.
- Storage bucket dashboard verification (gap 7) — manual step in Supabase.
- Any change involving `chat_sessions`, `chat_messages`, `exam_answers`, `compliance_records`, `audit_log`, `profile_complete`, `completeness_pct` — none of these exist.

## Technical notes
- All schema changes go through `supabase--migration` (single migration with `CREATE TABLE` + `GRANT` + `ENABLE RLS` + `CREATE POLICY` for the new errors table; separate index migration for gap 9).
- Stripe webhook change is a small in-file refactor; will deploy via `supabase--deploy_edge_functions` after edit.
- No changes to frontend code.