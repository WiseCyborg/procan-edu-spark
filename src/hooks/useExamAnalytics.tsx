import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ExamAnalyticsOverview {
  total_attempts: number;
  unique_test_takers: number;
  passed_attempts: number;
  failed_attempts: number;
  average_score: number;
  average_passing_score: number;
  average_failing_score: number;
  overall_pass_rate: number;
  first_attempt_date: string;
  most_recent_attempt_date: string;
}

export interface TopicAnalytics {
  section_number: number;
  section_title: string;
  comar_section: string;
  topic_area: string;
  total_attempts: number;
  average_score: number;
  passed_count: number;
  failed_count: number;
  pass_rate: number;
  min_score: number;
  max_score: number;
  median_score: number;
  score_std_dev: number;
  remediation_required_count: number;
}

export interface DifficultyAnalysis {
  section_number: number;
  section_title: string;
  comar_section: string;
  difficulty_level: 'easy' | 'medium' | 'hard' | 'very_hard';
  average_performance: number;
  sample_size: number;
  failure_rate: number;
}

export interface StrugglingSection {
  section_number: number;
  section_title: string;
  comar_section: string;
  topic_area: string;
  total_attempts: number;
  students_struggling: number;
  struggle_rate: number;
  average_score: number;
  avg_struggling_score: number;
}

export interface MonthlyTrend {
  month: string;
  total_attempts: number;
  passed: number;
  failed: number;
  avg_score: number;
  pass_rate: number;
}

export const useExamAnalytics = () => {
  const { user } = useAuth();

  // Fetch overall analytics
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError
  } = useQuery({
    queryKey: ['exam-analytics-overview'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('exam_analytics_overview')
        .select('*')
        .single();

      if (error) throw error;
      return data as unknown as ExamAnalyticsOverview;
    },
    enabled: !!user,
  });

  // Fetch topic analytics
  const {
    data: topicAnalytics,
    isLoading: topicLoading,
    error: topicError
  } = useQuery({
    queryKey: ['exam-topic-analytics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('exam_topic_analytics')
        .select('*')
        .order('section_number');

      if (error) throw error;
      return data as unknown as TopicAnalytics[];
    },
    enabled: !!user,
  });

  // Fetch difficulty analysis
  const {
    data: difficultyAnalysis,
    isLoading: difficultyLoading,
    error: difficultyError
  } = useQuery({
    queryKey: ['exam-difficulty-analysis'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('exam_difficulty_analysis')
        .select('*')
        .order('average_performance');

      if (error) throw error;
      return data as unknown as DifficultyAnalysis[];
    },
    enabled: !!user,
  });

  // Fetch struggling sections
  const {
    data: strugglingSections,
    isLoading: strugglingLoading,
    error: strugglingError
  } = useQuery({
    queryKey: ['exam-struggling-sections'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('exam_struggling_sections')
        .select('*')
        .order('struggle_rate', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as unknown as StrugglingSection[];
    },
    enabled: !!user,
  });

  // Fetch monthly trends
  const {
    data: monthlyTrends,
    isLoading: trendsLoading,
    error: trendsError
  } = useQuery({
    queryKey: ['exam-monthly-trends'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('exam_monthly_trends')
        .select('*')
        .order('month', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as unknown as MonthlyTrend[];
    },
    enabled: !!user,
  });

  const isLoading = overviewLoading || topicLoading || difficultyLoading || strugglingLoading || trendsLoading;
  const error = overviewError || topicError || difficultyError || strugglingError || trendsError;

  return {
    overview,
    topicAnalytics,
    difficultyAnalysis,
    strugglingSections,
    monthlyTrends,
    isLoading,
    error,
  };
};
