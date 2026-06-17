# Memory: index.md

# Project Memory

## Core
- **Identity & Access**: 3-layer auth (Supabase > org_members > roles). Protected routes use `RequireAccess` guard and `get_access_snapshot` RPC.
- **Edge Functions (Secure)**: Always validate via `supabase.auth.getUser()`. Ignore client-supplied roles. Return 200 OK + `success: false` + `error_code` for logic errors (not 500s).
- **Edge Functions (Public)**: Must set `verify_jwt = false` in `config.toml` and be called via `invokePublicFunction()`.
- **Public Forms**: Use Edge Functions with Service Role Key to bypass RLS securely. Forms must use React-Hook-Form + Zod validation.
- **Database Ops**: No hidden admin changes (require AI root cause & explicit confirm). Execute bulk data repairs via one-shot service-role edge functions, then delete.
- **Data Persistence**: Module completion and revenue path data must persist atomically to the DB. Use `course_completions_user_course_unique` for completions.
- **Seat Assignments**: Must use `org_seat` source constraint (not `seat_allocation`). Triggers auto-create `course_entitlements`.
- **Truth in Content**: Strictly zero fabricated marketing claims. Content and UI copy must reflect actual capabilities and verified data.
- **Standard URLs**: Absolute links point to `https://www.procannedu.com`. Admin lives at `/admin`, resets at `/auth?mode=reset`, invites at `/accept-invitation`.
- **Session State**: Utilize TanStack query (5m stale), invalidate via Supabase Realtime events. Implement cross-tab sync for universal logouts.
- **i18n (launch scope)**: en/es/zh only. Strings in `src/i18n/locales/*.json`. `profiles.preferred_language` is source of truth for authed users. SEC-01 chatbot guardrail stays English even in localized prompts — never translate it.

## Memories

### Architecture & Infrastructure
- [Pipeline Flows](mem://core-features/end-to-end-pipeline-flows) — E2E progression from application to certification
- [3-Layer Auth Model](mem://architecture/authorization-three-layer-model) — Supabase Auth, org memberships, and user roles
- [Access Snapshot RPC](mem://architecture/security/access-snapshot-rpc) — Single authoritative RPC for UI gating logic
- [Access Logic Hierarchy](mem://architecture/security/access-snapshot-logic-hierarchy) — Enforcement rules for access snapshot
- [Public Form Pattern](mem://architecture/public-form-access-pattern) — Secure Service Role edge functions for unauthenticated forms
- [TanStack Config](mem://infrastructure/caching/tanstack-query-implementation) — 5m staleTime, standardized cache keys
- [Real-time Cache Invalidation](mem://infrastructure/caching/real-time-invalidation) — Instant unlocks via Supabase Realtime
- [DB Name Standards](mem://infrastructure/database/column-name-standardization) — Required DB schema naming conventions
- [SMTP Config](mem://infrastructure/auth/smtp-configuration) — Resend SMTP credentials and integration
- [Public Edge Config](mem://infrastructure/supabase/edge-function-config) — verify_jwt=false requirements
- [Admin Route Standards](mem://architecture/routing/admin-route-standardization) — Centralization on /admin
- [URL Standards](mem://infrastructure/routing/standardized-url-forwarding) — Unified URL structures for invites/resets
- [Public Fetch Pattern](mem://architecture/security/public-edge-function-pattern) — Use invokePublicFunction for unauth calls
- [EF Auth Hardening](mem://security/edge-function-authorization-hardening) — Server-side JWT validation rules
- [Actionable Errors](mem://architecture/edge-functions/actionable-error-handling) — 200 OK + payload for logical errors
- [Unified Audit Timeline](mem://infrastructure/database/unified-audit-timeline-view) — Chronological admin events view
- [One-shot Repair Pattern](mem://operations/one-shot-repair-pattern) — Service role utility scripts for data fixes

### Training & Courses
- [Course Specs](mem://training/curriculum-catalog-specifications) — Structure/pass-rates for 7 platform courses
- [Track Architecture](mem://features/training/track-architecture) — 4 course tracks with prerequisite gating
- [Resume Persistence](mem://features/training/per-course-resume-persistence) — DB-backed continuous course resume states
- [Review Mode](mem://features/training/review-mode-behavior) — Unlocked review mode for completed modules
- [DB Course Gating](mem://training/course-gating-database-persistence-critical) — Gating relies strictly on DB updates
- [Profile Completion Gate](mem://constraints/profile-completion-gate) — 100% profile completion required before training
- [Save Verification](mem://features/training/save-verification-layer) — Real-time feedback for auto-saves

### Certificates & Compliance
- [Standardized Certs](mem://features/training/standardized-certificate-issuance) — Unique cert prefixes and generation
- [Multi-method Verification](mem://features/training/multi-method-certificate-verification) — QR, code, and name verification
- [Verification Portal](mem://certificate-system/verification-portal-with-qr) — Public portal deep linking details
- [Annual Renewal](mem://compliance/annual-renewal-and-expiry-logic) — Annual recertification mechanics
- [Org Certification Reporting](mem://compliance/org-certification-summary-reporting) — Org compliance aggregation view
- [Annual Metric](mem://compliance/annual-certification-metric) — Primary global/org metric definition

### Exams & Validation
- [Proxy Photo Check-in](mem://features/exam/proxy-photo-check-in-system) — Webcam selfie validation gate
- [Atomic Exam Init](mem://architecture/exam/atomic-initialization) — Exam and check-in DB transaction pattern
- [Exam Reset Utility](mem://admin/exam-reset-utility) — State reset RPC for repeatable testing

### Users, Roles & Access
- [Context Gate](mem://auth/context-gate-and-approval-flow) — Post-login manager/coordinator approval holding
- [User Activation Tool](mem://admin/activate-user-bypass-recovery-tool) — Emergency admin unblocker for user flow
- [Deprovision Lifecycle](mem://features/user-management/deprovision-reprovision-lifecycle) — Soft-revoke for users/seats
- [Session Tab Sync](mem://infrastructure/auth/session-hardening-and-tab-sync) — Cross-tab logout synchronization
- [Idle Timeout](mem://features/security/idle-timeout-auto-save) — 30min timeout, auto-save-on-exit

### Payments, Seats & Organizations
- [Course Entitlements](mem://features/payments/stripe-course-entitlements) — Course access gating by DB entitlements table
- [Pricing Model](mem://billing/course-pricing-model) — Standardized platform pricing
- [Unified Webhooks](mem://infrastructure/payments/unified-stripe-webhook-logic) — Idempotent Stripe parsing
- [Payment Architecture](mem://infrastructure/payments/architecture) — Strict webhook reliance (no polling)
- [Seat Permissions](mem://admin/advanced-seat-management-role-based) — Role mapping for seat transfers
- [Org Management](mem://admin/organizations-management-fully-functional) — Admin UI for organization structures
- [Seat Automation](mem://infrastructure/database/seat-to-entitlement-automation) — Trigger mapping seats to entitlements
- [Entitlement Constraint](mem://infrastructure/database/entitlement-source-constraint-alignment) — Using org_seat DB constraint
- [Auto-org Manager](mem://infrastructure/database/auto-org-membership-trigger) — Org creators auto-assigned as managers
- [Async Biz Approval](mem://features/admin/dispensary-approval-logic-decoupling) — Decoupled biz approval vs user creation

### UI & Dashboards
- [Course Navigation](mem://ux/section-based-course-navigation-system) — 5-component responsive course nav
- [Simplified Header](mem://ux/simplified-mobile-first-header-navigation) — Mobile nav reduction and dropdown sections
- [Student UX Priority](mem://ux/student-success-maximization-priority) — Progression UX prioritization principles
- [RHF Integration](mem://client-side-forms/react-hook-form-integration) — Zod validation & form UX components
- [Branded Recovery](mem://features/ui/branded-error-recovery) — Custom system error boundaries
- [Guarded Routing](mem://features/ui/guarded-header-navigation) — Server-checked UI route transitions
- [Idle Timeout UX](mem://features/ui/idle-timeout-modal-redesign) — Modern countdown timeout design
- [Mission Control Dashboard](mem://admin-interface/mission-control-redesign-unified-dashboard) — Admin dashboard hierarchy
- [Metrics Sync Views](mem://admin-interface/global-metrics-sync-critical-requirement) — Metric sourcing from Postgres views
- [System Health UX](mem://admin-interface/system-health-operational-not-aspirational) — Operational vs static health displays

### AI Agents, Comms & Extensibility
- [MCA Compliance Engine](mem://architecture/mca-compliance-engine-regulatory-automation) — 5-agent sync for COMAR regulations
- [ROI Calculator Agent](mem://features/roi-calculator-agent-optimization-strategic-shift) — 4-agent ROI pipeline feeder
- [Comms Categories](mem://communications/channel-categories-conversation-types) — Chat hub organization mapping
- [LiveKit Infrastructure](mem://platform-architecture/livekit-video-infrastructure) — LiveKit video conferencing JWT/UI
- [Agent Meetings](mem://features/agent-covered-meetings-operational-requirement) — Automated AI meeting transcription
- [i18n Launch Foundation](mem://features/i18n-launch-foundation) — en/es/zh selector, profile column, chatbot prompt routing, deferred items

### Testing & QA
- [UAT Environment](mem://launch/uat-self-serve-pre-production-environment) — Self-serve environment separation
- [UAT Test Matrix](mem://testing/uat-test-matrix-harness) — DB-driven scenario testing suite
- [UAT Passwords](mem://testing/uat-password-standard) — Deterministic test account passwords
- [Release Governance](mem://quality-assurance/release-governance-strategy) — Scripted validation before human review
- [RVT Auditor Agent](mem://quality-assurance/rvt-system-auditor-agent) — Automated pipeline & regulation checks
