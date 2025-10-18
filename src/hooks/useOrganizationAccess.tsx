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

        // Check if organization has paid status and is approved
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('name, payment_status, admin_approved, course_credits')
          .eq('id', profile.organization_id)
          .single();

        if (orgError) {
          console.error('Error fetching organization:', orgError);
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        const hasValidAccess = 
          org?.payment_status === 'paid' && 
          org?.admin_approved === true &&
          (org?.course_credits ?? 0) > 0;

        setHasAccess(hasValidAccess);
        setOrganizationName(org?.name ?? null);
        setCreditsRemaining(org?.course_credits ?? 0);
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
