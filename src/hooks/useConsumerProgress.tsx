import { useState, useEffect, useCallback, useRef } from 'react';
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

// Anonymous progress uses a STABLE per-course key (no guest session id), so it
// survives reloads and cannot drift while the guest session hydrates.
const getStorageKey = (courseId: string, userId?: string | null) =>
  userId ? `procann_progress_${courseId}_${userId}` : `procann_progress_${courseId}_anon`;

export const useConsumerProgress = (courseId: string, totalModules: number = 0) => {
  const { user } = useAuth();
  const { sessionId } = useGuestSession();
  const [progress, setProgress] = useState<CourseProgress>({
    courseId,
    completedModules: [],
    lastAccessedModule: null,
    startedAt: new Date().toISOString(),
    completedAt: null
  });
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const enrollmentIdRef = useRef<string | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    enrollmentIdRef.current = enrollmentId;
  }, [enrollmentId]);

  // Load or create enrollment (auth users) + load progress
  useEffect(() => {
    let cancelled = false;
    // Synchronously hydrate from localStorage so the UI never renders 0/N for a
    // returning (anonymous) learner while the async enrollment lookup runs.
    try {
      const cached = localStorage.getItem(getStorageKey(courseId, userId));
      if (cached) setProgress(JSON.parse(cached));
    } catch (e) {
      console.error('Error reading cached progress:', e);
    }

    const loadProgress = async () => {
      try {
        if (user?.id) {
          // Load existing enrollment for this user + course
          const { data: existing } = await supabase
            .from('consumer_enrollments')
            .select('id, metadata, started_at, completed_at')
            .eq('course_id', courseId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (existing) {
            setEnrollmentId(existing.id);
            const metadata = (existing.metadata as Record<string, any>) || {};
            if (metadata.courseId && Array.isArray(metadata.completedModules)) {
              setProgress({
                ...(metadata as CourseProgress),
                completedAt: existing.completed_at ?? metadata.completedAt ?? null,
                startedAt: existing.started_at ?? metadata.startedAt ?? new Date().toISOString(),
              });
              setIsLoading(false);
              return;
            }
          } else {
            // Create the enrollment row up-front so subsequent updates target it.
            const startedAt = new Date().toISOString();
            const { data: created, error: createErr } = await supabase
              .from('consumer_enrollments')
              .insert({
                user_id: user.id,
                course_id: courseId,
                started_at: startedAt,
                metadata: {
                  courseId,
                  completedModules: [],
                  lastAccessedModule: null,
                  startedAt,
                  completedAt: null,
                } as any,
              })
              .select('id')
              .single();
            if (!createErr && created) {
              setEnrollmentId(created.id);
            }
          }
        }

        // Fall back to localStorage (also used for auth users w/o metadata yet)
        const stored = localStorage.getItem(getStorageKey(courseId, userId));
        if (stored && !cancelled) {
          setProgress(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (courseId) {
      loadProgress();
    } else {
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [courseId, userId]);

  // Save progress to localStorage and (if enrollment exists) the SAME DB row
  const saveProgress = useCallback(async (updatedProgress: CourseProgress) => {
    localStorage.setItem(getStorageKey(courseId, userId), JSON.stringify(updatedProgress));

    if (user?.id) {
      try {
        const currentId = enrollmentIdRef.current;
        if (currentId) {
          await supabase
            .from('consumer_enrollments')
            .update({
              metadata: updatedProgress as any,
              started_at: updatedProgress.startedAt,
              completed_at: updatedProgress.completedAt,
            })
            .eq('id', currentId);
        } else {
          // Enrollment didn't exist yet — create and remember it.
          const { data: created } = await supabase
            .from('consumer_enrollments')
            .insert({
              user_id: user.id,
              course_id: courseId,
              metadata: updatedProgress as any,
              started_at: updatedProgress.startedAt,
              completed_at: updatedProgress.completedAt,
            })
            .select('id')
            .single();
          if (created) {
            enrollmentIdRef.current = created.id;
            setEnrollmentId(created.id);
          }
        }
      } catch (error) {
        console.error('Error saving progress to database:', error);
      }
    }
  }, [courseId, userId]);

  // Also write to user_progress so admin/RVT reporting sees consumer progress.
  const writeUserProgress = useCallback(async (moduleId: string) => {
    if (!user?.id) return; // user_progress.user_id is NOT NULL — guests can't participate
    try {
      const { error } = await supabase.rpc('safe_complete_module', {
        p_user_id: user.id,
        p_course_id: courseId,
        p_module_id: moduleId,
      });
      if (error) console.error('safe_complete_module failed:', error);
    } catch (error) {
      console.error('Error writing user_progress:', error);
    }
  }, [courseId, user?.id]);

  const markModuleComplete = useCallback((moduleId: string, totalModules?: number) => {
    setProgress((prev) => {
      if (prev.completedModules.includes(moduleId)) {
        writeUserProgress(moduleId);
        return prev;
      }

      const completedModules = [...prev.completedModules, moduleId];
      const isAllDone =
        typeof totalModules === 'number' && totalModules > 0 && completedModules.length >= totalModules;
      const completedAt = isAllDone ? (prev.completedAt ?? new Date().toISOString()) : prev.completedAt;

      const updatedProgress: CourseProgress = {
        ...prev,
        completedModules,
        lastAccessedModule: moduleId,
        completedAt,
      };

      saveProgress(updatedProgress);
      writeUserProgress(moduleId);

      // Safety-net finalize: if the course is now complete, explicitly UPDATE
      // the enrollment row by (user_id, course_id) so completed_at is never
      // left null due to a race with enrollmentIdRef being unset.
      if (isAllDone && user?.id) {
        (async () => {
          try {
            await supabase
              .from('consumer_enrollments')
              .update({
                completed_at: completedAt,
                metadata: updatedProgress as any,
              })
              .eq('user_id', user.id)
              .eq('course_id', courseId)
              .is('completed_at', null);
          } catch (err) {
            console.error('Error finalizing enrollment completion:', err);
          }
        })();
      }

      return updatedProgress;
    });
  }, [saveProgress, writeUserProgress, user?.id, courseId]);

  const isModuleComplete = useCallback((moduleId: string) => {
    return progress.completedModules.includes(moduleId);
  }, [progress.completedModules]);

  const completeCourse = useCallback((_totalModules?: number) => {
    setProgress((prev) => {
      if (prev.completedAt) return prev;
      const updatedProgress: CourseProgress = {
        ...prev,
        completedAt: new Date().toISOString(),
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
    enrollmentId,
    completedModules: progress.completedModules,
    markModuleComplete,
    isModuleComplete,
    completeCourse,
    completionPercentage: completionPercentage(totalModules),
    isLoading
  };
};
