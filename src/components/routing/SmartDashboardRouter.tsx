import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNextAction } from '@/hooks/useNextAction';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

/**
 * SmartDashboardRouter
 * 
 * Automatically routes users to the correct dashboard based on their role and journey state.
 * This prevents users from landing on the wrong dashboard or seeing actions meant for other roles.
 */
export const SmartDashboardRouter: React.FC = () => {
  const navigate = useNavigate();
  const { dashboardRoute, nextAction, isLoading: actionLoading } = useNextAction();
  const { isLoading: rolesLoading, isAdmin, isDispensaryManager, isTrainingCoordinator, isStudent } = useUserRole();

  useEffect(() => {
    if (actionLoading || rolesLoading) return;

    // For critical actions, redirect to that action's route instead of dashboard
    if (nextAction.priority === 'critical') {
      navigate(nextAction.route, { replace: true });
      return;
    }

    // Otherwise, route to the appropriate dashboard
    // The dashboardRoute is computed based on role
    const currentPath = window.location.pathname;
    
    // Don't redirect if already on the correct dashboard
    if (currentPath === dashboardRoute) return;
    
    // Redirect to appropriate dashboard
    navigate(dashboardRoute, { replace: true });
  }, [actionLoading, rolesLoading, dashboardRoute, nextAction, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Preparing your dashboard...</p>
      </div>
    </div>
  );
};

export default SmartDashboardRouter;
