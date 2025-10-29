import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrganizationInfo {
  id: string;
  name: string;
  dispensary_number: string | null;
  license_number: string | null;
  license_type: string | null;
  compliance_status: string | null;
  course_credits: number;
  contact_email: string | null;
  contact_phone: string | null;
  unique_access_key: string | null;
  payment_status: string;
  admin_approved: boolean;
}

interface OrganizationContextType {
  organizationId: string | null;
  organization: OrganizationInfo | null;
  isLoading: boolean;
  refreshOrganization: () => Promise<void>;
  canManageSeats: boolean;
  canInviteEmployees: boolean;
  canViewAnalytics: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isDispensaryManager, isTrainingCoordinator, isAdmin } = useUserRole();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganization = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get user's organization ID from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile?.organization_id) {
        setOrganizationId(null);
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      setOrganizationId(profile.organization_id);

      // Fetch full organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;

      setOrganization(org as any as OrganizationInfo);
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast.error('Failed to load organization data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();

    // Set up realtime subscription for organization changes
    if (organizationId) {
      const channel = supabase
        .channel(`organization-${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'organizations',
            filter: `id=eq.${organizationId}`,
          },
          () => {
            console.log('Organization data changed, refreshing...');
            fetchOrganization();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, organizationId]);

  // Permission helpers based on roles
  const canManageSeats = isAdmin || isDispensaryManager || isTrainingCoordinator;
  const canInviteEmployees = isAdmin || isDispensaryManager || isTrainingCoordinator;
  const canViewAnalytics = isAdmin || isDispensaryManager || isTrainingCoordinator;

  const value: OrganizationContextType = {
    organizationId,
    organization,
    isLoading,
    refreshOrganization: fetchOrganization,
    canManageSeats,
    canInviteEmployees,
    canViewAnalytics,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
