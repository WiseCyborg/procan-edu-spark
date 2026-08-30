import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TRACK_IDS } from '@/constants/tracks';

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

export const useLaunchCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const launchCourse = async (courseId: string) => {
    try {
      console.log('[launchCourse] Launching course:', courseId);
      
      // Call the RPC to get launch target
      const { data, error } = await supabase.rpc('get_course_launch_target', {
        p_course_id: courseId
      });

      if (error) {
        console.error('[launchCourse] RPC error:', error);
        toast.error('Unable to launch course. Please try again.');
        return;
      }

      const result = data as unknown as CourseLaunchTarget;
      console.log('[launchCourse] Launch target:', result);

      // Handle access denied
      if (!result.can_access) {
        switch (result.deny_reason) {
          case 'auth_required':
            navigate(`/auth?next=/courses/${courseId}`);
            return;
          case 'prerequisite_required':
            toast.error('Please complete the RVT Core Training first.');
            navigate(`/courses`);
            return;
          case 'course_not_found':
            toast.error('Course not found.');
            return;
          case 'course_not_published':
            toast.info('This course is coming soon!');
            return;
          default:
            toast.error('Unable to access this course.');
            return;
        }
      }

      // Handle certificate view
      if (result.cta_label === 'view_certificate' && result.has_certificate) {
        navigate('/certificates');
        return;
      }

      // Navigate to start target
      if (result.start_target?.route) {
        // For consumer courses, use the consumer education route
        if (result.course_type === 'consumer') {
          navigate(result.start_target.route);
        } else {
          // For professional courses, navigate to the course module
          navigate(result.start_target.route);
        }
      } else {
        // Fallback based on course type
        if (courseId === TRACK_IDS.RVT_CORE) {
          navigate('/course');
        } else if (result.course_type === 'consumer') {
          navigate(`/consumer-education/${courseId}`);
        } else {
          navigate('/course');
        }
      }
    } catch (err) {
      console.error('[launchCourse] Error:', err);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const getCtaLabel = (ctaLabel: string): string => {
    switch (ctaLabel) {
      case 'start':
        return 'Start Course';
      case 'continue':
        return 'Continue';
      case 'view_certificate':
        return 'View Certificate';
      case 'coming_soon':
        return 'Coming Soon';
      case 'login':
        return 'Login to Start';
      default:
        return 'Start Course';
    }
  };

  return { launchCourse, getCtaLabel };
};
