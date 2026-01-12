import { useCallback } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resume State - Tracks where user left off in a course
 */

export interface ResumeTarget {
  module_id: string | null;
  module_number: number;
  last_tab: string;
  last_page_index: number;
  last_activity_at: string;
}

interface UpsertResumeParams {
  courseId: string;
  moduleId?: string | null;
  moduleNumber: number;
  lastTab: string;
  lastPageIndex: number;
}

const RESUME_STATE_STALE_TIME = 60 * 1000; // 1 minute
const RESUME_STATE_GC_TIME = 30 * 60 * 1000; // 30 minutes

export const useResumeState = (courseId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch resume state from DB
  const { data: resumeTarget, isLoading, refetch } = useQuery({
    queryKey: ['resume-state', user?.id, courseId],
    queryFn: async (): Promise<ResumeTarget | null> => {
      // Guard: Return null if missing required params
      if (!user?.id || !courseId) {
        console.log('[ResumeState] Skipping fetch - missing user or courseId', { userId: user?.id, courseId });
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('course_resume_state')
          .select('module_id, module_number, last_tab, last_page_index, last_activity_at')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        if (error) {
          console.error('[ResumeState] Error fetching:', error);
          return null;
        }

        return data;
      } catch (e) {
        console.error('[ResumeState] Unexpected error:', e);
        return null;
      }
    },
    enabled: !!user?.id && !!courseId,
    staleTime: RESUME_STATE_STALE_TIME,
    gcTime: RESUME_STATE_GC_TIME,
  });

  // Mutation for upserting resume state
  const upsertMutation = useMutation({
    mutationFn: async (params: UpsertResumeParams) => {
      const { data, error } = await supabase.rpc('upsert_resume_state', {
        p_course_id: params.courseId,
        p_module_id: params.moduleId || null,
        p_module_number: params.moduleNumber,
        p_last_tab: params.lastTab,
        p_last_page_index: params.lastPageIndex,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      // Invalidate resume state and course state queries
      queryClient.invalidateQueries({ queryKey: ['resume-state', user?.id, params.courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-state', user?.id, params.courseId] });
    },
    onError: (error) => {
      console.error('[ResumeState] Error upserting:', error);
    },
  });

  // Save resume state - called on tab change, page navigation
  const saveResumeState = useCallback(
    (params: Omit<UpsertResumeParams, 'courseId'>) => {
      if (!courseId || !user?.id) return;
      
      upsertMutation.mutate({
        courseId,
        ...params,
      });
    },
    [courseId, user?.id, upsertMutation]
  );

  // Build route from resume target - SAFE: always returns valid route
  const getResumeRoute = useCallback((): string => {
    try {
      if (!resumeTarget || !courseId) {
        return '/course';
      }

      // Validate module_number
      if (typeof resumeTarget.module_number !== 'number' || resumeTarget.module_number < 1) {
        console.warn('[ResumeState] Invalid module_number:', resumeTarget.module_number);
        return '/course';
      }

      const moduleParam = `part${resumeTarget.module_number}`;
      const tab = resumeTarget.last_tab || 'overview';
      const page = resumeTarget.last_page_index || 0;

      // Build route with query params
      let route = `/course/${moduleParam}`;
      const params = new URLSearchParams();
      
      if (tab && tab !== 'overview') {
        params.set('tab', tab);
      }
      if (typeof page === 'number' && page > 0) {
        params.set('page', String(page));
      }
      
      const queryString = params.toString();
      if (queryString) {
        route += `?${queryString}`;
      }

      return route;
    } catch (e) {
      console.error('[ResumeState] getResumeRoute error:', e);
      return '/course';
    }
  }, [resumeTarget, courseId]);

  return {
    resumeTarget,
    isLoading,
    refetch,
    saveResumeState,
    getResumeRoute,
    isSaving: upsertMutation.isPending,
  };
};

/**
 * Get human-readable resume message
 */
export const getResumeMessage = (target: ResumeTarget | null): {
  title: string;
  message: string;
  action: string;
} | null => {
  if (!target) return null;

  const tabNames: Record<string, string> = {
    overview: 'Overview',
    course: 'Course Content',
    documents: 'Documents',
    quiz: 'Quiz',
  };

  const tabName = tabNames[target.last_tab] || target.last_tab;
  const pageInfo = target.last_page_index > 0 ? `, page ${target.last_page_index + 1}` : '';

  return {
    title: 'Resume Your Training',
    message: `Continue Module ${target.module_number} - ${tabName}${pageInfo}`,
    action: 'Resume Training',
  };
};
