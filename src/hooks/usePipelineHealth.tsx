import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PipelineHealthCheck {
  id: string;
  check_type: string;
  status: 'healthy' | 'degraded' | 'critical';
  error_count: number;
  success_count: number;
  last_error_message?: string;
  metadata?: any;
  checked_at: string;
}

interface StuckApplication {
  application_id: string;
  organization_name: string;
  contact_email: string;
  status: string;
  hours_stuck: number;
  last_updated: string;
}

export const usePipelineHealth = () => {
  return useQuery({
    queryKey: ['pipeline-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_health_log')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PipelineHealthCheck[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useLatestPipelineStatus = () => {
  return useQuery({
    queryKey: ['pipeline-status-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_health_log')
        .select('*')
        .eq('check_type', 'full_pipeline_check')
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as PipelineHealthCheck | null;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useStuckApplications = () => {
  return useQuery({
    queryKey: ['stuck-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('check_stuck_applications');

      if (error) throw error;
      return data as StuckApplication[];
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

export const useRunPipelineHealthCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-pipeline-health');

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-health'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-status-latest'] });
      
      const status = data.status;
      if (status === 'healthy') {
        toast.success('Pipeline health check completed - all systems healthy');
      } else if (status === 'degraded') {
        toast.warning('Pipeline health check completed - some issues detected');
      } else {
        toast.error('Pipeline health check completed - critical issues found');
      }
    },
    onError: (error: Error) => {
      toast.error(`Health check failed: ${error.message}`);
    },
  });
};
