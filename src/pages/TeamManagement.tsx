import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

const TeamManagement = () => {
  const navigate = useNavigate();
  const { isDispensaryManager, isTrainingCoordinator, isStudent, isLoading } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    // Priority routing based on role hierarchy
    if (isDispensaryManager) {
      navigate('/dispensary-manager-dashboard', { replace: true });
    } else if (isTrainingCoordinator) {
      navigate('/training-coordinator-dashboard', { replace: true });
    } else if (isStudent) {
      navigate('/student-dashboard', { replace: true });
    } else {
      // No recognized team role - send to general dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, isDispensaryManager, isTrainingCoordinator, isStudent, navigate]);

  // Show loading state while determining role
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading team management...</p>
    </div>
  );
};

export default TeamManagement;
