# 04 — Edge Functions

**210 functions** under `supabase/functions/`. `supabase/config.toml` declares `verify_jwt` for **173** of them; **106 are public** (`verify_jwt = false`) and the remainder require a Supabase JWT.

Rules from project memory:
- Public functions must use `invokePublicFunction()` from the frontend (no Authorization header).
- Secure functions validate via `supabase.auth.getUser()` server-side and **ignore** any client-supplied role.
- Logical errors return **HTTP 200** with `{ success: false, error_code }` rather than 500.

## Public functions (`verify_jwt = false`) by domain

### Auth & invites (public)
`accept-invitation` · `accept-org-invite` · `check-email-exists` · `send-invitation-email` · `send-verification-code` · `send-welcome-email` · `verify-code` · `vonage-verify-start` · `vonage-verify-check` · `create-org-channels`

### Public forms & onboarding (public)
`submit-dispensary-application` · `enroll-dispensary-contact`

### Payments (public — webhook + diagnostics)
`stripe-webhook` · `test-paypal-connection` · `check-paypal-secrets`

### AI agents (public, scheduled / cron)
`ai-at-risk-agent` · `ai-seat-utilization-agent` · `ai-rvt-renewal-monitor` · `ai-rvt-competitor-monitor` · `ai-competitor-monitor` · `ai-content-optimizer` · `ai-curriculum-optimizer` · `ai-faq-generator` · `chat-assistant-enhanced` · `enrollment-lifecycle-agent` · `avatar-agent`

### Voice / media (public)
`voice-to-text` · `text-to-voice` · `openai-avatar-voice`

### Health & ops (public, cron-callable)
`comprehensive-health-check` · `check-employee-course-stalls` · `check-manager-registration-expiry` · `check-pipeline-health` · `check-ssl-status` · `check-payment-deadlines` · `check-seat-capacity` · `check-certificate-expiry` · `check-comar-compliance` · `check-escalations` · `check-subscription-renewal` · `auto-retry-failed-emails` · `auto-generate-join-codes` · `auto-fix-manager-accounts`

### Crypto bootstrap (public, one-time)
`configure-encryption-key`

## JWT-guarded functions (`verify_jwt = true`) by domain

### Admin tooling
`admin-activate-user` · `admin-end-proxy-session` · `admin-impersonate-user` · `admin-reset-password` · `admin-user-management` · `approve-application` · `approve-with-roles` · `archive-user-seat` · `assign-training-coordinator` · `bulk-assign-retraining` · `analyze-system-issue` · `analyze-at-risk-students` · `analyze-payment-patterns` · `analyze-regulatory-impact` · `audit-site-images` · `execute-ai-fix` · `calculate-recommendation-impact`

### Profile & private data
`store-private-profile` · `get-private-profile`

### Live / video
`generate-livekit-token`

### Support
`request-procann-support`

### App-state agents
`application-state-agent` · `certificate-integrity-agent`

### AiLean
`ailean-coach` · `batch-regenerate-tokens`

### Miscellaneous (sample — full list in `ls supabase/functions/`)
`allocate-seats-on-payment` · `chat-assistant` · `cleanup-fast-track-tests` · …

## Function inventory size

| Count | Bucket |
|-------|--------|
| 210 | Total function directories |
| 173 | Functions with explicit `verify_jwt` declaration |
| 106 | Public (`verify_jwt = false`) |
| 67 | Secure (`verify_jwt = true`) |
| 37 | **Missing** `verify_jwt` declaration → defaults to `true` |

The 37 functions without an explicit declaration inherit Supabase's secure default. Recommendation: declare each one explicitly so the posture is auditable from one file.

## Patterns enforced

- **Service role bypass.** Only edge functions read `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env`; never exposed to the frontend.
- **One-shot data repair.** Mutating data fixes use throw-away service-role functions (see `mem://operations/one-shot-repair-pattern`) which are deleted after run.
- **Idempotent webhooks.** `stripe-webhook` uses `payment_events` event-id de-duplication.
