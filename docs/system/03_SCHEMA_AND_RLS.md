# 03 — Schema & RLS

**173 tables** in the `public` schema. **RLS is enabled on every one.** This document groups them by domain at medium depth: table name, primary purpose, and the policy posture. Full column lists, FKs, triggers, and policy bodies are omitted to keep the pack scannable — see Supabase Studio for line-level detail.

## RLS posture summary

| Posture | Count (approx) | Pattern |
|---------|----------------|---------|
| **Owner-scoped** | ~55 | `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE |
| **Org-scoped** | ~40 | `EXISTS (SELECT 1 FROM organization_members WHERE org_id = … AND user_id = auth.uid())` |
| **Admin-only write, role-scoped read** | ~45 | Write via `has_role(auth.uid(),'admin')`; read varies |
| **Service-role only** | ~25 | All access via `service_role`; written by edge functions exclusively |
| **Public read** | ~8 | Catalog, FAQ, content reviews — explicit `anon SELECT` grant |

All 173 tables have `GRANT` blocks in their migrations (project memory enforces this).

## Domain groupings

### 🔐 Identity, access, auth (16 tables)
`profiles` · `profiles_private` · `user_roles` · `role_permissions` · `role_requests` · `organization_members` · `organizations` · `org_invites` · `staff_invitations` · `email_verification_codes` · `password_reset_tokens` · `user_metadata` · `user_verification_preferences` · `user_activity_log` · `user_operation_logs` · `admin_proxy_sessions`

> `user_roles` is read by `has_role()` only. `profiles_private` separates PII (SSN, DOB) and uses pgcrypto `encrypt_pii`/`decrypt_pii` SECURITY DEFINER fns.

### 🎓 Training & curriculum (15 tables)
`courses` · `course_modules` · `course_completions` · `course_entitlements` · `course_credentials` · `course_resume_state` · `user_progress` · `user_learning_journey` · `user_journey_state` · `curriculum_versions` · `curriculum_recommendations` · `student_certification_versions` · `training_questions` · `training_version_mismatches` · `module_state_log`

### 📜 Certificates & compliance (16 tables)
`certificates` · `user_certificates` · `consumer_certificates` · `consumer_enrollments` · `certificate_audit_log` · `compliance_alerts` · `compliance_incidents` · `compliance_metrics` · `compliance_packets` · `module_attestations` · `module_compliance_reviews` · `comar_versions` · `federal_regulation_tracking` · `regulatory_change_notifications` · `regulatory_content` · `regulatory_updates`

### 📝 Exams (5 tables)
`exam_attempts` · `exam_blueprint` · `exam_checkins` · `exam_topic_scores` · `first_shift_compliance_alerts`

### 💳 Payments, seats, billing (12 tables)
`orders` · `payments` · `payment_audit_log` · `payment_events` · `paypal_configuration` · `entitlements` · `rvt_purchases` · `rvt_seats` · `rvt_join_codes` · `seat_rotation_history` · `subscription_history` · `subscription_tiers` · `token_redemptions`

> Webhook-driven only — see `mem://infrastructure/payments/architecture`. `course_entitlements` auto-created by trigger from `rvt_seats`.

### 📧 Communications & messaging (16 tables)
`conversations` · `conversation_participants` · `messages` · `message_mentions` · `message_reactions` · `typing_indicators` · `notification_queue` · `notification_preferences` · `notification_rules` · `communication_logs` · `email_logs` · `email_outbox` · `email_inbox_messages` · `email_events` · `email_analytics` · `email_analytics_summary` · `email_template_history` · `email_templates` · `email_preferences` · `email_circuit_breaker` · `email_provider_health` · `email_health_snapshot`

### 🎥 Live & video (9 tables)
`live_sessions` · `live_session_registrations` · `video_calls` · `video_call_participants` · `video_assets` · `image_assets` · `covered_sessions` · `scheduled_calls` · `scheduled_call_invites`

### 🤖 AI agents & insights (14 tables)
`agent_configs` · `agent_escalations` · `agent_events` · `ai_agent_runs` · `ai_fix_plans` · `ai_insights` · `avatar_prompts` · `ailean_activation_tokens` · `ailean_sessions` · `chat_intent_log` · `prediction_models` · `prediction_results` · `recommendation_feedback` · `recommendation_impact_tracking`

### 📊 Intelligence & analytics (11 tables)
`competitive_alerts` · `competitor_analysis_history` · `competitor_snapshots` · `maryland_county_analytics` · `roi_forecasts` · `lighthouse_scores` · `performance_metrics` · `slo_metrics` · `platform_health_scores` · `feature_flags` · `enrollment_deadlines`

### 🛠 Ops, health & integrity (16 tables)
`admin_operations_audit` · `admin_settings` · `alert_rules` · `api_console_audit` · `api_requests` · `automated_test_results` · `cron_job_executions` · `edge_function_status` · `integration_health` · `pipeline_health_events` · `pipeline_health_log` · `pipeline_health_snapshot` · `system_health_snapshots` · `system_integrity_checks` · `system_integrity_fixes` · `system_jobs` · `system_jobs_deadletter`

### 🛡 Security (5 tables)
`security_audit_log` · `security_events` · `rate_limits` · `escalation_log` · `push_subscriptions`

### 🏢 Org operations (8 tables)
`dispensary_applications` · `trainer_certifications` · `incident_module_mappings` · `incident_retraining_assignments` · `retraining_events` · `supervisor_signoffs` · `tier_achievements` · `owner_digest_preferences`

### 🧪 UAT & testing (7 tables)
`uat_accounts` · `uat_runs` · `uat_tasks` · `uat_task_templates` · `uat_evidence` · `uat_test_results` · `uat_validation_checklists` · `regression_runs` · `regression_settings`

### 🤝 Support (4 tables)
`support_queue` · `support_requests` · `support_request_messages` · `faq_entries` · `content_review_queue` · `session_actions` · `session_decisions` · `session_participants` · `session_summaries` · `session_transcripts` · `scheduled_reviews` · `workflow_automations`

## Storage buckets (7)

| Bucket | Public | Purpose |
|--------|:------:|---------|
| `profile-photos` | ✅ | User avatars |
| `ProCannVideos` | ✅ | Marketing + course videos |
| `compliance` | 🔒 | Compliance packets, audits |
| `conversation-files` | 🔒 | Chat attachments |
| `call-recordings` | 🔒 | Video call recordings |
| `mock-certificate-photos` | 🔒 | Cert photo capture for exam check-in |
| `regression-reports` | 🔒 | QA artifacts |

All buckets have RLS policies on `storage.objects`.

## SECURITY DEFINER functions (highlights)

200+ functions in `public`. Critical SECURITY DEFINER ones:

| Function | Purpose |
|----------|---------|
| `has_role(uuid, app_role)` | Role check used by every RLS policy |
| `get_access_snapshot()` | Single-call UI authorization payload |
| `approve_dispensary_application(uuid, int, uuid)` | Org approval workflow |
| `allocate_seat_to_user(uuid, uuid, uuid)` | Seat → entitlement promotion |
| `allocate_additional_seats(uuid, int, text)` | Seat top-up |
| `deallocate_seat(uuid)` | Soft revoke |
| `deprovision_user(uuid, uuid)` | User lifecycle revoke |
| `archive_user_seat(uuid, text, uuid)` | Seat archive trail |
| `bulk_verify_users(uuid[], text)` | Admin bulk verify |
| `evaluate_and_issue_certificate(...)` | Cert issuance gate |
| `generate_certificate_number()`, `generate_dispensary_number()` | ID generation |
| `fn_upsert_entitlement_on_seat_assign()` | Trigger: seat → entitlement |
| `fn_set_user_certificate_expiry()` | Trigger: annual expiry stamping |
| `auto_create_org_membership()` | Trigger: creator becomes manager |
| `check_course_prerequisite(uuid, uuid)` | Track gating |
| `check_seat_availability/capacity` | Billing guards |
| `encrypt_pii(text)` / `decrypt_pii(bytea)` | pgcrypto wrappers |
| `check_rate_limit(...)` / `clear_user_rate_limits(...)` | Throttling |
| `start_uat_run()` / `submit_uat_step()` | UAT feedback (new) |
| `audit_profile_changes()` / `audit_sensitive_changes()` / `audit_sensitive_operations()` | Triggers writing to `*_audit_log` |
| `calculate_compliance_score(uuid)` | Org compliance roll-up |
| `calculate_slo_metrics()` | SLO snapshot |
| `generate_compliance_report(uuid)` | Org report builder |
| `fix_manager_registration(text, uuid)` | One-shot manager recovery |
| `create_initial_admin()` | Bootstrap |

All SECURITY DEFINER functions have `SET search_path = public` per Supabase guidance.

## Things to verify next

- Confirm every public-read table (`courses`, `faq_entries`, …) actually has an `anon SELECT` GRANT in its migration.
- Audit triggers on storage buckets to make sure `mock-certificate-photos` isn't world-listable.
- The Supabase linter run from `07_KNOWN_ISSUES_AND_GAPS.md` enumerates outstanding warnings.
