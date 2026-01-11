import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'student' | 'dispensary_manager' | 'training_coordinator' | 'admin' | 'consumer' | 'trainer';

// Cache configuration: roles rarely change, cache aggressively
const ROLES_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const ROLES_GC_TIME = 30 * 60 * 1000; // 30 minutes

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return ['student'] as UserRole[];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return ['student'] as UserRole[];
      }

      const userRoles = data?.map(r => r.role as UserRole) || [];
      return userRoles.length > 0 ? userRoles : ['student'] as UserRole[];
    },
    enabled: !!user?.id,
    staleTime: ROLES_STALE_TIME,
    gcTime: ROLES_GC_TIME,
  });

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  const isStudent = hasRole('student');
  const isDispensaryManager = hasRole('dispensary_manager');
  const isTrainingCoordinator = hasRole('training_coordinator');
  const isAdmin = hasRole('admin');
  const isTrainer = hasRole('trainer');
  
  const canManageOrganization = isAdmin || isDispensaryManager || isTrainingCoordinator;
  const hasAnyRole = (...rolesToCheck: UserRole[]): boolean => {
    return rolesToCheck.some(role => roles.includes(role));
  };

  // Calculate management role count for multi-role scenarios
  const managementRoles = roles.filter(r => 
    ['dispensary_manager', 'training_coordinator', 'admin'].includes(r)
  );
  const managementRoleCount = managementRoles.length;
  const hasMultipleManagementRoles = managementRoleCount > 1;

  return {
    roles,
    hasRole,
    hasAnyRole,
    isStudent,
    isDispensaryManager,
    isTrainingCoordinator,
    isAdmin,
    isTrainer,
    canManageOrganization,
    isLoading,
    managementRoleCount,
    hasMultipleManagementRoles,
    managementRoles,
  };
};
