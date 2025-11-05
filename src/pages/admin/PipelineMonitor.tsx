import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useJobQueueMonitor } from '@/hooks/useJobQueueMonitor';
import { useEmailHealthMonitor } from '@/hooks/useEmailHealthMonitor';
import { useSeatAllocationMonitor } from '@/hooks/useSeatAllocationMonitor';
import { useProcessorPulse } from '@/hooks/useProcessorPulse';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Activity,
  Mail,
  Users,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PipelineMonitor = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const { stats, recentJobs, loading: jobsLoading, refresh: refreshJobs } = useJobQueueMonitor();
  const { circuitBreaker, loading: emailLoading, refresh: refreshEmail } = useEmailHealthMonitor();
  const { allocations, loading: seatsLoading, refresh: refreshSeats } = useSeatAllocationMonitor();
  const { pulse, loading: pulseLoading, refresh: refreshPulse } = useProcessorPulse();

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          navigate('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin role:', error);
        navigate('/');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAdminRole();
  }, [user, navigate]);

  const refreshAll = () => {
    refreshJobs();
    refreshEmail();
    refreshSeats();
    refreshPulse();
    setLastRefresh(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'processing':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'queued':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getCircuitStateColor = (state: string) => {
    switch (state) {
      case 'closed':
        return 'bg-green-500';
      case 'half_open':
        return 'bg-yellow-500';
      case 'open':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (checkingAuth || !user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pipeline Monitor</h1>
            <p className="text-muted-foreground mt-1">
              Real-time system health and job queue monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Last refresh: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </div>
            <Button onClick={refreshAll} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </div>

        {/* Processor Pulse */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Processor Pulse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pulseLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${pulse.is_healthy ? 'text-green-600' : 'text-red-600'}`}>
                    {pulse.is_healthy ? <CheckCircle className="h-8 w-8 mx-auto" /> : <XCircle className="h-8 w-8 mx-auto" />}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{pulse.jobs_processed}</div>
                  <div className="text-sm text-muted-foreground">Processed (5min)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{pulse.jobs_failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{pulse.average_duration_ms}ms</div>
                  <div className="text-sm text-muted-foreground">Avg Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {pulse.last_run ? formatDistanceToNow(new Date(pulse.last_run), { addSuffix: true }) : 'Never'}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Run</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Queue Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Job Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.queued}</div>
                  <div className="text-sm text-muted-foreground">Queued</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.processing}</div>
                  <div className="text-sm text-muted-foreground">Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.deadletter}</div>
                  <div className="text-sm text-muted-foreground">Deadletter</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Circuit Breaker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Circuit Breaker
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : circuitBreaker ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded-full ${getCircuitStateColor(circuitBreaker.circuit_state)}`} />
                    <span className="font-semibold uppercase">{circuitBreaker.circuit_state}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Failure Count: <span className="font-bold">{circuitBreaker.failure_count}</span>
                  </div>
                  {circuitBreaker.last_failure_at && (
                    <div className="text-sm text-muted-foreground">
                      Last Failure: {formatDistanceToNow(new Date(circuitBreaker.last_failure_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No circuit breaker data available</div>
            )}
          </CardContent>
        </Card>

        {/* Seat Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seat Allocation by Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {seatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : allocations.length > 0 ? (
              <div className="space-y-4">
                {allocations.map((allocation) => (
                  <div key={allocation.organization_id} className="border rounded-lg p-4">
                    <div className="font-semibold mb-2">{allocation.organization_name}</div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Credits</div>
                        <div className="font-bold">{allocation.course_credits}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Available</div>
                        <div className="font-bold text-green-600">{allocation.available}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Assigned</div>
                        <div className="font-bold text-blue-600">{allocation.assigned}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Used</div>
                        <div className="font-bold text-purple-600">{allocation.used}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No organizations found</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent System Jobs (Last 20)</CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                        <span className="font-semibold text-sm">{job.job_type}</span>
                        {job.retry_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Retry {job.retry_count}
                          </Badge>
                        )}
                      </div>
                      {job.last_error && (
                        <div className="text-xs text-red-600 mt-1 truncate max-w-md">{job.last_error}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1 text-right">
                      <div>Queued: {formatDistanceToNow(new Date(job.queued_at), { addSuffix: true })}</div>
                      {job.completed_at && (
                        <div>
                          Completed: {Math.round((new Date(job.completed_at).getTime() - new Date(job.queued_at).getTime()) / 1000)}s
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PipelineMonitor;
