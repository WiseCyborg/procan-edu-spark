# 01 — Route Map

All routes live in `src/App.tsx` inside `<AppRoutesLayout />`. The provider tree (outer → inner) is:

```
ErrorBoundary → QueryClientProvider → BrowserRouter → KeyboardShortcutsProvider
  → UnifiedVoiceProvider → AuthProvider → AccessProvider → AdminProxyProvider
  → IdleTimeoutProvider → OrganizationProvider → SaveStatusProvider
  → JourneyStateProvider → TooltipProvider → AppRoutesLayout
```

## Guard primitives

| Guard | Behavior |
|-------|----------|
| `ProtectedRoute` | Redirects to `/auth` if no Supabase session. Shows spinner while `useAuth().loading`. |
| `PublicRoute` | Redirects logged-in users to `/dashboard` *unless* `?mode=reset` or `?tab=accesskey/code`. |
| `RequireAccess` | Wraps `useAccess()` snapshot (RPC `get_access_snapshot`). Props: `requireCourseAccess`, `courseId`, role filters. |
| `ProtectedCourseAccess` | Course-entitlement check via `course_entitlements` + active org membership. |

Admin pages are **not** behind a dedicated `AdminRouteGuard` at the route level — they sit behind `ProtectedRoute` and rely on the page component to call `has_role(auth.uid(), 'admin')` server-side.

## Public routes (no login required)

| Path | Page | Notes |
|------|------|-------|
| `/` | `Index` | Marketing home |
| `/welcome` | `Welcome` | Post-signup welcome variant |
| `/faq` | `FAQ` | |
| `/consumer-education`, `/learn` | `ConsumerEducation` | Free consumer track |
| `/consumer-education/:courseId` | `ConsumerCourse` | |
| `/consumer-certificates` | `ConsumerCertificates` | |
| `/courses` | `AllCourses` | Catalog |
| `/verify` | `VerifyCertificate` | Certificate lookup |
| `/verify-certificate` | `CertificateVerification` | Legacy verify |
| `/verify/certificate/:certificateId` | `SecureCertificateVerification` | QR deep link |
| `/state-officials` | `StateOfficialsPage` | |
| `/about/team` | `AboutTeamPage` | |
| `/compliance/curriculum-matrix` | `ComplianceCurriculumMatrixPage` | |
| `/compliance/content-review` | `ComplianceContentReviewPage` | |
| `/employers` | `EmployersPage` | |
| `/impact` | `ImpactDashboardPage` | |
| `/accessibility` | `AccessibilityPage` | |
| `/why-procann` | `CompetitorComparison` | |
| `/roi-calculator-public` | `ROICalculatorPublic` | |
| `/success-stories` | `SuccessStories` | |
| `/mca-compliance-review` | `MCAComplianceReview` | |
| `/regulatory-explorer` | `RegulatoryExplorerPage` | |
| `/payment` | `Payment` | Stripe/PayPal initiation |
| `/org/apply` | `DispensaryApplication` | Public org application form |
| `/register/manager` | `ManagerRegistration` | (legacy redirect: `/manager-registration`) |
| `/get-started` | `GetStarted` | |
| `/privacy-policy`, `/terms-of-service` | Legal | |
| `/system-health` | `SystemHealthDashboard` | Public health page (also a duplicate authed route exists — see Issues §7) |

## Auth / onboarding

| Path | Page | Guard |
|------|------|-------|
| `/auth` | `Auth` | `PublicRoute` |
| `/forgot-password` | `ForgotPassword` | `PublicRoute` |
| `/accept-invitation` | `AcceptInvitation` | none |
| `/accept-invite` | `AcceptInvite` | none |
| `/onboarding/profile` | `ProfileOnboardingWizard` | `ProtectedRoute` |
| `/onboarding/setup-team` | `OnboardingSetup` | `ProtectedRoute` |
| `/role-selection` | `RoleSelectionDashboard` | `ProtectedRoute` |
| `/activate-ailean` | `ActivateAiLean` | none (token-gated) |
| `/ailean-info` | `AiLeanInfo` | none |

## Student / learner

| Path | Page | Guard |
|------|------|-------|
| `/dashboard` | `Dashboard` (smart router) | `ProtectedRoute` |
| `/student-dashboard` | `StudentDashboard` | `ProtectedRoute` |
| `/profile` | `Profile` | `ProtectedRoute` |
| `/course` | `CourseLayout` | `ProtectedRoute` + `RequireAccess(courseId=…RVT)` + `ProtectedCourseAccess` |
| `/course/:moduleId` | `EnhancedCourseModule` | same |
| `/course/final-exam`, `/exam` | `FinalExam` | same |
| `/payment-success` | `PaymentSuccess` | `ProtectedRoute` |
| `/certificates` | `Certificates` | `ProtectedRoute` |
| `/renew` | `CertificateRenewal` | `ProtectedRoute` |
| `/rvt-complete` | `RVTComplete` | `ProtectedRoute` |
| `/training-handbook` | `TrainingHandbook` | `ProtectedRoute` |
| `/welcome-video` | `WelcomeVideo` | `ProtectedRoute` |
| `/stoplight-standard` | `StoplightStandard` | `ProtectedRoute` |
| `/communication` | `CommunicationHubPage` | `ProtectedRoute` |
| `/live` | `ProCannLive` | `ProtectedRoute` |

## Manager / coordinator

| Path | Page | Guard |
|------|------|-------|
| `/dispensary-manager-dashboard` | `DispensaryManagerDashboard` | `ProtectedRoute` |
| `/training-coordinator-dashboard` | `TrainingCoordinatorDashboard` | `ProtectedRoute` |
| `/team-management` | `TeamManagement` | `ProtectedRoute` |
| `/purchase-seats` | `PurchaseSeats` | `ProtectedRoute` |

Page components must internally verify `has_role(..., 'dispensary_manager')` or `training_coordinator` — there is no route-level role guard.

## Admin (all under `/admin/*`, `ProtectedRoute` only at the route layer)

| Path | Page |
|------|------|
| `/admin` | `AdminMissionControl` (canonical) |
| `/admin/management` | `AdminManagement` |
| `/admin/operations` | `OperationsCommandCenter` |
| `/admin/realtime-operations` | `RealTimeOperationsDashboard` |
| `/admin/utilities` | `AdminUtilities` |
| `/admin/demo-setup` | `DemoAccountsSetup` |
| `/admin/email-domain` | `EmailDomainVerification` |
| `/admin/pipeline-monitor` | `PipelineMonitor` |
| `/admin/advanced-analytics` | `AdvancedAnalytics` |
| `/admin/exam-analytics` | `ExamAnalyticsPage` |
| `/admin/intelligence` | `OwnersIntelligence` |
| `/admin/competitive-intelligence` | `CompetitiveIntelligence` |
| `/admin/rvt-intelligence` | `RVTIntelligence` |
| `/admin/gap-analysis` | `GapAnalysisPage` |
| `/admin/health-report` | `UnifiedHealthReport` |
| `/admin/uat-test-matrix` | `UATTestMatrix` |
| `/unified-operations` | `UnifiedOperationsDashboard` |

Legacy redirects: `/admin-dashboard`, `/enhanced-admin-dashboard`, `/admin/dashboard` → `/admin`.

## UAT routes

| Path | Page | Audience |
|------|------|----------|
| `/uat/validation-checklist` | `UATValidationPage` | Internal QA |
| `/uat/evidence` | `UATEvidenceSubmission` | Internal QA |
| `/uat/feedback` | `UATFeedback` | **Louis + Dani** — the new tester form |

## Catch-alls

- `/dispensary-portal` → `/dispensary-manager-dashboard`
- `/student/dashboard`, `/student` → `/student-dashboard`
- `/manager/dashboard` → `/dispensary-manager-dashboard`
- `*` → `NotFound`

## Gaps surfaced

1. **No declarative role guard at the route layer.** `RequireAccess` is used for course gating only. Admin/manager protection lives inside each page. Risk: a missed `has_role` check exposes admin tooling.
2. **Duplicate `/system-health` route** — declared once public, once protected. Last definition wins (protected).
3. **`/payment` is public** — confirm intentional; Stripe init usually requires session.
