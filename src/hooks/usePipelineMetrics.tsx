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
  
  // Dispensary Funnel
  funnel_dispensary_applied: number;
  funnel_dispensary_approved: number;
  funnel_dispensary_registered: number;
  funnel_dispensary_seats_purchased: number;
  
  // Employee Funnel
  funnel_employee_invited: number;
  funnel_employee_registered: number;
  funnel_employee_started: number;
  funnel_employee_completed: number;
  funnel_employee_took_exam: number;
  
  // Certification Funnel
  funnel_cert_took_exam: number;
  funnel_cert_passed: number;
  funnel_cert_generated: number;
  funnel_cert_delivered: number;
  
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
