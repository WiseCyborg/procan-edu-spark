import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CourseLaunchTarget {
  can_access: boolean;
  deny_reason: string | null;
  cta_label: 'start' | 'continue' | 'view_certificate' | 'login' | 'coming_soon' | 'unavailable';
  has_certificate: boolean;
  start_target: {
    type: string;
    module_id?: string;
    module_number?: number;
    page_index?: number;
    route: string;
  } | null;
  course_type?: string;
}

export const useCourseLaunchTarget = (courseId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['course-launch-target', courseId, user?.id],
    queryFn: async (): Promise<CourseLaunchTarget | null> => {
      if (!courseId) return null;

      const { data, error } = await supabase.rpc('get_course_launch_target', {
        p_course_id: courseId
      });

      if (error) {
        console.error('[useCourseLaunchTarget] Error:', error);
        return null;
      }

      return data as unknown as CourseLaunchTarget;
    },
    enabled: !!courseId,
    staleTime: 30000, // 30 seconds
  });
};
