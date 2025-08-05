import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'student' | 'dispensary_manager' | 'admin';

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    const fetchUserRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          return;
        }

        setRoles(data?.map(r => r.role) || ['student']);
      } catch (error) {
        console.error('Error in fetchUserRoles:', error);
        setRoles(['student']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRoles();
  }, [user]);

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  const isStudent = hasRole('student');
  const isDispensaryManager = hasRole('dispensary_manager');
  const isAdmin = hasRole('admin');

  return {
    roles,
    hasRole,
    isStudent,
    isDispensaryManager,
    isAdmin,
    isLoading
  };
};