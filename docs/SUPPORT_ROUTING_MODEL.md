# Support Routing Model

**Status:** Active for UAT and initial production. Last updated 2026-06-13.

## Single source of truth

All inbound support email consolidates into **`info@procannedu.com`**. This is the canonical triage queue. No Gmail filters auto-route messages to individuals by alias or category.

## Address map

| Address | Purpose | Routing |
|---|---|---|
| `info@procannedu.com` | Canonical triage inbox | Primary mailbox |
| `support@procannedu.com` | Public-facing brand address (website, email templates) | Forwards to `info@` |
| `bugs@procannedu.com` | Bug reports (UAT, customers) | Forwards to `info@` |
| `noreply@procannedu.com` | Outbound only (no inbound expected) | Forwards to `info@` |
| `danielle@procannedu.com` | Personal alias | Forwards to `info@` + visibility copy to Danielle |
| `louis@procannedu.com` | Personal alias | Forwards to `info@` + visibility copy to Louis |
| `william@procannedu.com` | Personal alias | Forwards to `info@` + visibility copy to William |

Outbound mail uses `noreply@procannedu.com` as the `From` and **`info@procannedu.com`** as the `reply_to` so customer replies land directly in triage without an extra forward hop.

## Triage workflow (manual)

1. New mail arrives in `info@`.
2. Gmail labels are applied manually: `triage`, `bug`, `billing`, `compliance`, `assigned/<person>`, `done`.
3. Daily standup reviews `is:unread label:triage`.
4. Tickets created from inside the app live in the `support_requests` table and are visible in **Admin → Communications → Support Requests**. Owners are assigned manually there.

## What this model intentionally does NOT do

- No Gmail filter auto-assigns mail to Danielle, Louis, or William based on the destination alias.
- No automatic ticket-classification or owner suggestion.
- No inbound Gmail API integration syncing into `support_requests`.

Code, dashboards, and docs must not assume any of the above. The in-app `support_requests` panel shows a banner reminding triagers that assignment is manual.

## Future option (deferred, not built)

An `ingest-support-email` edge function backed by an LLM classifier could write inbound mail into `support_requests` with a suggested owner and category. Documented here so nobody accidentally builds dependencies on it before we decide to ship it.

## Where this is reflected in code

- `supabase/functions/_shared/config.ts` — `SUPPORT_EMAIL` (public) + `TRIAGE_INBOX` (internal).
- `supabase/functions/_shared/email-router.ts` — `reply_to` set to `info@procannedu.com`.
- `src/components/admin/SupportRequestsPanel.tsx` — triage banner.
- `src/components/admin/communications/EmailOpsConsole.tsx` — inbox status badge names `info@procannedu.com`.
- `docs/UAT_TESTER_GUIDE.md` — backup-path section points to this doc.
