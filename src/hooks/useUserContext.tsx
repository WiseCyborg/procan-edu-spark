import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

export interface UserContext {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  org_id: string | null;
  org_name: string | null;
  seat_status: {
    assigned: boolean;
    total_seats: number;
    available_seats: number;
    used_seats: number;
  };
  training_status: {
    enrolled: boolean;
    course_id: string | null;
    completion_percentage: number;
    current_module: number;
    total_modules: number;
    is_locked: boolean;
    locked_reason: string | null;
  };
  cert_status: {
    certified: boolean;
    certificate_id: string | null;
    certificate_number: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    is_expired: boolean;
  };
  pending_applications: number;
  pending_invitations: number;
  unregistered_managers: number;
}

const defaultContext: UserContext = {
  user_id: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'student',
  roles: [],
  org_id: null,
  org_name: null,
  seat_status: {
    assigned: false,
    total_seats: 0,
    available_seats: 0,
    used_seats: 0,
  },
  training_status: {
    enrolled: false,
    course_id: null,
    completion_percentage: 0,
    current_module: 0,
    total_modules: 23,
    is_locked: false,
    locked_reason: null,
  },
  cert_status: {
    certified: false,
    certificate_id: null,
    certificate_number: null,
    issue_date: null,
    expiry_date: null,
    is_expired: false,
  },
  pending_applications: 0,
  pending_invitations: 0,
  unregistered_managers: 0,
};

export const useUserContext = () => {
  const { user } = useAuth();
  const { roles, isAdmin, isDispensaryManager, isTrainingCoordinator } = useUserRole();
  const location = useLocation();
  const [context, setContext] = useState<UserContext>(defaultContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserContext = useCallback(async () => {
    if (!user) {
      setContext(defaultContext);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email_cache, organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setContext({ ...defaultContext, user_id: user.id, email: user.email || '' });
        setIsLoading(false);
        return;
      }

      // Fetch organization if user has one
      let orgData = null;
      let seatData = { total: 0, used: 0, available: 0 };
      
      if (profile.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', profile.organization_id)
          .single();
        
        orgData = org;

        // Fetch seat status
        const { data: seats } = await supabase
          .from('rvt_seats')
          .select('id, assigned_user_id')
          .eq('organization_id', profile.organization_id);

        if (seats) {
          seatData.total = seats.length;
          seatData.used = seats.filter(s => s.assigned_user_id).length;
          seatData.available = seatData.total - seatData.used;
        }
      }

      // Fetch training progress
      const { data: enrollments } = await supabase
        .from('user_progress')
        .select('course_id, module_id, is_completed')
        .eq('user_id', user.id);

      const completedModules = enrollments?.filter(e => e.is_completed).length || 0;
      const totalModules = 23;
      const completionPercentage = Math.round((completedModules / totalModules) * 100);

      // Fetch certificate status
      const { data: certificates } = await supabase
        .from('certificates')
        .select('id, certificate_number, issue_date, expiry_date')
        .eq('user_id', user.id)
        .order('issue_date', { ascending: false })
        .limit(1);

      const cert = certificates?.[0];
      const isExpired = cert?.expiry_date ? new Date(cert.expiry_date) < new Date() : false;

      // Admin-specific data
      let pendingApplications = 0;
      let pendingInvitations = 0;
      let unregisteredManagers = 0;

      if (isAdmin) {
        const { count: appCount } = await supabase
          .from('dispensary_applications')
          .select('*', { count: 'exact', head: true })
          .eq('application_status', 'pending');
        pendingApplications = appCount || 0;

        const { count: invCount } = await supabase
          .from('staff_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingInvitations = invCount || 0;

        const { count: managerCount } = await supabase
          .from('dispensary_applications')
          .select('*', { count: 'exact', head: true })
          .eq('application_status', 'approved')
          .eq('registration_completed', false);
        unregisteredManagers = managerCount || 0;
      }

      // Manager-specific data
      if (isDispensaryManager && profile.organization_id) {
        const { count: invCount } = await supabase
          .from('staff_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .eq('status', 'pending');
        pendingInvitations = invCount || 0;
      }

      const primaryRole = roles[0] || 'student';

      setContext({
        user_id: user.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email_cache || user.email || '',
        role: primaryRole,
        roles,
        org_id: profile.organization_id,
        org_name: orgData?.name || null,
        seat_status: {
          assigned: !!profile.organization_id,
          total_seats: seatData.total,
          available_seats: seatData.available,
          used_seats: seatData.used,
        },
        training_status: {
          enrolled: (enrollments?.length || 0) > 0,
          course_id: enrollments?.[0]?.course_id || null,
          completion_percentage: completionPercentage,
          current_module: completedModules + 1,
          total_modules: totalModules,
          is_locked: false,
          locked_reason: null,
        },
        cert_status: {
          certified: !!cert,
          certificate_id: cert?.id || null,
          certificate_number: cert?.certificate_number || null,
          issue_date: cert?.issue_date || null,
          expiry_date: cert?.expiry_date || null,
          is_expired: isExpired,
        },
        pending_applications: pendingApplications,
        pending_invitations: pendingInvitations,
        unregistered_managers: unregisteredManagers,
      });

      setError(null);
    } catch (err) {
      console.error('[useUserContext] Error fetching context:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user context'));
    } finally {
      setIsLoading(false);
    }
  }, [user, roles, isAdmin, isDispensaryManager]);

  // Fetch on mount and when user/roles change
  useEffect(() => {
    fetchUserContext();
  }, [fetchUserContext]);

  // Refresh on route change
  useEffect(() => {
    if (user) {
      fetchUserContext();
    }
  }, [location.pathname]);

  // Get display greeting
  const getGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return {
    context,
    isLoading,
    error,
    refresh: fetchUserContext,
    greeting: getGreeting,
    currentPage: location.pathname,
  };
};
