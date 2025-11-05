import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SeatAllocation {
  organization_id: string;
  organization_name: string;
  course_credits: number;
  available: number;
  assigned: number;
  used: number;
  total: number;
}

export const useSeatAllocationMonitor = () => {
  const [allocations, setAllocations] = useState<SeatAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllocations = async () => {
    try {
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, course_credits')
        .eq('admin_approved', true);

      if (orgError) throw orgError;

      const allocationsData = await Promise.all(
        orgs.map(async (org) => {
          const { data: seats } = await supabase
            .from('rvt_seats')
            .select('status')
            .eq('organization_id', org.id);

          const statsByStatus = (seats || []).reduce(
            (acc, seat) => {
              acc[seat.status] = (acc[seat.status] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          return {
            organization_id: org.id,
            organization_name: org.name,
            course_credits: org.course_credits || 0,
            available: statsByStatus.available || 0,
            assigned: statsByStatus.assigned || 0,
            used: statsByStatus.used || 0,
            total: (seats || []).length,
          };
        })
      );

      setAllocations(allocationsData);
    } catch (error) {
      console.error('Error fetching seat allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();

    // Poll every 10 seconds
    const interval = setInterval(fetchAllocations, 10000);

    return () => clearInterval(interval);
  }, []);

  return { allocations, loading, refresh: fetchAllocations };
};
