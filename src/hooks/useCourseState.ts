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

  return {
    courseState,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    getModuleState,
    isModuleLocked,
    getNextAvailableModule,
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
