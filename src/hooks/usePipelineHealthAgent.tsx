import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PipelineHealthEvent {
  id: string;
  pipeline: string;
  severity: 'info' | 'warning' | 'critical';
  issue_type: string;
  description: string;
  organization_id?: string;
  user_id?: string;
  auto_fixed: boolean;
  fix_action?: string;
  requires_admin: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface PipelineHealthSnapshot {
  id: string;
  total_orgs: number;
  healthy_orgs: number;
  orgs_with_issues: number;
  total_seats: number;
  allocated_seats: number;
  seat_mismatches: number;
  unregistered_managers: number;
  stalled_users: number;
  total_in_training: number;
  total_certified: number;
  pipelines_healthy: number;
  pipelines_total: number;
  issues_detected: number;
  auto_fixed_today: number;
  needs_admin_attention: number;
  last_run_at: string;
  last_run_duration_ms: number;
}

export const usePipelineHealthSnapshot = () => {
  return useQuery({
    queryKey: ['pipeline-health-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_health_snapshot')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as PipelineHealthSnapshot;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const usePipelineHealthEvents = (limit = 50) => {
  return useQuery({
    queryKey: ['pipeline-health-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_health_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PipelineHealthEvent[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useRecentAutoFixes = () => {
  return useQuery({
    queryKey: ['pipeline-auto-fixes-today'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('pipeline_health_events')
        .select('*')
        .eq('auto_fixed', true)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PipelineHealthEvent[];
    },
    refetchInterval: 60000,
  });
};

export const useAdminAttentionItems = () => {
  return useQuery({
    queryKey: ['pipeline-admin-attention'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_health_events')
        .select('*')
        .eq('requires_admin', true)
        .eq('auto_fixed', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as PipelineHealthEvent[];
    },
    refetchInterval: 60000,
  });
};

export const useRunPipelineHealthAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('pipeline-health-agent');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-health-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-health-events'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-auto-fixes-today'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-admin-attention'] });

      if (data.summary.auto_fixed > 0) {
        toast.success(`Pipeline Health Agent auto-fixed ${data.summary.auto_fixed} issue(s)`);
      } else if (data.summary.issues_detected === 0) {
        toast.success('All pipelines healthy - no issues detected');
      } else {
        toast.info(`Found ${data.summary.issues_detected} issue(s), ${data.summary.needs_admin} need attention`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Pipeline Health Agent failed: ${error.message}`);
    },
  });
};
