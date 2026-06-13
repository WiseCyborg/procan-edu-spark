# Centralized Support Routing — Remove Gmail-Filter Assumptions

## Context
All support aliases (`support@`, `bugs@`, `danielle@`, `louis@`, `william@`, `noreply@`) now forward into a single mailbox: **info@procannedu.com**. Team members get visibility via Gmail forwarding. No category-based Gmail filters auto-assign tickets to individuals. Triage is manual through UAT.

## Findings — Where the old assumption lives
Good news: the codebase has **no automatic per-person routing logic**. There is no code that assigns tickets to Danielle/Louis/William based on the destination alias. The cleanup is mostly documentation + small UX clarifications.

| Location | Current state | Action |
|---|---|---|
| `supabase/functions/_shared/email-router.ts` (`reply_to: "support@procannedu.com"`) | Outbound `reply_to` points at `support@` (which now forwards to info@). Works, but indirect. | Change `reply_to` to `info@procannedu.com` (one source of truth). |
| `supabase/functions/_shared/config.ts` (`SUPPORT_EMAIL`, `FROM.support`) | Used in outbound templates. | Keep `support@` as the **public-facing** address (brand), but add a `TRIAGE_INBOX = 'info@procannedu.com'` constant and use it for any internal routing/CC. |
| `supabase/functions/_shared/unified-email-service.ts` (default `SupportEmail` var) | Injected into templates. | No change — public address stays `support@`. |
| `email-templates/*.html` (~25 files reference `support@procannedu.com`) | Public contact address. | **Leave as-is.** `support@` forwards to info@. Customers should never see info@. |
| `docs/UAT_TESTER_GUIDE.md` lines 65–67 | Already lists aliases as forwarding to info@. | Add a one-line note: "All inbound mail consolidates into info@; team triages manually during UAT." |
| `src/components/admin/SupportRequestsPanel.tsx` | In-app support queue. Status filter only; **no auto-assignment by category**. | Add a small banner: "Inbound email is centralized at info@procannedu.com. Assign owners manually." |
| `src/components/admin/communications/EmailOpsConsole.tsx` line 270 ("Inbox Not Connected") | Placeholder for future inbox integration. | Update copy to: "Inbound inbox: info@procannedu.com (Gmail). Connection pending." |
| `docs/system/04_EDGE_FUNCTIONS.md`, `docs/OPERATIONS_RUNBOOK.md` | Email/ops runbooks. | Add a "Support Routing Model" section documenting the centralized approach. |
| `.lovable/plan.md` | Has prior test-email matrix. | Append note: per-alias filters deprecated. |

## Changes to make

### 1. Code (small, presentation-only)
- `supabase/functions/_shared/config.ts` — add `export const TRIAGE_INBOX = 'info@procannedu.com';` (no behavior change yet).
- `supabase/functions/_shared/email-router.ts` — switch `reply_to` from `support@` to `info@procannedu.com` so replies land directly in the triage mailbox without the extra forward hop. Redeploy `email-router`.
- `src/components/admin/SupportRequestsPanel.tsx` — add a one-line info banner above the queue: "All inbound support email forwards to **info@procannedu.com**. Owners are assigned manually during triage."
- `src/components/admin/communications/EmailOpsConsole.tsx` — change "Inbox Not Connected" badge tooltip/subtext to name `info@procannedu.com` as the destination.

### 2. Docs
- **New**: `docs/SUPPORT_ROUTING_MODEL.md` — one page covering:
  - Public addresses (`support@`, `bugs@`) → forwarded to `info@procannedu.com`.
  - Personal aliases (`danielle@`, `louis@`, `william@`) → forwarded to `info@`, plus Gmail forwarding gives each person visibility copies.
  - Triage is manual via Gmail labels + the in-app Support Requests panel.
  - No Gmail filters auto-route by category. AI routing is a future option, not a current dependency.
- **Edit**: `docs/UAT_TESTER_GUIDE.md`, `docs/OPERATIONS_RUNBOOK.md`, `docs/system/04_EDGE_FUNCTIONS.md` — link to the new doc and remove any language suggesting per-alias auto-assignment.

### 3. Recommended centralized model (for the doc)
- **Single inbox**: `info@procannedu.com` is the canonical triage queue.
- **Public addresses**: keep `support@` on the website and email templates (brand consistency); it forwards in.
- **Gmail labels** (manual): `triage`, `bug`, `billing`, `compliance`, `assigned/danielle|louis|william`, `done`. Set up shared Gmail multiple-inbox view filtered on `is:unread label:triage` for the daily standup.
- **In-app**: `support_requests` table remains the source of truth for tickets created from the app. Manual owner assignment via a new `assigned_to` dropdown (optional, can defer to post-UAT).
- **Future option (not built now)**: edge function `ingest-support-email` + LLM classifier that writes into `support_requests` with a suggested owner. Documented as "deferred" so we don't accidentally build dependencies on it.

## Explicitly out of scope
- No Gmail API integration this round.
- No automatic ticket assignment, no inbox sync, no classifier.
- No changes to outbound email templates beyond the `reply_to` swap.
- No new tables or migrations.

## Verification
- Redeploy `email-router`; send one test from the admin Test Emails panel; reply to it from Gmail and confirm it lands in info@.
- Open `/admin` → Communications → Ops Console and confirm the updated copy reads `info@procannedu.com`.
- Open Support Requests panel and confirm the new banner renders.
