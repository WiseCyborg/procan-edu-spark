import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHighestMemberType, type MemberType } from '@/hooks/useOrganizationMembership';
import { Loader2 } from 'lucide-react';

interface MemberTypeGuardProps {
  children: React.ReactNode;
  allowedTypes: MemberType[];
  fallbackPath?: string;
}

/**
 * Route guard that checks organization membership type
 * Uses the new 3-layer authorization model
 */
export const MemberTypeGuard: React.FC<MemberTypeGuardProps> = ({
  children,
  allowedTypes,
  fallbackPath = '/student',
}) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { highestMemberType, isLoading: membershipLoading, memberships } = useHighestMemberType();

  const isLoading = authLoading || membershipLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user has required member type
  const hasAccess = memberships.some(m => allowedTypes.includes(m.member_type));

  if (!hasAccess) {
    console.log(`[MemberTypeGuard] Access denied. Required: ${allowedTypes.join(', ')}. User has: ${memberships.map(m => m.member_type).join(', ')}`);
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

/**
 * Guard for manager/owner routes
 */
export const ManagerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemberTypeGuard allowedTypes={['manager', 'owner']} fallbackPath="/student">
    {children}
  </MemberTypeGuard>
);

/**
 * Guard for coordinator+ routes (coordinator, manager, owner)
 */
export const CoordinatorGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemberTypeGuard allowedTypes={['coordinator', 'manager', 'owner']} fallbackPath="/student">
    {children}
  </MemberTypeGuard>
);

/**
 * Guard that allows any authenticated user with organization membership
 */
export const OrgMemberGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemberTypeGuard 
    allowedTypes={['employee', 'coordinator', 'manager', 'owner']} 
    fallbackPath="/auth"
  >
    {children}
  </MemberTypeGuard>
);

export default MemberTypeGuard;
