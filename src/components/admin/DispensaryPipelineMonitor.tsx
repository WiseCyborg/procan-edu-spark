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
  Play,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

export const DispensaryPipelineMonitor = () => {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchPipelineMetrics();
    const interval = setInterval(fetchPipelineMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchPipelineMetrics = async () => {
    try {
      setLoading(true);

      // Fetch applications data
      const { data: applications, error: appError } = await supabase
        .from('dispensary_applications')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (appError) throw appError;

      // Fetch organizations
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('*, dispensary_applications(id)')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (orgError) throw orgError;

      // Fetch managers who registered via applications
      const { data: managers, error: mgError } = await supabase
        .from('profiles')
        .select('*, user_roles!inner(*)')
        .eq('user_roles.role', 'dispensary_manager')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (mgError) throw mgError;

      // Fetch employee invitations
      const { data: invitations, error: invError } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('communication_type', 'invitation')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (invError) throw invError;

      // Fetch employees
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('*, user_roles!inner(*)')
        .eq('user_roles.role', 'student')
        .not('organization_id', 'is', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

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
    } catch (error: any) {
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

  const testPipeline = async () => {
    setTesting(true);
    toast({
      title: 'Pipeline Test Starting',
      description: 'Testing all edge functions and database operations...'
    });

    try {
      // Test 1: Application submission endpoint
      const { data: testApp, error: testError } = await supabase
        .from('dispensary_applications')
        .select('id')
        .limit(1)
        .single();

      if (testError && testError.code !== 'PGRST116') {
        throw new Error(`Database test failed: ${testError.message}`);
      }

      // Test 2: Email function
      const { data: emailTest, error: emailError } = await supabase.functions.invoke(
        'send-application-confirmation',
        {
          body: {
            test: true,
            application_id: 'test-id',
            contact_person: 'Test User',
            contact_email: 'test@example.com',
            organization_name: 'Test Org',
            license_number: 'TEST-123'
          }
        }
      );

      if (emailError) {
        console.warn('Email function test failed:', emailError);
      }

      toast({
        title: 'Pipeline Test Complete',
        description: 'Check console for detailed results',
        variant: emailError ? 'destructive' : 'default'
      });

      await fetchPipelineMetrics();
    } catch (error: any) {
      toast({
        title: 'Pipeline Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
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

  const overallHealth = steps.length > 0 
    ? (steps.filter(s => s.status === 'healthy').length / steps.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dispensary Pipeline Health</CardTitle>
              <CardDescription>
                Last 30 days • Updated {metrics ? new Date(metrics.lastUpdated).toLocaleTimeString() : 'N/A'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchPipelineMetrics} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={testPipeline} variant="outline" size="sm" disabled={testing}>
                <Play className="h-4 w-4 mr-2" />
                {testing ? 'Testing...' : 'Test Pipeline'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Pipeline Health</span>
                <span className="text-2xl font-bold">{overallHealth.toFixed(0)}%</span>
              </div>
              <Progress value={overallHealth} className="h-2" />
            </div>

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
                        {getStatusBadge(step.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
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
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
