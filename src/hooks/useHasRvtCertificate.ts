import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const RVT_COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

/**
 * Does the current learner hold a valid (active, non-revoked, unexpired)
 * certificate for the given course? Gates access to the supervisory track.
 */
export const useHasRvtCertificate = (courseId: string = RVT_COURSE_ID) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['has-rvt-certificate', user?.id, courseId],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', user!.id)
        .eq('course_id', courseId)
        .eq('is_revoked', false)
        .eq('status', 'active')
        .or(`expiry_date.is.null,expiry_date.gt.${nowIso}`)
        .limit(1);

      if (error) {
        console.error('[useHasRvtCertificate] lookup failed:', error.message);
        return false;
      }
      return (data?.length ?? 0) > 0;
    },
  });

  return {
    hasRvtCertificate: data === true,
    isLoading: !!user?.id && isLoading,
  };
};

export default useHasRvtCertificate;
