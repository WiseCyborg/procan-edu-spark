import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ExamAttempt {
  id: string;
  user_id: string;
  course_id: string;
  attempt_number: number;
  total_score: number;
  passing_score: number;
  is_passed: boolean;
  time_taken: number;
  created_at: string;
  completed_at: string;
  can_retake_at: string;
  retake_cooldown_hours: number;
  topic_scores: Array<{
    section_number: number;
    section_title: string;
    comar_section: string;
    topic_area: string;
    questions_correct: number;
    questions_total: number;
    score_percentage: number;
    needs_remediation: boolean;
  }>;
}

export interface ExamStats {
  user_id: string;
  course_id: string;
  total_attempts: number;
  passed_attempts: number;
  failed_attempts: number;
  best_score: number;
  average_score: number;
  first_attempt_date: string;
  last_attempt_date: string;
  next_retake_available: string;
  can_retake_now: boolean;
}

export const useExamAttempts = (courseId: string = 'default-course-id') => {
  const { user } = useAuth();

  // Fetch all exam attempts for the user
  const {
    data: attempts,
    isLoading: attemptsLoading,
    error: attemptsError,
    refetch: refetchAttempts
  } = useQuery({
    queryKey: ['exam-attempts', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ExamAttempt[];
    },
    enabled: !!user?.id,
  });

  // Fetch exam statistics
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['exam-stats', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_exam_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ExamStats | null;
    },
    enabled: !!user?.id,
  });

  // Check if user can retake exam now
  const canRetakeNow = () => {
    if (!stats) return true; // No attempts yet
    return stats.can_retake_now;
  };

  // Get time until next retake is available
  const getTimeUntilRetake = (): number | null => {
    if (!stats || !stats.next_retake_available) return null;
    
    const nextRetakeTime = new Date(stats.next_retake_available).getTime();
    const now = Date.now();
    const diff = nextRetakeTime - now;
    
    return diff > 0 ? diff : 0;
  };

  // Format time until retake
  const formatTimeUntilRetake = (): string | null => {
    const milliseconds = getTimeUntilRetake();
    if (milliseconds === null || milliseconds === 0) return null;

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calculate score improvement from first to last attempt
  const getScoreImprovement = (): number | null => {
    if (!attempts || attempts.length < 2) return null;

    const sortedAttempts = [...attempts].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const firstScore = sortedAttempts[0].total_score;
    const lastScore = sortedAttempts[sortedAttempts.length - 1].total_score;

    return lastScore - firstScore;
  };

  // Get passing rate
  const getPassingRate = (): number => {
    if (!stats || stats.total_attempts === 0) return 0;
    return Math.round((stats.passed_attempts / stats.total_attempts) * 100);
  };

  return {
    attempts,
    attemptsLoading,
    attemptsError,
    refetchAttempts,
    stats,
    statsLoading,
    statsError,
    refetchStats,
    canRetakeNow: canRetakeNow(),
    timeUntilRetake: getTimeUntilRetake(),
    timeUntilRetakeFormatted: formatTimeUntilRetake(),
    scoreImprovement: getScoreImprovement(),
    passingRate: getPassingRate(),
  };
};
