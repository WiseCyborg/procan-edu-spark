## Parallel plan — email tests today + Levels audit pack this week

### Track 1: Email test matrix (today)

Send 3 templates × 6 aliases = **18 real sends** via existing `email-router` → Resend, then return a results table.

- Recipients: `bugs@`, `danielle@`, `louis@`, `support@`, `william@`, `info@` `procannedu.com`
- Templates (already wired): welcome, certificate-issued, employee-invitation
- For each send, capture: Resend `provider_id`, status, timestamp, error if any
- After sends, query `email_logs` (dedup by id) and post a single table in chat
- One attempt per cell — no retries — so the report reflects reality. You forward to Danielle/Louis to confirm inbox arrival; Resend `sent` only proves handoff, not inbox delivery (especially for GoDaddy-forwarded aliases)

### Track 2: Launch readiness audit pack (deliverable by June 20)

Deliverable location: `docs/launch-audit/` — one folder per domain, plus a top-level `00_TABLE_NAME_MAPPING.md` so Levels can read their doc against our schema.

**Table name mapping (Levels → ours)**
| Levels' name | Our table |
|---|---|
| `enrollments` | `course_entitlements` (+ `consumer_enrollments` for consumer track) |
| `payments` | `payments` + `payment_events` + `orders` |
| `user_profiles` | `profiles` (+ `profiles_private` for PII) |
| `quiz_results` | `exam_attempts` + `exam_topic_scores` |
| `video_progress` | `user_progress` + `course_resume_state` |
| `comar_compliance_records` | `comar_versions` + `compliance_incidents` + `compliance_metrics` + `regulatory_content` |
| `video_access_log` | `admin_operations_audit` (URL signing events; we don't currently log every video request — gap to flag) |

**Domain 1 — RLS (`docs/launch-audit/01_rls/`)**
- `policies.sql` — full RLS policy dump for the mapped tables via `pg_policies`
- `grants.sql` — GRANT statements per table
- `test-script.ts` — Deno script that logs in as 3 personas (student A, student B, admin) and runs each cross-access query; writes `results.md` with pass/fail per case
- Run against preview Supabase, paste results

**Domain 2 — Payment integrity (`docs/launch-audit/02_payments/`)**
- `webhook-handler.md` — link + extracted source of `stripe-webhook` edge function with idempotency notes (see `mem://infrastructure/payments/unified-stripe-webhook-logic`)
- `state-machine.md` — pending → paid → entitlement-issued → active, with the trigger that auto-mints `course_entitlements`
- `scenarios.md` — manual replay results for: A (normal), B (duplicate webhook), C (frontend-late), D (handler failure + Stripe retry). Use Stripe CLI `trigger` or replay an existing event ID against the preview webhook
- Schema excerpt for `payments`, `payment_events`, `orders`, `course_entitlements`

**Domain 3 — Email verification (`docs/launch-audit/03_email/`)**
- Token gen/validation code excerpt (`email_verification_codes` table) with crypto-random proof, 24h expiry, one-time-use enforcement
- Resend domain verification screenshot + DNS check output (`dig TXT procannedu.com` for SPF/DKIM/DMARC)
- Brute-force test result (10 random tokens via curl), reuse test, expired-token test
- **Gap to flag honestly:** current token length and rate-limit posture — if it doesn't meet the 32-char/5-per-hour bar in the doc, list it as a finding, not paper over

**Domain 4 — Video access control (`docs/launch-audit/04_video/`)**
- `get-video-url` edge function source + 1h signed URL expiry config
- Storage bucket policy dump for `ProCannVideos` (currently public per `03_SCHEMA_AND_RLS.md` — **major gap to flag**; recommend flipping to private + signed-URL-only before launch)
- Cross-student URL test, expired URL test, direct bucket access test, RLS bypass attempt

**Domain 5 — Data governance (`docs/launch-audit/05_governance/`)**
- Schema diagram (auto-generated from `pg_catalog`)
- Retention policy doc — what we keep, how long, what's anonymized
- PII audit — confirm no PAN/SSN plaintext; `profiles_private` uses pgcrypto `encrypt_pii`/`decrypt_pii`
- Admin access trail — `admin_operations_audit`, `certificate_audit_log`, `payment_audit_log`, `security_audit_log` shown as immutable append-only
- Backup/DR — note Supabase managed backups; flag if no recent restore test

**Deliverables to Levels**
- Single PDF compiled from the markdown in `docs/launch-audit/` (I'll generate via the artifact pipeline)
- Raw evidence files alongside

### Sequence
1. Run Track 1 sends → return results table in chat (~5 min)
2. Start Track 2 with Domain 1 (RLS dump + test script) → post when ready
3. Domains 2–5 in subsequent passes, prioritizing the gaps I expect to find: public video bucket, video access log coverage, email token strength/rate limit

### Explicitly out of scope
- Changing any RLS, payment, or video code as part of the audit — audit first, fix in a separate plan after we see findings
- New backend infra
- Anything outside the 5 domains in the handover
