import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface JobQueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  deadletter: number;
  total: number;
}

interface RecentJob {
  id: string;
  job_type: string;
  status: string;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  retry_count: number;
}

export const useJobQueueMonitor = () => {
  const [stats, setStats] = useState<JobQueueStats>({
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    deadletter: 0,
    total: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data: jobs, error } = await supabase
        .from('system_jobs')
        .select('status');

      if (error) throw error;

      const statsByStatus = jobs.reduce(
        (acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const { data: deadletterJobs, error: dlError } = await supabase
        .from('system_jobs_deadletter')
        .select('id', { count: 'exact', head: true });

      setStats({
        queued: statsByStatus.queued || 0,
        processing: statsByStatus.processing || 0,
        completed: statsByStatus.completed || 0,
        failed: statsByStatus.failed || 0,
        deadletter: deadletterJobs?.length || 0,
        total: jobs.length,
      });
    } catch (error) {
      console.error('Error fetching job stats:', error);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_jobs')
        .select('id, job_type, status, queued_at, started_at, completed_at, last_error, retry_count')
        .order('queued_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentJobs(data || []);
    } catch (error) {
      console.error('Error fetching recent jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentJobs();

    // Set up real-time subscription for system_jobs
    const channel = supabase
      .channel('job-queue-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_jobs',
        },
        () => {
          fetchStats();
          fetchRecentJobs();
        }
      )
      .subscribe();

    // Also poll every 10 seconds as backup
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentJobs();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return { stats, recentJobs, loading, refresh: () => { fetchStats(); fetchRecentJobs(); } };
};
