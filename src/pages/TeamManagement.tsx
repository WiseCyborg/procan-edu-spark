import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Loader2 } from 'lucide-react';

const TeamManagement = () => {
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const { 
    isDispensaryManager, 
    isTrainingCoordinator, 
    isStudent, 
    hasMultipleManagementRoles,
    managementRoleCount,
    isLoading 
  } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    if (flags.multi_role_selector && hasMultipleManagementRoles) {
      navigate('/role-selection', { replace: true });
      return;
    }

    if (isDispensaryManager) {
      navigate('/dispensary-manager-dashboard', { replace: true });
    } else if (isTrainingCoordinator) {
      navigate('/training-coordinator-dashboard', { replace: true });
    } else if (isStudent) {
      navigate('/student-dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [
    isLoading, 
    flags.multi_role_selector,
    hasMultipleManagementRoles, 
    isDispensaryManager, 
    isTrainingCoordinator, 
    isStudent, 
    navigate
  ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {flags.multi_role_selector && managementRoleCount > 1 
          ? 'Preparing role selection...' 
          : 'Loading team management...'}
      </p>
    </div>
  );
};

export default TeamManagement;
