import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationAccess {
  hasAccess: boolean;
  isLoading: boolean;
  organizationName: string | null;
  creditsRemaining: number;
}

// Cache configuration: seat assignments change infrequently
const ACCESS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const ACCESS_GC_TIME = 30 * 60 * 1000; // 30 minutes

export const useOrganizationAccess = (userId: string | undefined): OrganizationAccess => {
  const { data, isLoading } = useQuery({
    queryKey: ['organization-access', userId],
    queryFn: async () => {
      if (!userId) {
        return { hasAccess: false, organizationName: null, creditsRemaining: 0 };
      }

      // Get user's profile with organization_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile?.organization_id) {
        return { hasAccess: false, organizationName: null, creditsRemaining: 0 };
      }

      // Check if organization exists and is approved
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('name, payment_status, admin_approved')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        return { hasAccess: false, organizationName: null, creditsRemaining: 0 };
      }

      // Check if THIS USER has an allocated or used seat
      const { data: userSeat, error: seatError } = await supabase
        .from('rvt_seats')
        .select('id, status')
        .eq('assigned_user_id', userId)
        .eq('organization_id', profile.organization_id)
        .in('status', ['assigned', 'used'])
        .limit(1)
        .maybeSingle();

      if (seatError) {
        console.error('Error checking user seat:', seatError);
        return { hasAccess: false, organizationName: org?.name ?? null, creditsRemaining: 0 };
      }

      // Accept 'paid', 'approved', or 'test' as valid payment statuses
      const validPaymentStatuses = ['paid', 'approved', 'test'];
      const hasValidAccess = 
        validPaymentStatuses.includes(org?.payment_status || '') && 
        org?.admin_approved === true &&
        !!userSeat; // User MUST have a seat

      return {
        hasAccess: hasValidAccess,
        organizationName: org?.name ?? null,
        creditsRemaining: userSeat ? 1 : 0, // Legacy field - now just indicates seat presence
      };
    },
    enabled: !!userId,
    staleTime: ACCESS_STALE_TIME,
    gcTime: ACCESS_GC_TIME,
  });

  return { 
    hasAccess: data?.hasAccess ?? false, 
    isLoading, 
    organizationName: data?.organizationName ?? null,
    creditsRemaining: data?.creditsRemaining ?? 0,
  };
};
