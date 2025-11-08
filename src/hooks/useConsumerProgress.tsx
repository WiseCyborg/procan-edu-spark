import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestSession } from './useGuestSession';
import { supabase } from '@/integrations/supabase/client';

interface CourseProgress {
  courseId: string;
  completedModules: string[];
  lastAccessedModule: string | null;
  startedAt: string;
  completedAt: string | null;
}

const getStorageKey = (courseId: string, identifier: string) => 
  `procann_progress_${courseId}_${identifier}`;

export const useConsumerProgress = (courseId: string) => {
  const { user } = useAuth();
  const { sessionId } = useGuestSession();
  const [progress, setProgress] = useState<CourseProgress>({
    courseId,
    completedModules: [],
    lastAccessedModule: null,
    startedAt: new Date().toISOString(),
    completedAt: null
  });
  const [isLoading, setIsLoading] = useState(true);

  const identifier = user?.id || sessionId || 'anonymous';

  // Load progress from localStorage or database
  useEffect(() => {
    const loadProgress = async () => {
      try {
        if (user?.id) {
          // Try to load from database for authenticated users
          const { data, error } = await supabase
            .from('consumer_enrollments')
            .select('metadata')
            .eq('course_id', courseId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!error && data?.metadata && typeof data.metadata === 'object') {
            const metadata = data.metadata as Record<string, any>;
            if (metadata.courseId && Array.isArray(metadata.completedModules)) {
              setProgress(metadata as CourseProgress);
              setIsLoading(false);
              return;
            }
          }
        }

        // Fall back to localStorage
        const storageKey = getStorageKey(courseId, identifier);
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          setProgress(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && identifier) {
      loadProgress();
    }
  }, [courseId, identifier, user?.id]);

  // Save progress to localStorage and optionally database
  const saveProgress = useCallback(async (updatedProgress: CourseProgress) => {
    const storageKey = getStorageKey(courseId, identifier);
    localStorage.setItem(storageKey, JSON.stringify(updatedProgress));

    // If authenticated, also save to database
    if (user?.id) {
      try {
        const { data: existing } = await supabase
          .from('consumer_enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('consumer_enrollments')
            .update({
              metadata: updatedProgress as any,
              started_at: updatedProgress.startedAt,
              completed_at: updatedProgress.completedAt
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('consumer_enrollments')
            .insert({
              user_id: user.id,
              course_id: courseId,
              metadata: updatedProgress as any,
              started_at: updatedProgress.startedAt,
              completed_at: updatedProgress.completedAt
            });
        }
      } catch (error) {
        console.error('Error saving progress to database:', error);
      }
    }
  }, [courseId, identifier, user?.id]);

  const markModuleComplete = useCallback((moduleId: string) => {
    setProgress((prev) => {
      if (prev.completedModules.includes(moduleId)) {
        return prev;
      }

      const updatedProgress: CourseProgress = {
        ...prev,
        completedModules: [...prev.completedModules, moduleId],
        lastAccessedModule: moduleId
      };

      saveProgress(updatedProgress);
      return updatedProgress;
    });
  }, [saveProgress]);

  const isModuleComplete = useCallback((moduleId: string) => {
    return progress.completedModules.includes(moduleId);
  }, [progress.completedModules]);

  const completeCourse = useCallback((totalModules: number) => {
    setProgress((prev) => {
      const updatedProgress: CourseProgress = {
        ...prev,
        completedAt: new Date().toISOString()
      };

      saveProgress(updatedProgress);
      return updatedProgress;
    });
  }, [saveProgress]);

  const completionPercentage = useCallback((totalModules: number) => {
    if (totalModules === 0) return 0;
    return Math.round((progress.completedModules.length / totalModules) * 100);
  }, [progress.completedModules.length]);

  return {
    progress,
    completedModules: progress.completedModules,
    markModuleComplete,
    isModuleComplete,
    completeCourse,
    completionPercentage: completionPercentage(progress.completedModules.length),
    isLoading
  };
};
