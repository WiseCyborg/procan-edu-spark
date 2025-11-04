import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ManagerOnboarding } from '@/components/onboarding/ManagerOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

export default function OnboardingSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDispensaryManager, isTrainingCoordinator, isLoading } = useUserRole();
  const [searchParams] = useSearchParams();
  const isFirstLogin = searchParams.get('first_login') === 'true';

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isLoading) return;

    // Check if user has already completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(`onboarding_complete_${user.id}`);
    
    if (hasCompletedOnboarding && !isFirstLogin) {
      // Already completed, redirect to appropriate dashboard
      if (isDispensaryManager) {
        navigate('/dispensary-manager-dashboard');
      } else if (isTrainingCoordinator) {
        navigate('/training-coordinator-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isDispensaryManager, isTrainingCoordinator, isFirstLogin, isLoading, navigate]);

  const handleComplete = () => {
    // Mark onboarding as complete
    if (user) {
      localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
    }

    // Redirect to manager dashboard with welcome banner
    navigate('/dispensary-manager-dashboard?welcome=true');
  };

  const handleSkip = () => {
    // Still mark as complete to prevent re-showing
    if (user) {
      localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
    }

    // Redirect to manager dashboard
    navigate('/dispensary-manager-dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading onboarding...</p>
      </div>
    );
  }

  return (
    <ManagerOnboarding 
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}
