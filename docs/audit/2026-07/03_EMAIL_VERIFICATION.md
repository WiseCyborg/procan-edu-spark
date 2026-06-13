# Domain 3 — Email Verification

## Storage

Table: `public.email_verification_codes`

| Column | Purpose |
|---|---|
| `user_id` | Owner |
| `email` | Target address |
| `code` | One-time verification code (random, server-generated) |
| `purpose` | `signup` / `email_change` / `reauth` |
| `expires_at` | **TTL enforced server-side**. Default 15 minutes. |
| `verified_at` | Set on successful redemption; second use is rejected (`expires_at < now() OR verified_at IS NOT NULL` → invalid). |
| `delivery_method` | `email` (Resend) or `sms` (Vonage backup) |
| `delivery_status`, `delivery_attempts` | For ops observability |
| `vonage_request_id` | SMS correlation |

RLS: owner SELECT only; INSERT/UPDATE via service_role from edge functions.

## Edge functions

- `send-verification-code` — generates code, inserts row, calls Resend (or Vonage). 6-digit code, 15-minute TTL.
- `verify-code` — looks up `(email, code)` where `expires_at > now()` AND `verified_at IS NULL`; flips `verified_at` and updates `auth.users` flag.
- `vonage-verify-start` / `vonage-verify-check` — SMS fallback.

## Resend posture

| Item | Status |
|---|---|
| Domain | `procannedu.com` (SPF/DKIM/DMARC configured) |
| `from` | `noreply@procannedu.com` |
| `reply_to` | `info@procannedu.com` (centralized per `docs/SUPPORT_ROUTING_MODEL.md`) |
| Bounce/complaint webhook | Not wired — bounces visible in Resend dashboard only |

**Action for Levels:** confirm Resend dashboard shows all three records green and no "Domain Not Verified" warning before launch. Screenshot to be attached to [`evidence/email_verification_flow.md`](evidence/email_verification_flow.md).

## Audit doc test mapping

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Register `test_verify_001@procannedu.com` | Row inserted in `email_verification_codes`, email sent | ✅ |
| 2 | Inspect token | UUID/6-digit code, `expires_at = now() + 15m` | ✅ |
| 3 | Use token after 16 minutes | Rejected (`expired_or_invalid`) | ✅ |
| 4 | Fresh code, redeem within 5 min | `auth.users.email_confirmed_at` set | ✅ |
| 5 | Resend delivery logs | All sent, not bounced | Pending Levels confirmation in prod |
| 6 | SPF/DKIM/DMARC | All green | Pending Resend screenshot |
| 7 | Inbox-not-spam across Gmail/Outlook/ProtonMail | Inbox | Pending Levels delivery test |

## Findings

| ID | Severity | Description | Recommendation |
|---|---|---|---|
| EMAIL-01 | Low | Verification codes are 6 digits with 15-min TTL. Default Supabase rate-limit applies via `rate_limits` table (`check_rate_limit`). Confirm hook is wired for `verify_code` action. | Add explicit rate-limit call in `verify-code` if missing. |
| EMAIL-02 | Info | Bounce/complaint events from Resend are not auto-ingested into `suppressed_emails`. Manual triage only. | Defer until post-launch. |

## Success criteria

| Criterion | Status |
|---|---|
| Tokens expire after 15-60 min | ✅ 15 min |
| Tokens stored securely (not logged in plaintext) | ✅ |
| Resend domain fully verified | ⏳ Levels to confirm |
| Verification delivers to inbox | ⏳ Levels to confirm |
| Expired tokens rejected | ✅ |
