import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ImpactTracking {
  id: string;
  recommendation_id: string;
  implementation_date: string;
  baseline_period_start: string;
  baseline_period_end: string;
  measurement_period_start: string;
  measurement_period_end: string | null;
  baseline_pass_rate: number;
  baseline_avg_score: number;
  baseline_avg_attempts: number;
  baseline_sample_size: number;
  post_pass_rate: number;
  post_avg_score: number;
  post_avg_attempts: number;
  post_sample_size: number;
  improvement_pass_rate: number;
  improvement_avg_score: number;
  reduction_retake_rate: number;
  hours_spent_implementing: number;
  estimated_hours_saved_annually: number;
  estimated_cost_per_retake: number;
  retakes_prevented_annually: number;
  annual_savings_usd: number;
  roi_percentage: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useRecommendationImpact = (recommendationId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch impact tracking for a specific recommendation
  const {
    data: impact,
    isLoading,
    error
  } = useQuery({
    queryKey: ['recommendation-impact', recommendationId],
    queryFn: async () => {
      if (!recommendationId) return null;

      const { data, error } = await (supabase as any)
        .from('recommendation_impact_tracking')
        .select('*')
        .eq('recommendation_id', recommendationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return data as ImpactTracking | null;
    },
    enabled: !!recommendationId,
  });

  // Fetch all impact tracking records
  const {
    data: allImpacts,
    isLoading: allImpactsLoading
  } = useQuery({
    queryKey: ['all-recommendation-impacts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('recommendation_impact_tracking')
        .select(`
          *,
          curriculum_recommendations (
            id,
            title,
            priority,
            status,
            category
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (ImpactTracking & { curriculum_recommendations: any })[];
    },
  });

  // Calculate impact mutation
  const calculateImpact = useMutation({
    mutationFn: async (params: {
      recommendationId: string;
      baselineStart: string;
      baselineEnd: string;
      measurementStart: string;
      measurementEnd?: string;
      implementationDate: string;
      hoursSpent?: number;
      costPerRetake?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'calculate-recommendation-impact',
        {
          body: params,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendation-impact'] });
      queryClient.invalidateQueries({ queryKey: ['all-recommendation-impacts'] });
      queryClient.invalidateQueries({ queryKey: ['exam-analytics-summary'] });
      toast({
        title: 'Success',
        description: 'ROI calculated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate aggregate ROI across all recommendations
  const aggregateROI = allImpacts?.reduce((acc, impact) => {
    return {
      totalSavings: acc.totalSavings + (impact.annual_savings_usd || 0),
      totalHoursSaved: acc.totalHoursSaved + (impact.estimated_hours_saved_annually || 0),
      avgPassRateImprovement: acc.avgPassRateImprovement + (impact.improvement_pass_rate || 0),
      avgScoreImprovement: acc.avgScoreImprovement + (impact.improvement_avg_score || 0),
      totalRetakesPrevented: acc.totalRetakesPrevented + (impact.retakes_prevented_annually || 0),
      count: acc.count + 1,
    };
  }, {
    totalSavings: 0,
    totalHoursSaved: 0,
    avgPassRateImprovement: 0,
    avgScoreImprovement: 0,
    totalRetakesPrevented: 0,
    count: 0,
  });

  const averagedROI = aggregateROI && aggregateROI.count > 0 ? {
    ...aggregateROI,
    avgPassRateImprovement: aggregateROI.avgPassRateImprovement / aggregateROI.count,
    avgScoreImprovement: aggregateROI.avgScoreImprovement / aggregateROI.count,
  } : null;

  return {
    impact,
    allImpacts,
    aggregateROI: averagedROI,
    isLoading: isLoading || allImpactsLoading,
    error,
    calculateImpact,
  };
};