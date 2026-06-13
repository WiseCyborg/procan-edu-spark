# Email Verification Flow — Evidence

## Code paths

- `supabase/functions/send-verification-code/index.ts` — inserts row into `email_verification_codes` with `expires_at = now() + interval '15 minutes'`, sends via Resend.
- `supabase/functions/verify-code/index.ts` — validates `(email, code)` where `expires_at > now()` AND `verified_at IS NULL`; on success sets `verified_at` and updates `auth.users`.
- `supabase/functions/_shared/email-router.ts` — sets `reply_to: 'info@procannedu.com'` (centralized triage; see `docs/SUPPORT_ROUTING_MODEL.md`).

## Resend domain checklist (Levels to confirm before launch)

| Record | Expected | Verified? |
|---|---|---|
| SPF | `v=spf1 include:_spf.resend.com ~all` | ⏳ |
| DKIM | Resend-generated CNAME | ⏳ |
| DMARC | `v=DMARC1; p=quarantine; rua=…` | ⏳ |
| Domain Verified badge in Resend dashboard | Green | ⏳ |

## Deliverability test

Send a verification code to each of:
- `levels-test@gmail.com`
- `levels-test@outlook.com`
- `levels-test@proton.me`

Confirm arrival in **Inbox**, not Spam, within 60 seconds.

## TTL test

```sql
-- 1. Trigger code send via UI as test_verify_001@procannedu.com
SELECT email, code, expires_at, verified_at
FROM public.email_verification_codes
WHERE email='test_verify_001@procannedu.com'
ORDER BY created_at DESC LIMIT 1;

-- 2. Confirm expires_at = created_at + 15 min
-- 3. Wait 16 min, attempt verify via /verify-code → expect "expired_or_invalid"
```

Attach Resend dashboard screenshot and curl transcript here before sign-off.
