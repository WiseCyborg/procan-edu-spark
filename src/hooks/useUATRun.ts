import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

export interface UATTaskRow {
  id: string;
  run_id: string;
  task_code: string;
  title: string;
  description: string;
  role_to_test: string;
  deep_link: string | null;
  expected_result: string;
  status: string;
  evidence: string | null;
  evidence_file_path: string | null;
  priority: number;
}

export interface UATRunRow {
  id: string;
  run_code: string;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export function useUATRun() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const activeRun = useQuery({
    queryKey: ['uat-active-run', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UATRunRow | null> => {
      const { data, error } = await supabase
        .from('uat_runs')
        .select('id, run_code, status, started_at, completed_at')
        .eq('started_by', user!.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const tasks = useQuery({
    queryKey: ['uat-run-tasks', activeRun.data?.id],
    enabled: !!activeRun.data?.id,
    queryFn: async (): Promise<UATTaskRow[]> => {
      const { data, error } = await supabase
        .from('uat_tasks')
        .select('*')
        .eq('run_id', activeRun.data!.id)
        .order('role_to_test')
        .order('priority');
      if (error) throw error;
      return (data || []) as UATTaskRow[];
    },
  });

  const startRun = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('start_uat_run', { p_organization_id: null });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast({ title: 'New UAT run started' });
      qc.invalidateQueries({ queryKey: ['uat-active-run'] });
    },
    onError: (e: any) => toast({ title: 'Could not start run', description: e.message, variant: 'destructive' }),
  });

  const submitStep = useMutation({
    mutationFn: async (args: { taskId: string; result: 'pass' | 'fail' | 'skip'; notes?: string; evidencePath?: string }) => {
      const { error } = await supabase.rpc('submit_uat_step', {
        p_task_id: args.taskId,
        p_result: args.result,
        p_notes: args.notes ?? null,
        p_evidence_path: args.evidencePath ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uat-run-tasks'] });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const completeRun = useMutation({
    mutationFn: async () => {
      if (!activeRun.data?.id) return;
      const { error } = await supabase
        .from('uat_runs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', activeRun.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'UAT run submitted', description: 'Thank you for testing!' });
      qc.invalidateQueries({ queryKey: ['uat-active-run'] });
      qc.invalidateQueries({ queryKey: ['uat-run-tasks'] });
    },
    onError: (e: any) => toast({ title: 'Submit failed', description: e.message, variant: 'destructive' }),
  });

  return { activeRun, tasks, startRun, submitStep, completeRun };
}
