import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProcessorPulse {
  last_run: string | null;
  jobs_processed: number;
  jobs_failed: number;
  average_duration_ms: number;
  is_healthy: boolean;
}

export const useProcessorPulse = () => {
  const [pulse, setPulse] = useState<ProcessorPulse>({
    last_run: null,
    jobs_processed: 0,
    jobs_failed: 0,
    average_duration_ms: 0,
    is_healthy: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchPulse = async () => {
    try {
      // Query recent completed jobs to determine processor health
      const { data: recentJobs, error } = await supabase
        .from('system_jobs')
        .select('completed_at, started_at, status')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const recentCompletedJobs = recentJobs.filter(
        (job) => new Date(job.completed_at!) > fiveMinutesAgo
      );

      const durations = recentCompletedJobs
        .filter((job) => job.started_at && job.completed_at)
        .map((job) => {
          const start = new Date(job.started_at!).getTime();
          const end = new Date(job.completed_at!).getTime();
          return end - start;
        });

      const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

      const failedCount = recentJobs.filter((job) => job.status === 'failed').length;

      setPulse({
        last_run: recentJobs[0]?.completed_at || null,
        jobs_processed: recentCompletedJobs.length,
        jobs_failed: failedCount,
        average_duration_ms: Math.round(avgDuration),
        is_healthy: recentCompletedJobs.length > 0 && failedCount < 5,
      });
    } catch (error) {
      console.error('Error fetching processor pulse:', error);
      setPulse((prev) => ({ ...prev, is_healthy: false }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();

    // Poll every 10 seconds
    const interval = setInterval(fetchPulse, 10000);

    return () => clearInterval(interval);
  }, []);

  return { pulse, loading, refresh: fetchPulse };
};
