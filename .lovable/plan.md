# Free Edge Function Slots for `get-video-url`

You're at the 200-function plan cap. I scanned all 191 functions and ranked them by how many places (frontend + other edge functions + config) reference each name.

## Tier 1 — Zero references anywhere (safest to delete)

These have no caller in the frontend, no caller in any other edge function, and no entry in `supabase/config.toml`. They're effectively dead code.

| Function | Likely purpose | Notes |
|---|---|---|
| `ai-competitor-monitor` | Superseded by `ai-rvt-competitor-monitor` which IS wired up | Old version |
| `check-ssl-status` | One-off ops check | No cron, no caller |
| `send-owner-digest-email` | Old digest email | Not in cron or UI |
| `send-payment-link` | Manual payment-link sender | Not referenced; payments go through PayPal/Stripe flows |

Deleting these 4 frees 4 slots — enough to deploy `get-video-url` with room to spare.

## Tier 2 — Single reference (only config.toml or one stale call site)

Optional extras if you want more headroom. Each needs a 10-second confirm before I pull the trigger:

- `ai-faq-generator`, `database-integrity-fix`, `email-personalization-agent`, `export-health-report`
- `fast-track-dispensary-test`, `cleanup-fast-track-tests` (paired UAT helpers — delete together)
- `migrate-email-templates` (one-shot migration, probably already run)
- `notify-expiring-tokens`, `notify-failed-emails` (superseded by `auto-retry-failed-emails` + cron)
- `recover-join-code` (UI has `validate-join-code` + `generate-join-code` instead)
- `schedule-onboarding-sequences`, `schedule-training-reminders` (cron-style, verify no pg_cron entry first)
- `send-payment-failed`, `send-escalation-email`, `send-reminder-email`, `send-employee-progress-milestone`, `send-employee-course-stalled`, `send-application-rejected` (email senders — verify nothing in `automated-notifications` / `process-notification-queue` enqueues them)
- `forecast-recommendation-roi`, `analyze-at-risk-students`, `process-call-recording`, `process-scheduled-calls`, `track-certificate-verification`, `trigger-manager-welcome`, `resend-invitation` (only referenced once, possibly only by themselves)

I would NOT delete Tier 2 without spot-checking pg_cron and the notification queue dispatcher for each — happy to do that.

## Recommended action

1. **Delete the 4 Tier-1 functions** (zero risk, zero references).
2. **Deploy `get-video-url`** — should succeed immediately.
3. (Optional) After deploy, do a targeted pg_cron + `process-notification-queue` audit on Tier 2 and prune another 5-10 to give you long-term headroom.

## Technical detail

- Deletion uses the `supabase--delete_edge_functions` tool + `rm -rf supabase/functions/<name>` + cleanup of any `[functions.<name>]` block in `supabase/config.toml`.
- None of the Tier-1 candidates appear in `config.toml`, so no config edits required for step 1.
- `get-video-url` is already coded and configured (`verify_jwt = true`); only the deploy is blocked.

## Out of scope

- No changes to working functions.
- No database changes.
- No frontend changes.
