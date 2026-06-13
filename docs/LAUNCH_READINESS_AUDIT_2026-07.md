# ProCann Edu — Launch Readiness Audit (July 1, 2026)

**Prepared by:** Lovable (codebase + database evidence)
**Owner:** Will Cunningham (BCIT)
**Verifier:** Levels (production)
**Lovable deliverables due:** June 20, 2026
**Levels verification due:** June 27, 2026

## Scope

Five domains: Auth/RLS · Payment integrity · Email verification · Video access control · Data governance.

## Per-domain status (high level)

| Domain | Status | Notes |
|---|---|---|
| 1. Auth & RLS | ✅ Pass with notes | All 7 sensitive table groups RLS-enforced via `has_role()` + `auth.uid()`. See [01](audit/2026-07/01_AUTH_AND_RLS.md). |
| 2. Payment integrity | ⚠️ Map first | Production processor is **PayPal**, not Stripe. Stripe only services dispensary applications. See [02](audit/2026-07/02_PAYMENT_INTEGRITY.md). |
| 3. Email verification | ✅ Pass with notes | `email_verification_codes` w/ `expires_at`. Resend reply_to consolidated to `info@`. See [03](audit/2026-07/03_EMAIL_VERIFICATION.md). |
| 4. Video access control | ✅ Pass | 10-minute signed URLs, server-side `course_entitlements` gate. See [04](audit/2026-07/04_VIDEO_ACCESS_CONTROL.md). |
| 5. Data governance | ✅ Pass with notes | PII in `profiles_private` is pgcrypto-encrypted. Passwords in `auth.users` (bcrypt, Supabase-managed). See [05](audit/2026-07/05_DATA_GOVERNANCE.md). |
| 6. Chatbot architecture | ❌ **Conditional — 1 blocker** | `CHATBOT-SEC-01`: partial system-prompt leak via injection (live-reproduced 2026-06-13). 2 medium accuracy issues (RVT price, current date). See [06](audit/2026-07/06_CHATBOT_ARCHITECTURE.md). |

## Documents

- [Table name mapping](audit/2026-07/00_TABLE_NAME_MAPPING.md)
- [Domain 1 — Auth & RLS](audit/2026-07/01_AUTH_AND_RLS.md)
- [Domain 2 — Payment Integrity](audit/2026-07/02_PAYMENT_INTEGRITY.md)
- [Domain 3 — Email Verification](audit/2026-07/03_EMAIL_VERIFICATION.md)
- [Domain 4 — Video Access Control](audit/2026-07/04_VIDEO_ACCESS_CONTROL.md)
- [Domain 5 — Data Governance](audit/2026-07/05_DATA_GOVERNANCE.md)
- [Domain 6 — Chatbot Architecture](audit/2026-07/06_CHATBOT_ARCHITECTURE.md) — includes [test transcripts](audit/2026-07/evidence/chatbot/test_transcripts.md) and [docs-vs-code drift scan](audit/2026-07/evidence/chatbot/docs_vs_code_drift.md)

- Evidence: [`audit/2026-07/evidence/`](audit/2026-07/evidence/)

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Developer | Levels | | |
| Product Owner | Will Cunningham | | |
| ERP Manager | Craig Sims | | |
