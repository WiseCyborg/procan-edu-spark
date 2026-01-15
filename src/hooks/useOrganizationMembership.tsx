import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Member types aligned with database enum
export type MemberType = 'employee' | 'coordinator' | 'manager' | 'owner';
export type MemberStatus = 'invited' | 'active' | 'revoked';

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  role: string; // Legacy role column
  member_type: MemberType;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
  };
}

// Cache configuration
const MEMBERSHIP_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const MEMBERSHIP_GC_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * Hook to get the current user's organization memberships
 * Returns all organizations the user belongs to with their authority level
 */
export const useOrganizationMemberships = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organization-memberships', user?.id],
    queryFn: async (): Promise<OrganizationMembership[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          email,
          role,
          member_type,
          status,
          created_at,
          updated_at,
          organizations:organization_id (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching organization memberships:', error);
        throw error;
      }

      // Transform the response to flatten organization data
      return (data || []).map((m: any) => ({
        ...m,
        organization: m.organizations
      }));
    },
    enabled: !!user?.id,
    staleTime: MEMBERSHIP_STALE_TIME,
    gcTime: MEMBERSHIP_GC_TIME,
  });
};

/**
 * Hook to check if user has a specific member type in an organization
 */
export const useHasMemberType = (
  organizationId: string | null,
  memberTypes: MemberType[]
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['has-member-type', user?.id, organizationId, memberTypes],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !organizationId) return false;

      const { data, error } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .in('member_type', memberTypes)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking member type:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id && !!organizationId && memberTypes.length > 0,
    staleTime: MEMBERSHIP_STALE_TIME,
    gcTime: MEMBERSHIP_GC_TIME,
  });
};

/**
 * Hook to get the user's highest authority level across all organizations
 */
export const useHighestMemberType = () => {
  const { data: memberships, isLoading } = useOrganizationMemberships();

  const hierarchy: MemberType[] = ['owner', 'manager', 'coordinator', 'employee'];
  
  let highestType: MemberType | null = null;
  let highestOrgId: string | null = null;

  if (memberships && memberships.length > 0) {
    for (const type of hierarchy) {
      const match = memberships.find(m => m.member_type === type);
      if (match) {
        highestType = type;
        highestOrgId = match.organization_id;
        break;
      }
    }
  }

  return {
    highestMemberType: highestType,
    highestOrganizationId: highestOrgId,
    memberships: memberships || [],
    isLoading,
    canManageOrg: highestType && ['owner', 'manager'].includes(highestType),
    canViewTeam: highestType && ['owner', 'manager', 'coordinator'].includes(highestType),
  };
};

/**
 * Permission helpers based on member type
 */
export const memberTypePermissions = {
  employee: {
    canViewOwnCourses: true,
    canResumeTraining: true,
    canTakeExams: true,
    canViewCertificates: true,
    canViewTeam: false,
    canAssignTraining: false,
    canManageOrg: false,
    canApproveRoles: false,
  },
  coordinator: {
    canViewOwnCourses: true,
    canResumeTraining: true,
    canTakeExams: true,
    canViewCertificates: true,
    canViewTeam: true,
    canAssignTraining: true,
    canManageOrg: false,
    canApproveRoles: false,
  },
  manager: {
    canViewOwnCourses: true,
    canResumeTraining: true,
    canTakeExams: true,
    canViewCertificates: true,
    canViewTeam: true,
    canAssignTraining: true,
    canManageOrg: true,
    canApproveRoles: true,
  },
  owner: {
    canViewOwnCourses: true,
    canResumeTraining: true,
    canTakeExams: true,
    canViewCertificates: true,
    canViewTeam: true,
    canAssignTraining: true,
    canManageOrg: true,
    canApproveRoles: true,
  },
} as const;

export const getPermissions = (memberType: MemberType | null) => {
  if (!memberType) {
    return memberTypePermissions.employee;
  }
  return memberTypePermissions[memberType];
};
