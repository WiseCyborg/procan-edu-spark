import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Course State - Server-computed module lock reasons and progress
 */

export type ModuleStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export type ModuleLockReason = 
  | 'payment_required'
  | 'enrollment_required'
  | 'org_seat_required'
  | 'prerequisite_modules_incomplete'
  | 'quiz_incomplete_or_failed'
  | 'module_unpublished'
  | 'admin_suspended'
  | 'suspended'
  | 'expired'
  | null;

export interface ModuleState {
  module_id: string;
  module_number: number;
  title: string;
  is_active: boolean;
  is_manager_only: boolean;
  status: ModuleStatus;
  lock_reason: ModuleLockReason;
  lock_reason_detail: Record<string, any> | null;
}

export interface ResumeTarget {
  module_id: string | null;
  module_number: number;
  last_tab: string;
  last_page_index: number;
  last_activity_at: string;
}

export interface CourseState {
  course_id: string;
  access: {
    can_access_course: boolean;
    deny_reason: string;
    deny_detail: Record<string, any>;
    roles: string[];
    entitlement_access: string;
  };
  modules: ModuleState[];
  total_modules: number;
  completed_modules: number;
  completion_percentage: number;
  resume_target: ResumeTarget | null;
  error?: string;
}

const DEFAULT_COURSE_STATE: CourseState = {
  course_id: '',
  access: {
    can_access_course: false,
    deny_reason: 'none',
    deny_detail: {},
    roles: ['student'],
    entitlement_access: 'none',
  },
  modules: [],
  total_modules: 0,
  completed_modules: 0,
  completion_percentage: 0,
  resume_target: null,
};

// Slightly longer stale time - module state changes less frequently
const COURSE_STATE_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const COURSE_STATE_GC_TIME = 30 * 60 * 1000; // 30 minutes

export interface UseCourseStateReturn {
  courseState: CourseState;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  getModuleState: (moduleId: string) => ModuleState | undefined;
  isModuleLocked: (moduleId: string) => boolean;
  getNextAvailableModule: () => ModuleState | undefined;
  getResumeRoute: () => string;
}

export const useCourseState = (courseId?: string): UseCourseStateReturn => {
  const { user } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['course-state', user?.id, courseId],
    queryFn: async (): Promise<CourseState> => {
      if (!user?.id || !courseId) {
        return DEFAULT_COURSE_STATE;
      }

      const { data, error } = await supabase.rpc('get_course_state', {
        p_course_id: courseId,
      });

      if (error) {
        console.error('[CourseState] RPC error:', error);
        throw new Error(error.message);
      }

      // Parse the JSONB response - cast through unknown first for type safety
      const state = data as unknown as CourseState;
      
      if (!state || state.error) {
        console.warn('[CourseState] Invalid response:', state);
        return {
          ...DEFAULT_COURSE_STATE,
          course_id: courseId,
          error: state?.error || 'Failed to fetch course state',
        };
      }

      return state;
    },
    enabled: !!user?.id && !!courseId,
    staleTime: COURSE_STATE_STALE_TIME,
    gcTime: COURSE_STATE_GC_TIME,
    retry: 2,
  });

  const courseState = data ?? DEFAULT_COURSE_STATE;

  const getModuleState = (moduleId: string): ModuleState | undefined => {
    return courseState.modules.find(m => m.module_id === moduleId);
  };

  const isModuleLocked = (moduleId: string): boolean => {
    const module = getModuleState(moduleId);
    return module?.status === 'locked';
  };

  const getNextAvailableModule = (): ModuleState | undefined => {
    return courseState.modules.find(m => m.status === 'available');
  };

  /**
   * Build the resume route from course state's resume_target
   */
  const getResumeRoute = (): string => {
    const target = courseState.resume_target;
    
    if (!target) {
      // No resume state - go to first available or in-progress module
      const nextModule = courseState.modules.find(
        m => m.status === 'available' || m.status === 'in_progress'
      );
      if (nextModule) {
        return `/course/part${nextModule.module_number}`;
      }
      return '/course';
    }

    const moduleParam = `part${target.module_number}`;
    const tab = target.last_tab || 'overview';
    const page = target.last_page_index || 0;

    // Build route with query params
    let route = `/course/${moduleParam}`;
    const params = new URLSearchParams();
    
    if (tab !== 'overview') {
      params.set('tab', tab);
    }
    if (page > 0) {
      params.set('page', String(page));
    }
    
    const queryString = params.toString();
    if (queryString) {
      route += `?${queryString}`;
    }

    return route;
  };

  return {
    courseState,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    getModuleState,
    isModuleLocked,
    getNextAvailableModule,
    getResumeRoute,
  };
};

/**
 * Get human-readable lock reason message
 */
export const getLockReasonMessage = (reason: ModuleLockReason, detail?: Record<string, any> | null): string => {
  switch (reason) {
    case 'payment_required':
      return 'Complete payment to access this module.';
    case 'enrollment_required':
      return 'Enroll in this course to access modules.';
    case 'org_seat_required':
      return detail?.reason || 'A training seat is required to access this module.';
    case 'prerequisite_modules_incomplete':
      return detail?.required_module 
        ? `Complete Module ${detail.required_module} first.`
        : 'Complete the previous module first.';
    case 'quiz_incomplete_or_failed':
      return 'Pass the previous module\'s quiz to continue.';
    case 'module_unpublished':
      return 'This module is not yet available.';
    case 'admin_suspended':
    case 'suspended':
      return 'Your access has been suspended. Contact support.';
    case 'expired':
      return 'Your access has expired. Please renew.';
    default:
      return '';
  }
};

/**
 * Get human-readable resume message from course state
 */
export const getResumeMessageFromState = (courseState: CourseState): {
  title: string;
  message: string;
  action: string;
  route: string;
} | null => {
  const target = courseState.resume_target;
  
  if (!target) {
    // Check if there's an in-progress module
    const inProgress = courseState.modules.find(m => m.status === 'in_progress');
    if (inProgress) {
      return {
        title: 'Continue Your Training',
        message: `Resume Module ${inProgress.module_number}: ${inProgress.title}`,
        action: 'Continue Training',
        route: `/course/part${inProgress.module_number}`,
      };
    }
    return null;
  }

  const tabNames: Record<string, string> = {
    overview: 'Overview',
    course: 'Course Content',
    documents: 'Documents',
    quiz: 'Quiz',
  };

  const tabName = tabNames[target.last_tab] || target.last_tab;
  const pageInfo = target.last_page_index > 0 ? `, page ${target.last_page_index + 1}` : '';

  // Build the route
  const moduleParam = `part${target.module_number}`;
  let route = `/course/${moduleParam}`;
  const params = new URLSearchParams();
  
  if (target.last_tab !== 'overview') {
    params.set('tab', target.last_tab);
  }
  if (target.last_page_index > 0) {
    params.set('page', String(target.last_page_index));
  }
  
  const queryString = params.toString();
  if (queryString) {
    route += `?${queryString}`;
  }

  return {
    title: 'Resume Your Training',
    message: `Continue Module ${target.module_number} - ${tabName}${pageInfo}`,
    action: 'Resume Training',
    route,
  };
};
