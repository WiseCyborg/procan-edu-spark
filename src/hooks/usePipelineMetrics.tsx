import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PipelineMetrics {
  // Application funnel
  applications_submitted_30d: number;
  applications_approved_30d: number;
  applications_pending: number;
  applications_rejected_30d: number;
  avg_approval_hours_30d: number;
  approval_rate_30d: number;
  
  // Seat utilization
  total_seats: number;
  assigned_seats: number;
  available_seats: number;
  used_seats: number;
  orgs_with_unused_seats: number;
  seat_utilization_rate: number;
  
  // Certificate conversion
  certificates_issued_30d: number;
  certificates_expired: number;
  certificates_expiring_soon: number;
  users_registered_30d: number;
  certification_conversion_rate_30d: number;
  
  // Exam metrics
  exams_taken_30d: number;
  exams_passed_30d: number;
  avg_completion_days_30d: number;
  exam_pass_rate_30d: number;
  
  calculated_at: string;
}

export const usePipelineMetrics = () => {
  return useQuery({
    queryKey: ['pipeline-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_pipeline_metrics')
        .select('*')
        .single();

      if (error) throw error;
      return data as PipelineMetrics;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};
