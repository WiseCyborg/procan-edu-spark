import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  KeyRound
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRealSystemHealth } from '@/hooks/useRealSystemHealth';

interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  count: number;
  conversionRate?: number;
  issues?: string[];
}

interface PipelineMetrics {
  totalApplications: number;
  pending: number;
  approved: number;
  paymentCompleted: number;
  managersRegistered: number;
  employeesInvited: number;
  employeesEnrolled: number;
  certificatesGenerated: number;
  lastUpdated: string;
}

// Token expiry indicator component
const TokenExpiryIndicator = () => {
  const [tokenStats, setTokenStats] = useState({ expiring: 0, expired: 0 });
  
  useEffect(() => {
    const fetchTokenStats = async () => {
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      
      const { data: expiringSoon } = await supabase
        .from('dispensary_applications')
        .select('id')
        .eq('application_status', 'approved')
        .eq('registration_completed', false)
        .gte('registration_token_expires_at', now.toISOString())
        .lte('registration_token_expires_at', twoDaysFromNow.toISOString());
      
      const { data: expired } = await supabase
        .from('dispensary_applications')
        .select('id')
        .eq('application_status', 'approved')
        .eq('registration_completed', false)
        .lt('registration_token_expires_at', now.toISOString());
      
      setTokenStats({
        expiring: expiringSoon?.length || 0,
        expired: expired?.length || 0
      });
    };
    
    fetchTokenStats();
  }, []);
  
  if (tokenStats.expired > 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <KeyRound className="h-3 w-3" />
        {tokenStats.expired} Expired
      </Badge>
    );
  }
  
  if (tokenStats.expiring > 0) {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
        <KeyRound className="h-3 w-3" />
        {tokenStats.expiring} Expiring Soon
      </Badge>
    );
  }
  
  return null;
};

export const DispensaryPipelineMonitor = () => {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Reuse the same observed pipeline-health source as RealSystemHealthPanel so this widget
  // can never contradict it.
  const { health, loading: healthLoading, refresh: refreshHealth } = useRealSystemHealth(false);
  const pipelineHealth = health?.pipeline ?? null;

  useEffect(() => {
    fetchPipelineMetrics();
    const interval = setInterval(fetchPipelineMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchPipelineMetrics = async () => {
    try {
      setLoading(true);

      // Fetch applications data (exclude test applications)
      const { data: applications, error: appError } = await supabase
        .from('dispensary_applications')
        .select('*')
        .neq('application_status', 'test')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (appError) throw appError;

      // Fetch organizations (exclude test organizations)
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('*, dispensary_applications(id)')
        .neq('payment_status', 'test')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (orgError) throw orgError;

      // Fetch managers who registered via applications.
      // Two-step: profiles has no FK to user_roles, so an embedded join fails the schema cache.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: managerRoles, error: mgRoleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'dispensary_manager');

      if (mgRoleError) throw mgRoleError;

      const managerIds = (managerRoles || []).map(r => r.user_id);
      const { data: managers, error: mgError } = managerIds.length > 0
        ? await supabase
            .from('profiles')
            .select('*')
            .in('id', managerIds)
            .gte('created_at', thirtyDaysAgo)
        : { data: [], error: null };

      if (mgError) throw mgError;

      // Fetch employee invitations
      const { data: invitations, error: invError } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('communication_type', 'invitation')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (invError) throw invError;

      // Fetch employees (two-step for the same schema-cache reason as managers above)
      const { data: studentRoles, error: stRoleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (stRoleError) throw stRoleError;

      const studentIds = (studentRoles || []).map(r => r.user_id);
      const { data: employees, error: empError } = studentIds.length > 0
        ? await supabase
            .from('profiles')
            .select('*')
            .in('id', studentIds)
            .not('organization_id', 'is', null)
            .gte('created_at', thirtyDaysAgo)
        : { data: [], error: null };

      if (empError) throw empError;

      // Fetch certificates
      const { data: certificates, error: certError } = await supabase
        .from('certificates')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (certError) throw certError;

      const totalApplications = applications?.length || 0;
      const pending = applications?.filter(a => a.application_status === 'pending').length || 0;
      const approved = applications?.filter(a => a.application_status === 'approved').length || 0;
      const registered = applications?.filter(a => a.registration_completed).length || 0;

      const pipelineMetrics: PipelineMetrics = {
        totalApplications,
        pending,
        approved,
        paymentCompleted: organizations?.length || 0,
        managersRegistered: registered,
        employeesInvited: invitations?.length || 0,
        employeesEnrolled: employees?.length || 0,
        certificatesGenerated: certificates?.length || 0,
        lastUpdated: new Date().toISOString()
      };

      setMetrics(pipelineMetrics);

      // Calculate pipeline steps with health status
      const pipelineSteps: PipelineStep[] = [
        {
          id: 'submission',
          name: 'Application Submission',
          description: 'Dispensary applications received',
          status: totalApplications > 0 ? 'healthy' : 'warning',
          count: totalApplications,
          conversionRate: 100
        },
        {
          id: 'approval',
          name: 'Admin Approval',
          description: 'Applications reviewed and approved',
          status: approved === 0 && pending > 0 ? 'warning' : 'healthy',
          count: approved,
          conversionRate: totalApplications > 0 ? (approved / totalApplications) * 100 : 0,
          issues: pending > 5 ? [`${pending} applications pending review`] : []
        },
        {
          id: 'payment',
          name: 'Payment Processing',
          description: 'Organizations completed payment',
          status: approved > 0 && organizations?.length === 0 ? 'error' : 'healthy',
          count: organizations?.length || 0,
          conversionRate: approved > 0 ? ((organizations?.length || 0) / approved) * 100 : 0,
          issues: approved > organizations?.length ? [`${approved - (organizations?.length || 0)} approved but unpaid`] : []
        },
        {
          id: 'registration',
          name: 'Manager Registration',
          description: 'Managers completed account setup',
          status: (organizations?.length || 0) > registered ? 'warning' : 'healthy',
          count: registered,
          conversionRate: (organizations?.length || 0) > 0 ? (registered / (organizations?.length || 0)) * 100 : 0,
          issues: (organizations?.length || 0) > registered ? [`${(organizations?.length || 0) - registered} managers haven't registered`] : []
        },
        {
          id: 'invitations',
          name: 'Employee Invitations',
          description: 'Employees invited to training',
          status: 'healthy',
          count: invitations?.length || 0,
          conversionRate: registered > 0 ? ((invitations?.length || 0) / registered) * 100 : 0
        },
        {
          id: 'enrollment',
          name: 'Employee Enrollment',
          description: 'Employees activated accounts',
          status: (invitations?.length || 0) > (employees?.length || 0) ? 'warning' : 'healthy',
          count: employees?.length || 0,
          conversionRate: (invitations?.length || 0) > 0 ? ((employees?.length || 0) / (invitations?.length || 0)) * 100 : 0,
          issues: (invitations?.length || 0) > (employees?.length || 0) ? [`${(invitations?.length || 0) - (employees?.length || 0)} invitations not accepted`] : []
        },
        {
          id: 'completion',
          name: 'Certificate Generation',
          description: 'Employees completed training',
          status: (employees?.length || 0) > (certificates?.length || 0) ? 'warning' : 'healthy',
          count: certificates?.length || 0,
          conversionRate: (employees?.length || 0) > 0 ? ((certificates?.length || 0) / (employees?.length || 0)) * 100 : 0
        }
      ];

      setSteps(pipelineSteps);
      setLoadError(null);
    } catch (error: any) {
      setSteps([]);
      setMetrics(null);
      setLoadError(error?.message || 'Unknown error');
      console.error('Error fetching pipeline metrics:', error);
      toast({
        title: 'Error Loading Pipeline',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      healthy: 'default',
      warning: 'secondary',
      error: 'destructive',
      unknown: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading && !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Pipeline Metrics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Authoritative pipeline health comes from the shared snapshot when instrumented.
  const instrumented = Boolean(pipelineHealth?.instrumented);
  const healthyPipelines = pipelineHealth?.healthyPipelines ?? 0;
  const totalPipelines = pipelineHealth?.totalPipelines ?? 0;
  const overallHealth =
    instrumented && totalPipelines > 0 ? (healthyPipelines / totalPipelines) * 100 : null;
  const degraded =
    !instrumented ||
    overallHealth === null ||
    pipelineHealth?.status !== 'healthy' ||
    Boolean(loadError);
  const lastObservedAt = pipelineHealth?.lastRunAt || metrics?.lastUpdated || null;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dispensary Pipeline Health</CardTitle>
              <CardDescription>
                Last 30 days •{' '}
                {lastObservedAt
                  ? `Last observed ${new Date(lastObservedAt).toLocaleString()}`
                  : 'No observed pipeline-health run'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  fetchPipelineMetrics();
                  refreshHealth();
                }}
                variant="outline"
                size="sm"
                disabled={loading || healthLoading}
              >
                <RefreshCw className={`h-4 w-4 me-2 ${loading || healthLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overallHealth === null ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Degraded — no representative telemetry</AlertTitle>
                <AlertDescription>
                  Zero observed pipeline-health checks{loadError ? ` (query error: ${loadError})` : ''}.
                  Overall pipeline health cannot be scored and is not 0%.
                </AlertDescription>
              </Alert>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Pipeline Health</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={degraded ? 'secondary' : 'default'} className={degraded ? 'bg-yellow-600 text-white' : ''}>
                      {degraded
                        ? `Needs attention — ${healthyPipelines}/${totalPipelines} healthy`
                        : `${healthyPipelines}/${totalPipelines} healthy`}
                    </Badge>
                    <span className="text-2xl font-bold">{overallHealth.toFixed(0)}%</span>
                  </div>
                </div>
                <Progress value={overallHealth} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Sourced from the same observed pipeline-health snapshot as the System Health panel above.
                </p>
              </div>
            )}

            {steps.some(s => s.issues && s.issues.length > 0) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Action Items:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {steps.flatMap(s => s.issues || []).map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Track conversion rates at each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(step.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{step.name}</h4>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(step.status)}
                          {/* Show token status for registration step */}
                          {step.id === 'registration' && index > 0 && (
                            <TokenExpiryIndicator />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="text-end ms-4">
                    <div className="text-2xl font-bold">{step.count}</div>
                    {step.conversionRate !== undefined && (
                      <div className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                        {step.conversionRate.toFixed(1)}%
                        {step.conversionRate >= 80 ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-warning" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Progress value={step.conversionRate || 0} className="h-1" />
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground rtl-flip" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
