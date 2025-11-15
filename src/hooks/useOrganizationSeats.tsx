import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationSeats {
  total: number;
  available: number;
  assigned: number;
  used: number;
}

export const useOrganizationSeats = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['organization-seats', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { total: 0, available: 0, assigned: 0, used: 0 };
      }

      const { data, error } = await supabase
        .from('rvt_seats')
        .select('status')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const seats = data || [];
      return {
        total: seats.length,
        available: seats.filter(s => s.status === 'available').length,
        assigned: seats.filter(s => s.status === 'assigned').length,
        used: seats.filter(s => s.status === 'used').length,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
