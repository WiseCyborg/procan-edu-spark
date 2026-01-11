import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { DenyReason } from '@/hooks/useAccessSnapshot';

interface RequireAccessProps {
  children: ReactNode;
  requireCourseAccess?: boolean;
  courseId?: string;
}

interface AccessState {
  loading: boolean;
  allowed: boolean;
  redirectTo?: string;
}

/**
 * Get the correct redirect path based on deny reason
 */
const getGateRedirect = (denyReason: DenyReason): string => {
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

/**
 * RequireAccess Route Guard
 * 
 * Prevents crashes by verifying session + access BEFORE rendering protected content.
 * This ensures users never see a generic error screen from auth/access failures.
 * 
 * Key behaviors:
 * - No session → redirect to /auth with return path
 * - Session but access denied → redirect to appropriate gate (payment/join/suspended)
 * - Session + access OK → render children
 * - RPC error → redirect to /auth?reason=db_error (not crash)
 */
export const RequireAccess: React.FC<RequireAccessProps> = ({
  children,
  requireCourseAccess = false,
  courseId,
}) => {
  const location = useLocation();
  const [state, setState] = useState<AccessState>({
    loading: true,
    allowed: false,
  });

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        // Step 1: Check session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.warn('[RequireAccess] No session, redirecting to auth');
          if (!cancelled) {
            setState({
              loading: false,
              allowed: false,
              redirectTo: `/auth?next=${encodeURIComponent(location.pathname)}`,
            });
          }
          return;
        }

        // Step 2: If course access required, check access snapshot
        if (requireCourseAccess && courseId) {
          try {
            const { data: snapshot, error: rpcError } = await supabase.rpc('get_access_snapshot', {
              p_course_id: courseId,
            });

            if (rpcError) {
              console.error('[RequireAccess] RPC error:', rpcError);
              if (!cancelled) {
                setState({
                  loading: false,
                  allowed: false,
                  redirectTo: '/auth?reason=db_error',
                });
              }
              return;
            }

            const accessData = snapshot as unknown as {
              can_access_course: boolean;
              deny_reason: DenyReason;
              roles: string[];
            };

            // Check if admin (always allowed)
            const isAdmin = accessData.roles?.includes('admin');

            if (!accessData.can_access_course && !isAdmin) {
              const redirectTo = getGateRedirect(accessData.deny_reason);
              console.warn('[RequireAccess] Access denied:', accessData.deny_reason);
              if (!cancelled) {
                setState({ loading: false, allowed: false, redirectTo });
              }
              return;
            }
          } catch (e) {
            console.error('[RequireAccess] Unexpected error:', e);
            if (!cancelled) {
              setState({
                loading: false,
                allowed: false,
                redirectTo: '/auth?reason=db_error',
              });
            }
            return;
          }
        }

        // Access granted
        if (!cancelled) {
          setState({ loading: false, allowed: true });
        }
      } catch (e) {
        console.error('[RequireAccess] Fatal error:', e);
        if (!cancelled) {
          setState({
            loading: false,
            allowed: false,
            redirectTo: '/auth?reason=error',
          });
        }
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, requireCourseAccess, courseId]);

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect if not allowed
  if (!state.allowed && state.redirectTo) {
    return <Navigate to={state.redirectTo} replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default RequireAccess;
