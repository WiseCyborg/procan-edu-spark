import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AdminPermission =
  | 'user_create'
  | 'user_edit'
  | 'user_delete'
  | 'user_view_all'
  | 'org_create'
  | 'org_edit'
  | 'org_delete'
  | 'org_view_all'
  | 'role_assign'
  | 'role_revoke'
  | 'certificate_issue'
  | 'certificate_revoke'
  | 'certificate_view_all'
  | 'payment_view'
  | 'payment_refund'
  | 'content_edit'
  | 'content_publish'
  | 'analytics_view'
  | 'security_audit'
  | 'system_settings';

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Set<AdminPermission>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions(new Set());
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          setIsLoading(false);
          return;
        }

        const roleList = rolesData?.map(r => r.role) || [];

        if (roleList.length === 0) {
          setPermissions(new Set());
          setIsLoading(false);
          return;
        }

        // Fetch permissions for these roles
        const { data: permsData, error: permsError } = await supabase
          .from('role_permissions')
          .select('permission')
          .in('role', roleList);

        if (permsError) {
          console.error('Error fetching permissions:', permsError);
          setIsLoading(false);
          return;
        }

        const permSet = new Set<AdminPermission>(
          permsData?.map(p => p.permission as AdminPermission) || []
        );
        setPermissions(permSet);
      } catch (error) {
        console.error('Error in fetchPermissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (permission: AdminPermission): boolean => {
    return permissions.has(permission);
  };

  const hasAnyPermission = (...perms: AdminPermission[]): boolean => {
    return perms.some(p => permissions.has(p));
  };

  const hasAllPermissions = (...perms: AdminPermission[]): boolean => {
    return perms.every(p => permissions.has(p));
  };

  // Convenience flags
  const isAdmin = permissions.has('system_settings');
  const isManager = permissions.has('org_view_all');
  const canManageUsers = permissions.has('user_edit');
  const canViewAnalytics = permissions.has('analytics_view');
  const canManageCertificates = permissions.has('certificate_issue');

  return {
    permissions: Array.from(permissions),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isManager,
    canManageUsers,
    canViewAnalytics,
    canManageCertificates,
    isLoading
  };
};
