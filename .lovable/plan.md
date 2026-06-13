## Option A — Sunday-ready email (aliases confirmed)

GoDaddy aliases now live and forwarding:
`bugs@`, `danielle@`, `louis@`, `noreply@`, `support@`, `william@` — all on `procannedu.com`.

That removes the biggest unknown. Remaining work is project-side only.

### I do in the project

**1. Reuse existing test path (no new edge function unless required)**
- Audit `src/components/admin/TestEmailSender.tsx` + `supabase/functions/_shared/email-router.ts` to confirm end-to-end test coverage.
- In `src/components/admin/operations/EmailTab.tsx`, promote `TestEmailSender` higher and add preset recipient buttons:
  - `bugs@procannedu.com`
  - `danielle@procannedu.com`
  - `louis@procannedu.com`
  - `support@procannedu.com`
- All route through existing `email-router` → Resend (`noreply@procannedu.com` From).
- **Fallback only:** create `send-delivery-test` edge function if `TestEmailSender` can't surface the Resend message ID. Default is reuse.

**2. Tighten the false "URGENT: Domain Not Verified" banner**
- In `EmailTab.tsx`, replace loose `includes('procannedu.com')` match with strict check for actual Resend errors (`domain_not_verified`, Resend 403, or a structured `error_code`).
- Banner now only fires on genuine verification failures.

**3. Clear the 1 stuck email row (annotated)**
After querying `email_logs` to find the exact stuck row, run a one-shot migration:
```sql
UPDATE email_logs
SET status = 'failed',
    error_message = 'Manually cleared before UAT launch; delivery test replacing stuck health signal',
    updated_at = now()
WHERE id = '<verified-stuck-id>';
```
Result: `email-health-check` flips `DEGRADED` → `HEALTHY`.

**4. Update `docs/UAT_TESTER_GUIDE.md`**
- Section 1: add `danielle@procannedu.com` and `louis@procannedu.com` as the tester forwarding aliases (their personal inboxes still receive too).
- Section 7: confirm `bugs@procannedu.com` is monitored (forwards to `info@`); list `support@` as help; keep `/uat/feedback` as primary intake.

### Out of scope (post-launch)
- Consolidating the 3 email-send paths
- Wiring SMTP fallback
- Removing leftover `notify.specialpsmenue.com` / `notify.procannedu.com` Resend domains
- Deleting unused edge functions

### Acceptance checks before Sunday
- Admin clicks each preset button → email lands at the forwarded inbox within 60s with visible Resend message ID
- External send to `bugs@` from a personal Gmail → lands as expected
- `/admin/operations` Email tab: `HEALTHY`, no red banner
- UAT guide reflects real intake paths and tester aliases

### Files touched
- `src/components/admin/operations/EmailTab.tsx` — banner condition + promote test sender + preset buttons
- `src/components/admin/TestEmailSender.tsx` — recipient presets, surface message ID (only if needed)
- `docs/UAT_TESTER_GUIDE.md` — sections 1 and 7
- One migration to clear the stuck `email_logs` row
- `supabase/functions/send-delivery-test/` — fallback only, not default
