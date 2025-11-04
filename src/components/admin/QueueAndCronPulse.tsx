import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProcessorPulse {
  job_type: string;
  total_jobs: number;
  completed: number;
  failed: number;
  avg_processing_seconds: number | null;
}

interface QueueHealth {
  queued_count: number;
  processing_count: number;
  failed_count: number;
  completed_count: number;
  last_job_queued_at: string | null;
  oldest_queued_age_seconds: number | null;
}

export default function QueueAndCronPulse() {
  const { data: pulseData, isLoading: pulseLoading } = useQuery({
    queryKey: ['v_processor_pulse'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_processor_pulse')
        .select('*');
      if (error) throw error;
      return data as ProcessorPulse[];
    },
    refetchInterval: 30000
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['v_queue_health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_queue_health')
        .select('*')
        .single();
      if (error) throw error;
      return data as QueueHealth;
    },
    refetchInterval: 30000
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'queued':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getHealthStatus = () => {
    if (!queue) return 'unknown';
    if (queue.failed_count > 10) return 'critical';
    if (queue.failed_count > 5 || queue.queued_count > 50) return 'warning';
    return 'healthy';
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processor Pulse</CardTitle>
          {healthStatus === 'healthy' && <CheckCircle className="h-4 w-4 text-green-600" />}
          {healthStatus === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
          {healthStatus === 'critical' && <AlertCircle className="h-4 w-4 text-red-600" />}
        </CardHeader>
        <CardContent className="space-y-3">
          {queueLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : queue ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Job
                </span>
                <Badge variant="secondary">
                  {queue.last_job_queued_at
                    ? formatDistanceToNow(new Date(queue.last_job_queued_at), { addSuffix: true })
                    : 'Never'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Queued</span>
                <Badge variant={queue.queued_count > 50 ? 'destructive' : 'secondary'}>
                  {queue.queued_count}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Processing</span>
                <Badge variant="secondary">
                  {queue.processing_count}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed</span>
                <Badge variant={queue.failed_count > 5 ? 'destructive' : 'secondary'}>
                  {queue.failed_count}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed (24h)</span>
                <Badge variant="default">
                  {queue.completed_count}
                </Badge>
              </div>
              {queue.oldest_queued_age_seconds !== null && queue.oldest_queued_age_seconds > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Oldest Queued</span>
                  <Badge variant={queue.oldest_queued_age_seconds > 300 ? 'destructive' : 'secondary'}>
                    {Math.floor(queue.oldest_queued_age_seconds / 60)}m ago
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Job Performance by Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-auto">
          {pulseLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pulseData && pulseData.length > 0 ? (
            pulseData.map((job) => (
              <div
                key={job.job_type}
                className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
              >
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium truncate">{job.job_type}</span>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{job.total_jobs} total</span>
                    <span className="text-green-600">{job.completed} ✓</span>
                    <span className="text-red-600">{job.failed} ✗</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {job.avg_processing_seconds !== null 
                    ? `${job.avg_processing_seconds}s avg` 
                    : 'N/A'}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No recent job activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
