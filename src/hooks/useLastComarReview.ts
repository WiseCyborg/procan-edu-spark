import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const QUERY_KEY = ['comar-last-review'] as const;

export const useLastComarReview = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_runs')
        .select('created_at')
        .eq('agent_name', 'COMAR Compliance Monitor')
        .eq('execution_status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.created_at ? new Date(data.created_at) : null;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Live invalidation when a new successful COMAR run is inserted.
  useEffect(() => {
    const channel = supabase
      .channel('comar-review-runs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_agent_runs',
          filter: 'agent_name=eq.COMAR Compliance Monitor',
        },
        (payload) => {
          if ((payload.new as { execution_status?: string })?.execution_status === 'success') {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { lastReviewed: data ?? null, isLoading };
};
