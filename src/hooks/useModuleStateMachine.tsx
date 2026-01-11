import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type ModuleState = 'not_started' | 'in_progress' | 'quiz_attempted' | 'completed';
export type TriggerEvent = 'started' | 'quiz_passed' | 'quiz_failed' | 'video_complete' | 'manual_reset';

interface StateTransitionResult {
  success: boolean;
  previous_state?: ModuleState;
  new_state?: ModuleState;
  next_step?: {
    next_module_id: string | null;
    course_completed: boolean;
  };
  error?: string;
}

/**
 * Hook for managing module progress state transitions with audit logging.
 * Enforces allowed state transitions:
 * - not_started → in_progress
 * - in_progress → quiz_attempted | completed
 * - quiz_attempted → completed | in_progress (retry)
 * - completed → (terminal state)
 */
export const useModuleStateMachine = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  /**
   * Transition module state with validation and audit logging
   */
  const transitionState = useCallback(async (
    courseId: string,
    moduleId: string,
    newState: ModuleState,
    triggerEvent: TriggerEvent,
    metadata?: Record<string, unknown>
  ): Promise<StateTransitionResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('update_module_progress_state', {
        p_user_id: user.id,
        p_course_id: courseId,
        p_module_id: moduleId,
        p_new_state: newState,
        p_trigger_event: triggerEvent,
        p_metadata: (metadata || {}) as unknown as Record<string, never>
      });

      if (error) {
        console.error('State transition error:', error);
        toast({
          title: 'Progress Update Failed',
          description: 'Unable to save your progress. Please try again.',
          variant: 'destructive',
        });
        return { success: false, error: error.message };
      }

      const result = data as unknown as StateTransitionResult;

      if (!result.success) {
        console.warn('Invalid state transition:', result.error);
        return result;
      }

      // Store last accessed module for error recovery
      if (newState === 'in_progress') {
        try {
          const moduleNumber = metadata?.module_number;
          if (moduleNumber) {
            localStorage.setItem('lastAccessedModule', String(moduleNumber));
          }
        } catch {
          // localStorage might be unavailable
        }
      }

      return result;
    } catch (error) {
      console.error('Unexpected state transition error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [user, toast]);

  /**
   * Start a module (transition to in_progress)
   */
  const startModule = useCallback((
    courseId: string,
    moduleId: string,
    moduleNumber?: number
  ) => {
    return transitionState(
      courseId, 
      moduleId, 
      'in_progress', 
      'started',
      { module_number: moduleNumber }
    );
  }, [transitionState]);

  /**
   * Record quiz attempt (transition to quiz_attempted)
   */
  const recordQuizAttempt = useCallback((
    courseId: string,
    moduleId: string,
    passed: boolean,
    score: number
  ) => {
    return transitionState(
      courseId,
      moduleId,
      passed ? 'completed' : 'quiz_attempted',
      passed ? 'quiz_passed' : 'quiz_failed',
      { score, passed }
    );
  }, [transitionState]);

  /**
   * Complete module (terminal state)
   */
  const completeModule = useCallback((
    courseId: string,
    moduleId: string,
    triggerEvent: TriggerEvent = 'quiz_passed'
  ) => {
    return transitionState(courseId, moduleId, 'completed', triggerEvent);
  }, [transitionState]);

  /**
   * Retry after failed quiz (back to in_progress)
   */
  const retryModule = useCallback((
    courseId: string,
    moduleId: string
  ) => {
    return transitionState(courseId, moduleId, 'in_progress', 'manual_reset');
  }, [transitionState]);

  return {
    transitionState,
    startModule,
    recordQuizAttempt,
    completeModule,
    retryModule,
  };
};
