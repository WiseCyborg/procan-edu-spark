import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import CertificateVerification from "./pages/CertificateVerification";
import DispensaryPortal from "./pages/DispensaryPortal";
import EnhancedDispensaryPortal from "./pages/EnhancedDispensaryPortal";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import CourseLayout from "./pages/Course/CourseLayout";
import CourseModule from "./pages/Course/CourseModule";
import FinalExam from "./pages/Course/FinalExam";
import PaymentSuccess from "./pages/PaymentSuccess";
import Certificates from "./pages/Certificates";
import Dashboard from "./components/dashboard/Dashboard";
import Header from "./components/layout/Header";
import DraggableVoiceAssistant from "./components/chat/DraggableVoiceAssistant";

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
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/verify-certificate" element={<CertificateVerification />} />
                
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
                    <CourseLayout />
                  </ProtectedRoute>
                } />
                
                <Route path="/course/:moduleId" element={
                  <ProtectedRoute>
                    <CourseModule />
                  </ProtectedRoute>
                } />
                
                <Route path="/course/final-exam" element={
                  <ProtectedRoute>
                    <FinalExam />
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
                
                <Route path="/dispensary-portal" element={
                  <ProtectedRoute>
                    <EnhancedDispensaryPortal />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
          <DraggableVoiceAssistant />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
