import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLastComarReview = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['comar-last-review'],
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
  });

  return { lastReviewed: data ?? null, isLoading };
};
