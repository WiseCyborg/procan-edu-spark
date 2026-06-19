## Goal
Produce a one-shot **Unified Operations / Mission Control summary** — a consolidated, point-in-time snapshot of platform health across pipeline, payments, training, compliance, access, and email/system jobs. Output is a markdown evidence file (no UI changes).

## Deliverable
`docs/audit/2026-07/evidence/mission_control_summary_2026-06-18.md`

A single markdown document with these sections, each populated from live DB reads:

1. **Header** — generated-at timestamp, environment, git sha placeholder, GO/NO-GO pill derived from the section rollups.
2. **Launch Readiness rollup** — call `get_launch_readiness()` + `count_unmapped_modules()`. Show: real unmapped, accepted exclusions (with breakdown), orphan video assets, trust_check status.
3. **Training & Certification**
   - Active courses, modules total, modules with valid Vimeo mapping, modules tagged `unmapped_reason`.
   - `course_completions` last 7d / 30d / all-time.
   - `certificates` issued last 7d / 30d, expiring in next 30d, expired-not-renewed.
   - `exam_attempts` pass rate last 30d, average score, in-flight attempts.
4. **Payments & Entitlements**
   - `payments` last 7d (count, gross, refunds), `payment_events` failures last 7d.
   - `course_entitlements` active by source (`org_seat`, `stripe`, `paypal`, `manual`).
   - Stripe vs PayPal split; flag any webhook gaps (events received vs entitlements created).
5. **Organizations & Seats**
   - Orgs total / active / pending approval.
   - Seats allocated vs consumed; deprovisioned in last 30d.
   - Pending `staff_invitations` and `org_invites` older than 7d.
6. **Access & Identity**
   - `user_roles` distribution.
   - `role_requests` pending.
   - Recent admin proxy sessions (last 24h).
   - `security_events` and `security_audit_log` high-severity last 7d.
7. **Email & Comms Health**
   - `email_provider_health` latest snapshot, `email_circuit_breaker` open breakers.
   - `email_outbox` queued vs failed, `email_events` bounces/complaints last 7d.
8. **System Jobs & Integrations**
   - `system_jobs` running/failed, `system_jobs_deadletter` count.
   - `integration_health` latest per integration.
   - `cron_job_executions` last 24h failures.
9. **Compliance & COMAR**
   - `comar_versions` current active version + last review date.
   - `compliance_incidents` open by severity; `compliance_alerts` unresolved.
   - `module_compliance_reviews` pending.
10. **Real-Time / Operations signals**
    - `pipeline_health_snapshot` latest, `platform_health_scores` latest, `slo_metrics` last 24h breaches.
11. **GO/NO-GO matrix** — table per section with status (GREEN / AMBER / RED) + one-line reason. Overall verdict at top mirrors this.
12. **Appendix** — raw SQL used + counts JSON for reproducibility.

## Method (build mode)

1. Run a batch of `supabase--read_query` reads, one per section, aggregating only counts and small top-N lists (no PII).
2. Compose the markdown locally and write the file via `code--write`. No DB writes, no schema changes, no UI changes.
3. Verify file exists and renders. Print a 10-line preview.

## Out of scope
- No new tables, RPCs, or migrations.
- No changes to `LaunchReadiness.tsx`, `E2EReadinessChecklist`, or any hooks.
- No Firecrawl/pipeline harness execution (those are admin-gated UI actions, separate from this evidence pull).
- No remediation actions — this is a read-only snapshot.

## Acceptance
- File exists at the path above.
- Every section has live numbers (or an explicit `n/a — table empty` note).
- Overall verdict is computed from section statuses, not hardcoded.
