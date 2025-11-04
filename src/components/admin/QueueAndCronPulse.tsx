import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProcessorPulse {
  observed_at: string;
  last_activity: string | null;
  queued: number;
  failed: number;
  deadletter: number;
}

interface QueueHealth {
  job_type: string;
  status: string;
  ct: number;
  oldest_queued_at: string;
  newest_queued_at: string;
}

export default function QueueAndCronPulse() {
  const { data: pulse, isLoading: pulseLoading } = useQuery({
    queryKey: ['v_processor_pulse'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_processor_pulse')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as ProcessorPulse;
    },
    refetchInterval: 30000
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['v_queue_health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_queue_health')
        .select('*')
        .order('job_type');
      if (error) throw error;
      return data as QueueHealth[];
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
    if (!pulse) return 'unknown';
    if (pulse.failed > 10 || pulse.deadletter > 0) return 'critical';
    if (pulse.failed > 5 || pulse.queued > 50) return 'warning';
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
          {pulseLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pulse ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Activity
                </span>
                <Badge variant="secondary">
                  {pulse.last_activity
                    ? formatDistanceToNow(new Date(pulse.last_activity), { addSuffix: true })
                    : 'Never'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Queued</span>
                <Badge variant={pulse.queued > 50 ? 'destructive' : 'secondary'}>
                  {pulse.queued}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed</span>
                <Badge variant={pulse.failed > 5 ? 'destructive' : 'secondary'}>
                  {pulse.failed}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dead Letter Queue</span>
                <Badge variant={pulse.deadletter > 0 ? 'destructive' : 'default'}>
                  {pulse.deadletter}
                </Badge>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Queue Status by Job Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-auto">
          {queueLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : queue && queue.length > 0 ? (
            queue.map((r) => (
              <div
                key={`${r.job_type}-${r.status}`}
                className="flex items-center justify-between py-1"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate">{r.job_type}</span>
                  <span className="text-xs text-muted-foreground">{r.status}</span>
                </div>
                <Badge variant={getStatusVariant(r.status)}>{r.ct}</Badge>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No jobs in queue
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
