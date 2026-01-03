import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { UnifiedVoiceProvider } from "@/providers/UnifiedVoiceProvider";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkipNavigation } from "@/components/layout/SkipNavigation";
import { Footer } from "@/components/layout/Footer";
import { LiveRegion } from "@/components/accessibility/LiveRegion";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import WelcomeVideo from "./pages/WelcomeVideo";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import CertificateVerification from "./pages/CertificateVerification";
import StoplightStandard from "./pages/StoplightStandard";
import ProCannLive from "./pages/ProCannLive";
import DispensaryPortal from "./pages/DispensaryPortal";
import EnhancedDispensaryPortal from "./pages/EnhancedDispensaryPortal";
import AdminDashboard from "./pages/AdminDashboard";
import AdminManagement from "./pages/AdminManagement";
import DispensaryManagerDashboard from "./pages/DispensaryManagerDashboard";
import TrainingCoordinatorDashboard from "./pages/TrainingCoordinatorDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import AdminMissionControl from "./pages/AdminMissionControl";
import RealTimeOperationsDashboard from "./pages/RealTimeOperationsDashboard";
import Profile from "./pages/Profile";
import CourseLayout from "./pages/Course/CourseLayout";
import EnhancedCourseModule from "./pages/Course/EnhancedCourseModule";
import FinalExam from "./pages/Course/FinalExam";
import Certificates from "./pages/Certificates";
import PaymentSuccess from "./pages/PaymentSuccess";
import Dashboard from "./components/dashboard/Dashboard";
import Header from "./components/layout/Header";
import DraggableVoiceAssistant from "./components/chat/DraggableVoiceAssistant";
import PurchaseSeats from "./pages/PurchaseSeats";
import SecureCertificateVerification from "./pages/SecureCertificateVerification";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import UnifiedOperationsDashboard from "./pages/UnifiedOperationsDashboard";
import ContentReviewDashboard from "./pages/ContentReviewDashboard";
import TrainingHandbook from "./pages/TrainingHandbook";
import DispensaryApplication from "./pages/DispensaryApplication";
import ManagerRegistration from "./pages/ManagerRegistration";
import GetStarted from "./pages/GetStarted";
import TeamManagement from "./pages/TeamManagement";
import { COMARBanner } from "./components/layout/COMARBanner";
import ActivateAiLean from "./pages/ActivateAiLean";
import AiLeanInfo from "./pages/AiLeanInfo";
import StateOfficialsPage from "./pages/StateOfficialsPage";
import AboutTeamPage from "./pages/AboutTeamPage";
import ComplianceCurriculumMatrixPage from "./pages/ComplianceCurriculumMatrixPage";
import ComplianceContentReviewPage from "./pages/ComplianceContentReviewPage";
import EmployersPage from "./pages/EmployersPage";
import ImpactDashboardPage from "./pages/ImpactDashboardPage";
import AccessibilityPage from "./pages/AccessibilityPage";
import OwnersIntelligence from "./pages/OwnersIntelligence";
import CompetitiveIntelligence from "./pages/CompetitiveIntelligence";
import { ProfileOnboardingWizard } from "./components/onboarding/ProfileOnboardingWizard";
import ForgotPassword from "./pages/ForgotPassword";
import DemoAccountsSetup from "./pages/DemoAccountsSetup";
import SystemHealthDashboard from "./pages/SystemHealthDashboard";
import UnifiedHealthReport from "./pages/UnifiedHealthReport";
import AcceptInvitation from "./pages/AcceptInvitation";
import RoleSelectionDashboard from "./pages/RoleSelectionDashboard";
import OnboardingSetup from "./pages/OnboardingSetup";
import OperationsCommandCenter from "./pages/OperationsCommandCenter";
import ExamAnalyticsPage from "./pages/ExamAnalyticsPage";
import CompetitorComparison from "./pages/CompetitorComparison";
import ROICalculatorPublic from "./pages/ROICalculatorPublic";
import SuccessStories from "./pages/SuccessStories";
import MCAComplianceReview from "./pages/MCAComplianceReview";
import RegulatoryExplorerPage from "./pages/RegulatoryExplorerPage";
import PipelineMonitor from "./pages/admin/PipelineMonitor";
import RVTIntelligence from "./pages/RVTIntelligence";
import GapAnalysisPage from "./pages/GapAnalysisPage";
import ConsumerEducation from "./pages/ConsumerEducation";
import ConsumerCourse from "./pages/ConsumerCourse";
import ConsumerCertificates from "./pages/ConsumerCertificates";
import EmailDomainVerification from "./pages/admin/EmailDomainVerification";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CertificateRenewal from "./pages/CertificateRenewal";
import AdminUtilities from "./pages/AdminUtilities";
import UATValidationPage from "./pages/UATValidationPage";
import UATEvidenceSubmission from "./pages/UATEvidenceSubmission";
import UATDispensaryOnboarding from "./pages/UATDispensaryOnboarding";

import { ProtectedCourseAccess } from "./components/ProtectedCourseAccess";
import { JourneyStateProvider } from "./providers/JourneyStateProvider";
import { KeyboardShortcutsProvider } from "./contexts/KeyboardShortcutsContext";
import { KeyboardShortcutsDialog } from "./components/help/KeyboardShortcutsDialog";
import { CommunicationHubPage } from "./pages/CommunicationHubPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode');
  const tab = searchParams.get('tab');

  // Allow password reset even if logged in
  const isPasswordReset = mode === 'reset';

  // Allow logged-in users to access utility registration flows (used when course access is blocked)
  const isUtilityAuthTab = tab === 'accesskey' || tab === 'code';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't redirect if this is a password reset or utility registration tab
  if (user && !isPasswordReset && !isUtilityAuthTab) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Conditional wrapper to exclude voice assistant from auth pages
const ConditionalVoiceAssistant = () => {
  const location = useLocation();
  
  // Pages where voice assistant should NOT render
  const excludedPaths = [
    '/auth',
    '/forgot-password',
    '/accept-invitation',
    '/manager-registration'
  ];
  
  // Check if on excluded path or has reset mode
  const isExcludedPage = excludedPaths.some(path => 
    location.pathname.startsWith(path)
  ) || location.search.includes('mode=reset');
  
  if (isExcludedPage) return null;
  
  return <DraggableVoiceAssistant />;
};

// Layout component that can adapt for auth vs application pages
const AppRoutesLayout = () => {
  const location = useLocation();

  const authPaths = [
    '/auth',
    '/forgot-password',
    '/accept-invitation',
    '/manager-registration'
  ];

  const isAuthPage = authPaths.some(path =>
    location.pathname.startsWith(path)
  ) || location.search.includes('mode=reset');

  return (
    <>
      <Toaster />
      <Sonner />
      <LiveRegion />
      <div className="min-h-screen bg-background">
        {!isAuthPage && (
          <>
            <SkipNavigation />
            <Header />
            <div className="container mx-auto px-4 py-2">
              <COMARBanner />
            </div>
          </>
        )}
        <main id="main-content" role="main">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/welcome-video" element={
              <ProtectedRoute>
                <WelcomeVideo />
              </ProtectedRoute>
            } />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/consumer-education" element={<ConsumerEducation />} />
            <Route path="/consumer-education/:courseId" element={<ConsumerCourse />} />
            <Route path="/consumer-certificates" element={<ConsumerCertificates />} />
            <Route path="/training-handbook" element={
              <ProtectedRoute>
                <TrainingHandbook />
              </ProtectedRoute>
            } />
            <Route path="/communication" element={
              <ProtectedRoute>
                <CommunicationHubPage />
              </ProtectedRoute>
            } />
            <Route path="/verify-certificate" element={<CertificateVerification />} />
            <Route path="/stoplight-standard" element={
              <ProtectedRoute>
                <StoplightStandard />
              </ProtectedRoute>
            } />
            <Route path="/live" element={
              <ProtectedRoute>
                <ProCannLive />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/course" element={
              <ProtectedRoute>
                <ProtectedCourseAccess>
                  <CourseLayout />
                </ProtectedCourseAccess>
              </ProtectedRoute>
            } />
            <Route path="/course/:moduleId" element={
              <ProtectedRoute>
                <ProtectedCourseAccess>
                  <EnhancedCourseModule />
                </ProtectedCourseAccess>
              </ProtectedRoute>
            } />
            <Route path="/course/final-exam" element={
              <ProtectedRoute>
                <ProtectedCourseAccess>
                  <FinalExam />
                </ProtectedCourseAccess>
              </ProtectedRoute>
            } />
            <Route path="/payment-success" element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            } />
            <Route path="/certificates" element={
              <ProtectedRoute>
                <Certificates />
              </ProtectedRoute>
            } />
            <Route path="/renew" element={
              <ProtectedRoute>
                <CertificateRenewal />
              </ProtectedRoute>
            } />
            <Route path="/dispensary-portal" element={<Navigate to="/dispensary-manager-dashboard" replace />} />
            <Route path="/purchase-seats" element={
              <ProtectedRoute>
                <PurchaseSeats />
              </ProtectedRoute>
            } />
            <Route path="/org/apply" element={<DispensaryApplication />} />
            <Route path="/register/manager" element={<ManagerRegistration />} />
            <Route path="/get-started" element={<GetStarted />} />
            <Route path="/state-officials" element={<StateOfficialsPage />} />
            <Route path="/about/team" element={<AboutTeamPage />} />
            <Route path="/compliance/curriculum-matrix" element={<ComplianceCurriculumMatrixPage />} />
            <Route path="/compliance/content-review" element={<ComplianceContentReviewPage />} />
            <Route path="/employers" element={<EmployersPage />} />
            <Route path="/impact" element={<ImpactDashboardPage />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="/why-procann" element={<CompetitorComparison />} />
            <Route path="/roi-calculator-public" element={<ROICalculatorPublic />} />
            <Route path="/success-stories" element={<SuccessStories />} />
            <Route path="/mca-compliance-review" element={<MCAComplianceReview />} />
            <Route path="/regulatory-explorer" element={<RegulatoryExplorerPage />} />
            <Route path="/team-management" element={
              <ProtectedRoute>
                <TeamManagement />
              </ProtectedRoute>
            } />
            <Route path="/role-selection" element={
              <ProtectedRoute>
                <RoleSelectionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminMissionControl />
              </ProtectedRoute>
            } />
            <Route path="/admin/management" element={
              <ProtectedRoute>
                <AdminManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/operations" element={
              <ProtectedRoute>
                <OperationsCommandCenter />
              </ProtectedRoute>
            } />
            <Route path="/admin/email-domain" element={
              <ProtectedRoute>
                <EmailDomainVerification />
              </ProtectedRoute>
            } />
            <Route path="/admin/pipeline-monitor" element={
              <ProtectedRoute>
                <PipelineMonitor />
              </ProtectedRoute>
            } />
            <Route path="/admin/utilities" element={
              <ProtectedRoute>
                <AdminUtilities />
              </ProtectedRoute>
            } />
            <Route path="/admin/demo-setup" element={
              <ProtectedRoute>
                <DemoAccountsSetup />
              </ProtectedRoute>
            } />
            <Route path="/enhanced-admin-dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/realtime-operations" element={
              <ProtectedRoute>
                <RealTimeOperationsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/onboarding/profile" element={
              <ProtectedRoute>
                <ProfileOnboardingWizard />
              </ProtectedRoute>
            } />
            <Route path="/verify/certificate/:certificateId" element={<SecureCertificateVerification />} />
            <Route path="/onboarding/setup-team" element={
              <ProtectedRoute>
                <OnboardingSetup />
              </ProtectedRoute>
            } />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/system-health" element={<SystemHealthDashboard />} />
            <Route path="/uat/validation-checklist" element={
              <ProtectedRoute>
                <UATValidationPage />
              </ProtectedRoute>
            } />
            <Route path="/uat/evidence" element={
              <ProtectedRoute>
                <UATEvidenceSubmission />
              </ProtectedRoute>
            } />
            <Route path="/activate-ailean" element={<ActivateAiLean />} />
            <Route path="/ailean-info" element={<AiLeanInfo />} />
            <Route path="/admin/advanced-analytics" element={
              <ProtectedRoute>
                <AdvancedAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/admin/exam-analytics" element={
              <ProtectedRoute>
                <ExamAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/intelligence" element={
              <ProtectedRoute>
                <OwnersIntelligence />
              </ProtectedRoute>
            } />
            <Route path="/admin/competitive-intelligence" element={
              <ProtectedRoute>
                <CompetitiveIntelligence />
              </ProtectedRoute>
            } />
            <Route path="/admin/rvt-intelligence" element={
              <ProtectedRoute>
                <RVTIntelligence />
              </ProtectedRoute>
            } />
            <Route path="/admin/gap-analysis" element={
              <ProtectedRoute>
                <GapAnalysisPage />
              </ProtectedRoute>
            } />
            <Route path="/dispensary-manager-dashboard" element={
              <ProtectedRoute>
                <DispensaryManagerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/training-coordinator-dashboard" element={
              <ProtectedRoute>
                <TrainingCoordinatorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard" element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/unified-operations" element={
              <ProtectedRoute>
                <UnifiedOperationsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/system-health" element={
              <ProtectedRoute>
                <SystemHealthDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/health-report" element={
              <ProtectedRoute>
                <UnifiedHealthReport />
              </ProtectedRoute>
            } />
            {/* Legal Pages */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            {/* Legacy/typo redirects */}
            <Route path="/student/dashboard" element={<Navigate to="/student-dashboard" replace />} />
            <Route path="/student" element={<Navigate to="/student-dashboard" replace />} />
            <Route path="/manager/dashboard" element={<Navigate to="/dispensary-manager-dashboard" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {!isAuthPage && <Footer />}
      </div>
      {!isAuthPage && <ConditionalVoiceAssistant />}
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <KeyboardShortcutsProvider>
          <UnifiedVoiceProvider>
            <AuthProvider>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading application...</p>
                  </div>
                </div>
              }>
                <OrganizationProvider>
                  <JourneyStateProvider>
                    <TooltipProvider>
                      <AppRoutesLayout />
                      <KeyboardShortcutsDialog />
                    </TooltipProvider>
                  </JourneyStateProvider>
                </OrganizationProvider>
              </Suspense>
            </AuthProvider>
          </UnifiedVoiceProvider>
        </KeyboardShortcutsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
