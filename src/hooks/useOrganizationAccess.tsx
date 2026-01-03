import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationAccess {
  hasAccess: boolean;
  isLoading: boolean;
  organizationName: string | null;
  creditsRemaining: number;
}

export const useOrganizationAccess = (userId: string | undefined): OrganizationAccess => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState(0);

  useEffect(() => {
    if (!userId) {
      setHasAccess(false);
      setIsLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        // Get user's profile with organization_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', userId)
          .single();

        if (profileError || !profile?.organization_id) {
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        // Check if organization exists and is approved
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('name, payment_status, admin_approved')
          .eq('id', profile.organization_id)
          .single();

        if (orgError) {
          console.error('Error fetching organization:', orgError);
          setHasAccess(false);
          setIsLoading(false);
          return;
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
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        // Accept 'paid', 'approved', or 'test' as valid payment statuses
        const validPaymentStatuses = ['paid', 'approved', 'test'];
        const hasValidAccess = 
          validPaymentStatuses.includes(org?.payment_status || '') && 
          org?.admin_approved === true &&
          !!userSeat; // User MUST have a seat

        setHasAccess(hasValidAccess);
        setOrganizationName(org?.name ?? null);
        setCreditsRemaining(userSeat ? 1 : 0); // Legacy field - now just indicates seat presence
      } catch (error) {
        console.error('Error in checkAccess:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [userId]);

  return { 
    hasAccess, 
    isLoading, 
    organizationName,
    creditsRemaining 
  };
};
