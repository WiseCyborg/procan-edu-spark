import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccessSnapshot, DenyReason } from '@/hooks/useAccessSnapshot';
import { useUserRole } from '@/hooks/useUserRole';
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Get the correct redirect path for access denials
 */
export const getGatePath = (denyReason: DenyReason): string => {
  switch (denyReason) {
    case 'enrollment_required':
      return '/auth?tab=signup';
    case 'payment_required':
      return '/payment';
    case 'org_seat_required':
      return '/auth?tab=accesskey';
    case 'suspended':
      return '/auth?reason=suspended';
    case 'expired':
      return '/renew';
    default:
      return '/';
  }
};

interface NavigationState {
  isNavigating: boolean;
  error: string | null;
}

interface UseGuardedNavigationReturn {
  navigateToDashboard: () => Promise<void>;
  navigateToCourse: () => Promise<void>;
  state: NavigationState;
}

/**
 * Hook for guarded navigation that verifies access before routing.
 * Prevents "disconnected" scenarios by validating session + access snapshot
 * before any navigation to protected areas.
 */
export const useGuardedNavigation = (): UseGuardedNavigationReturn => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isDispensaryManager, isTrainingCoordinator } = useUserRole();
  const [state, setState] = useState<NavigationState>({
    isNavigating: false,
    error: null,
  });

  /**
   * Get the appropriate dashboard route based on roles
   */
  const getDashboardRoute = useCallback(() => {
    if (isAdmin) return '/admin';
    if (isTrainingCoordinator) return '/training-coordinator-dashboard';
    if (isDispensaryManager) return '/dispensary-manager-dashboard';
    return '/student-dashboard';
  }, [isAdmin, isDispensaryManager, isTrainingCoordinator]);

  /**
   * Verify session and fetch access snapshot directly
   */
  const verifyAccess = async (): Promise<{
    hasSession: boolean;
    canAccess: boolean;
    denyReason: DenyReason | null;
    error: string | null;
  }> => {
    try {
      // Step 1: Verify session exists
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        console.warn('[GuardedNav] No valid session:', sessionError?.message);
        return {
          hasSession: false,
          canAccess: false,
          denyReason: null,
          error: null,
        };
      }

      // Step 2: Fetch access snapshot from DB
      const { data, error } = await supabase.rpc('get_access_snapshot', {
        p_course_id: null, // General access check
      });

      if (error) {
        console.error('[GuardedNav] Access check RPC failed:', error);
        return {
          hasSession: true,
          canAccess: false,
          denyReason: null,
          error: 'Connection issue - please try again',
        };
      }

      const snapshot = data as unknown as {
        can_access_course: boolean;
        deny_reason: DenyReason;
      };

      return {
        hasSession: true,
        canAccess: snapshot?.can_access_course ?? false,
        denyReason: snapshot?.deny_reason ?? 'none',
        error: null,
      };
    } catch (e) {
      console.error('[GuardedNav] Unexpected error:', e);
      return {
        hasSession: false,
        canAccess: false,
        denyReason: null,
        error: 'Connection issue - please try again',
      };
    }
  };

  /**
   * Navigate to dashboard with full access verification
   */
  const navigateToDashboard = useCallback(async () => {
    if (authLoading) return;

    setState({ isNavigating: true, error: null });

    try {
      // If not logged in, go to auth
      if (!user) {
        navigate('/auth?next=/dashboard');
        return;
      }

      // Verify access via DB
      const access = await verifyAccess();

      if (!access.hasSession) {
        // Session expired or invalid
        navigate('/auth?reason=session_expired');
        return;
      }

      if (access.error) {
        // DB connection issue
        setState({ isNavigating: false, error: access.error });
        console.error('[GuardedNav]', access.error);
        // Still navigate - dashboard will handle the error state
        navigate(getDashboardRoute());
        return;
      }

      // Navigation is allowed - route to appropriate dashboard
      navigate(getDashboardRoute());
    } catch (e) {
      console.error('[GuardedNav] Navigation failed:', e);
      setState({ isNavigating: false, error: 'Navigation failed' });
      // Fallback: still try to navigate
      navigate(getDashboardRoute());
    } finally {
      setState(prev => ({ ...prev, isNavigating: false }));
    }
  }, [user, authLoading, navigate, getDashboardRoute]);

  /**
   * Navigate to course with access verification
   */
  const navigateToCourse = useCallback(async () => {
    if (authLoading) return;

    setState({ isNavigating: true, error: null });

    try {
      if (!user) {
        navigate('/auth?next=/course');
        return;
      }

      const access = await verifyAccess();

      if (!access.hasSession) {
        navigate('/auth?reason=session_expired');
        return;
      }

      if (access.error) {
        setState({ isNavigating: false, error: access.error });
        // Still navigate - course guard will handle it
        navigate('/course');
        return;
      }

      if (!access.canAccess && access.denyReason && access.denyReason !== 'none') {
        // Route to appropriate gate
        const gatePath = getGatePath(access.denyReason);
        navigate(gatePath);
        return;
      }

      // Access granted - go to course
      navigate('/course');
    } catch (e) {
      console.error('[GuardedNav] Course navigation failed:', e);
      setState({ isNavigating: false, error: 'Navigation failed' });
      navigate('/course');
    } finally {
      setState(prev => ({ ...prev, isNavigating: false }));
    }
  }, [user, authLoading, navigate]);

  return {
    navigateToDashboard,
    navigateToCourse,
    state,
  };
};
