import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfileCompletion } from './useProfileCompletion';
import { useUserProgress } from './useUserProgress';

const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

export const useStudentChecklistStatus = () => {
  const { user } = useAuth();
  const { isProfileComplete } = useProfileCompletion();
  const { getCompletedModulesCount } = useUserProgress(COURSE_ID);

  const { data, isLoading } = useQuery({
    queryKey: ['student-checklist-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if user has watched welcome video
      const { data: activityLog } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_type', 'welcome_video_viewed')
        .limit(1)
        .maybeSingle();

      const hasWatchedWelcome = !!activityLog;

      // Check if user has started course
      const completedModules = getCompletedModulesCount();
      const hasStartedCourse = completedModules > 0;

      // Check if user has passed exam
      const { data: passedExam } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_passed', true)
        .limit(1)
        .maybeSingle();

      const hasPassedExam = !!passedExam;

      // Check if user has certificate
      const { data: certificate } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_revoked', false)
        .limit(1)
        .maybeSingle();

      const hasCertificate = !!certificate;

      return {
        profileComplete: isProfileComplete,
        hasWatchedWelcome,
        hasStartedCourse,
        hasPassedExam,
        hasCertificate,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  return {
    ...data,
    isLoading,
  };
};
