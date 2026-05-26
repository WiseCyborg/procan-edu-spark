# Pre-Production Readiness Audit — Full Report

Goal: Run every available automated check against the live system, consolidate results into a single mitigation report, and only then hand off to Danielle and Louis.

## Scope

Three independent validation passes plus a synthesis step. Nothing is changed in production code during this pass — output is a report you review before I fix anything.

### Pass 1 — Functional E2E (`run-e2e-validation`)
Invoke the deployed validator end-to-end. Captures:
- Auth + role gating
- Dispensary application submit + DB record
- Manager registration / linkage
- Employee registration + seat allocation
- Training gating, exam scoring, certificate generation + verification
- Payment / webhook / entitlement logic
- Cleanup of test data

Re-run twice to confirm determinism (no flakes from clock/race conditions).

### Pass 2 — Backend & Security
- `supabase--linter` — RLS, security definer views, function search_path
- `security--get_scan_results` — current open findings
- `supabase--analytics_query` — last 24h of edge function 5xx + Postgres ERROR/FATAL logs
- Spot-check critical edge functions for non-2xx rates: `submit-dispensary-application`, `register-with-seat-allocation`, `generate-certificate-retry`, `paypal-webhook`, `staff-invitation-manager`, `chat-assistant*`

### Pass 3 — Infra / Config Sanity
- Confirm `supabase/config.toml` `verify_jwt` flags match each function's intended exposure (public vs authenticated)
- Confirm required secrets exist (PayPal, Resend, Lovable AI, etc.) via `secrets--fetch_secrets`
- Check email template references resolve to existing functions
- Confirm DB constraints referenced by E2E (`course_entitlements_source_check`, license expiry validation trigger) are in place

### Pass 4 — Synthesis
Produce `/mnt/documents/PRE_PROD_READINESS_REPORT.md` with:
- Pass/fail summary per gate
- Severity-tagged blocker list (Critical → Info)
- Root cause + suggested fix for each blocker
- Items safe to defer past Dani/Louis handoff
- Final recommendation: SHIPPABLE / SHIPPABLE-WITH-CAVEATS / NOT-SHIPPABLE

A `presentation-artifact` link will be included so you can download it.

## What this plan does NOT do
- No production code changes
- No DB migrations
- No edits to E2E harness
- No emails sent to Dani/Louis

After you review the report, approve a follow-up build-mode task to fix the blockers.

## Technical notes
- All test data created by `run-e2e-validation` is cleaned up by the function itself; any residue will be listed in the report
- Edge function invocations use the preview session token, so destructive paths run as the logged-in admin (`wisecyborg@gmail.com`) — acceptable for test data only
- Report writes go only to `/mnt/documents/`, no repo changes
