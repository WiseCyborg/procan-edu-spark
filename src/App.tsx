import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import EnhancedAdminDashboard from "./pages/EnhancedAdminDashboard";
import RealTimeOperationsDashboard from "./pages/RealTimeOperationsDashboard";
import Profile from "./pages/Profile";
import CourseLayout from "./pages/Course/CourseLayout";
import EnhancedCourseModule from "./components/course/EnhancedCourseModule";
import FinalExam from "./pages/Course/FinalExam";
import PaymentSuccess from "./pages/PaymentSuccess";
import Certificates from "./pages/Certificates";
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
import DemoAccountsSetup from "./pages/DemoAccountsSetup";
import SystemHealthDashboard from "./pages/SystemHealthDashboard";
import UnifiedHealthReport from "./pages/UnifiedHealthReport";
import AcceptInvitation from "./pages/AcceptInvitation";
import RoleSelectionDashboard from "./pages/RoleSelectionDashboard";
import OnboardingSetup from "./pages/OnboardingSetup";
import OperationsCommandCenter from "./pages/OperationsCommandCenter";
import ExamAnalyticsPage from "./pages/ExamAnalyticsPage";

import { ProtectedCourseAccess } from "./components/ProtectedCourseAccess";

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
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
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
              <TooltipProvider>
          <Toaster />
          <Sonner />
          <LiveRegion />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <SkipNavigation />
              <Header />
              <div className="container mx-auto px-4 py-2">
                <COMARBanner />
              </div>
              <main id="main-content" role="main">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/training-handbook" element={<TrainingHandbook />} />
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
                       <AdminDashboard />
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
                   
                   <Route path="/admin/demo-setup" element={
                     <ProtectedRoute>
                       <DemoAccountsSetup />
                     </ProtectedRoute>
                   } />
                   
                   <Route path="/enhanced-admin-dashboard" element={
                     <ProtectedRoute>
                       <EnhancedAdminDashboard />
                     </ProtectedRoute>
                   } />
                   
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
                     
                     <Route path="/accept-invitation" element={<AcceptInvitation />} />
                   
                   <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
            <DraggableVoiceAssistant />
          </BrowserRouter>
              </TooltipProvider>
            </OrganizationProvider>
          </Suspense>
        </AuthProvider>
      </UnifiedVoiceProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
