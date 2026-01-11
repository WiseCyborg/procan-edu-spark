import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccessSnapshot, DenyReason, isAdminFromSnapshot, isManagerFromSnapshot } from '@/hooks/useAccessSnapshot';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requireCourseAccess?: boolean;
  courseId?: string;
  fallbackPath?: string;
}

/**
 * Loading spinner component for route guards
 */
const GuardLoading = () => (
  <div className="flex justify-center items-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

/**
 * Get redirect path based on deny reason
 */
const getRedirectPath = (denyReason: DenyReason): string => {
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
      return '/dashboard';
  }
};

/**
 * Base Protected Route - requires authentication only
 */
export const ProtectedRouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  fallbackPath = '/auth' 
}) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <GuardLoading />;
  }
  
  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  return <>{children}</>;
};

/**
 * Admin Route Guard - requires admin role
 */
export const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { snapshot, isLoading: snapshotLoading } = useAccessSnapshot();
  
  if (authLoading || snapshotLoading) {
    return <GuardLoading />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!isAdminFromSnapshot(snapshot)) {
    console.warn('[AdminRouteGuard] Access denied - not admin');
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Manager Route Guard - requires dispensary_manager or admin role
 */
export const ManagerRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { snapshot, isLoading: snapshotLoading } = useAccessSnapshot();
  
  if (authLoading || snapshotLoading) {
    return <GuardLoading />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  const isManager = isManagerFromSnapshot(snapshot);
  const isAdmin = isAdminFromSnapshot(snapshot);
  
  if (!isManager && !isAdmin) {
    console.warn('[ManagerRouteGuard] Access denied - not manager or admin');
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Course Access Route Guard - requires course access entitlement
 */
export const CourseAccessGuard: React.FC<{ 
  children: React.ReactNode;
  courseId?: string;
}> = ({ children, courseId }) => {
  const { user, loading: authLoading } = useAuth();
  const { snapshot, isLoading: snapshotLoading } = useAccessSnapshot(courseId);
  const location = useLocation();
  
  if (authLoading || snapshotLoading) {
    return <GuardLoading />;
  }
  
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // Admins always have access
  if (isAdminFromSnapshot(snapshot)) {
    return <>{children}</>;
  }
  
  if (!snapshot.can_access_course) {
    const redirectPath = getRedirectPath(snapshot.deny_reason);
    console.warn('[CourseAccessGuard] Access denied:', snapshot.deny_reason);
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

/**
 * Role-based Route Guard - requires specific roles
 */
export const RoleRouteGuard: React.FC<{
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}> = ({ children, allowedRoles, fallbackPath = '/dashboard' }) => {
  const { user, loading: authLoading } = useAuth();
  const { snapshot, isLoading: snapshotLoading } = useAccessSnapshot();
  
  if (authLoading || snapshotLoading) {
    return <GuardLoading />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  const hasRequiredRole = allowedRoles.some(role => snapshot.roles?.includes(role));
  
  if (!hasRequiredRole) {
    console.warn('[RoleRouteGuard] Access denied - missing required role. Has:', snapshot.roles, 'Needs:', allowedRoles);
    return <Navigate to={fallbackPath} replace />;
  }
  
  return <>{children}</>;
};

/**
 * Composite guard that combines multiple checks
 */
export const CompositeGuard: React.FC<{
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRoles?: string[];
  requireCourseAccess?: boolean;
  courseId?: string;
  fallbackPath?: string;
}> = ({ 
  children, 
  requireAuth = true,
  requireRoles,
  requireCourseAccess = false,
  courseId,
  fallbackPath = '/dashboard',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { snapshot, isLoading: snapshotLoading } = useAccessSnapshot(courseId);
  const location = useLocation();
  
  if (authLoading || snapshotLoading) {
    return <GuardLoading />;
  }
  
  // Auth check
  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // Role check
  if (requireRoles && requireRoles.length > 0) {
    const hasRequiredRole = requireRoles.some(role => snapshot.roles?.includes(role));
    if (!hasRequiredRole && !isAdminFromSnapshot(snapshot)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }
  
  // Course access check
  if (requireCourseAccess && !snapshot.can_access_course && !isAdminFromSnapshot(snapshot)) {
    const redirectPath = getRedirectPath(snapshot.deny_reason);
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};
