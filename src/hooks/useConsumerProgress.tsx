import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CourseProgress {
  courseId: string;
  completedModules: string[];
  lastAccessedModule: string | null;
  startedAt: string;
  completedAt: string | null;
}

// Admin review escape hatch: `?e2e_guest=<nonce>` forces the progress layer into
// guest/local-only mode even when an authenticated (admin) session exists. It uses a
// dedicated localStorage key so it can never read or write real learner progress, and
// every Supabase progress/enrollment write is suppressed. A new nonce = a clean run.
export const getE2EGuestNonce = (): string | null => {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('e2e_guest');
  if (!raw) return null;
  const sanitized = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return sanitized.length > 0 ? sanitized : null;
};

// Anonymous progress uses a STABLE per-course key (no guest session id), so it
// survives reloads and cannot drift while the guest session hydrates.
const getStorageKey = (courseId: string, userId?: string | null, e2eNonce?: string | null) => {
  if (e2eNonce) return `procann_progress_${courseId}_e2e_guest_${e2eNonce}`;
  return userId ? `procann_progress_${courseId}_${userId}` : `procann_progress_${courseId}_anon`;
};

export const useConsumerProgress = (courseId: string, totalModules: number = 0) => {
  const { user } = useAuth();
  const e2eGuestNonce = getE2EGuestNonce();
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

  // In guest E2E mode we deliberately ignore the authenticated identity.
  const userId = e2eGuestNonce ? null : (user?.id ?? null);
  const dbUserId = e2eGuestNonce ? null : (user?.id ?? null);


  useEffect(() => {
    enrollmentIdRef.current = enrollmentId;
  }, [enrollmentId]);

  // Load or create enrollment (auth users) + load progress
  useEffect(() => {
    let cancelled = false;
    // Synchronously hydrate from localStorage so the UI never renders 0/N for a
    // returning (anonymous) learner while the async enrollment lookup runs.
    try {
      const cached = localStorage.getItem(getStorageKey(courseId, userId, e2eGuestNonce));
      if (cached) setProgress(JSON.parse(cached));
    } catch (e) {
      console.error('Error reading cached progress:', e);
    }

    const loadProgress = async () => {
      try {
        if (dbUserId) {
          // Load existing enrollment for this user + course
          const { data: existing } = await supabase
            .from('consumer_enrollments')
            .select('id, metadata, started_at, completed_at')
            .eq('course_id', courseId)
            .eq('user_id', dbUserId)
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
                user_id: dbUserId,
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
        const stored = localStorage.getItem(getStorageKey(courseId, userId, e2eGuestNonce));
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
  }, [courseId, userId, dbUserId, e2eGuestNonce]);

  // Save progress to localStorage and (if enrollment exists) the SAME DB row
  const saveProgress = useCallback(async (updatedProgress: CourseProgress) => {
    localStorage.setItem(getStorageKey(courseId, userId, e2eGuestNonce), JSON.stringify(updatedProgress));

    if (dbUserId) {
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
              user_id: dbUserId,
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
  }, [courseId, userId, dbUserId, e2eGuestNonce]);

  // Also write to user_progress so admin/RVT reporting sees consumer progress.
  const writeUserProgress = useCallback(async (moduleId: string) => {
    if (!dbUserId) return; // user_progress.user_id is NOT NULL — guests can't participate
    try {
      const { error } = await supabase.rpc('safe_complete_module', {
        p_user_id: dbUserId,
        p_course_id: courseId,
        p_module_id: moduleId,
      });
      if (error) console.error('safe_complete_module failed:', error);
    } catch (error) {
      console.error('Error writing user_progress:', error);
    }
  }, [courseId, dbUserId]);

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
      if (isAllDone && dbUserId) {
        (async () => {
          try {
            await supabase
              .from('consumer_enrollments')
              .update({
                completed_at: completedAt,
                metadata: updatedProgress as any,
              })
              .eq('user_id', dbUserId)
              .eq('course_id', courseId)
              .is('completed_at', null);
          } catch (err) {
            console.error('Error finalizing enrollment completion:', err);
          }
        })();
      }

      return updatedProgress;
    });
  }, [saveProgress, writeUserProgress, dbUserId, courseId]);

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
