import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle2, Users, RefreshCw, Calendar } from 'lucide-react';

interface ComplianceHealth {
  organization_id: string;
  organization_name: string;
  total_employees: number;
  certified_employees: number;
  working_uncertified: number;
  pending_retraining: number;
  overdue_reviews: number;
  missing_signoffs: number;
  compliance_status: string;
  certification_rate: number;
}

export const PipelineComplianceWidget = () => {
  const { data: healthData, isLoading, error } = useQuery({
    queryKey: ['pipeline-compliance-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_pipeline_compliance_health')
        .select('*')
        .order('compliance_status', { ascending: false });

      if (error) throw error;
      return data as ComplianceHealth[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      case 'healthy':
        return 'bg-green-500 text-white';
      default:
        return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <RefreshCw className="h-4 w-4" />;
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  // Calculate summary stats
  const summary = healthData?.reduce((acc, org) => ({
    totalOrgs: acc.totalOrgs + 1,
    criticalOrgs: acc.criticalOrgs + (org.compliance_status === 'critical' ? 1 : 0),
    warningOrgs: acc.warningOrgs + (org.compliance_status === 'warning' ? 1 : 0),
    healthyOrgs: acc.healthyOrgs + (org.compliance_status === 'healthy' ? 1 : 0),
    totalEmployees: acc.totalEmployees + org.total_employees,
    totalCertified: acc.totalCertified + org.certified_employees,
    totalUncertified: acc.totalUncertified + org.working_uncertified,
    totalPendingRetraining: acc.totalPendingRetraining + org.pending_retraining,
    totalOverdueReviews: acc.totalOverdueReviews + org.overdue_reviews,
  }), {
    totalOrgs: 0,
    criticalOrgs: 0,
    warningOrgs: 0,
    healthyOrgs: 0,
    totalEmployees: 0,
    totalCertified: 0,
    totalUncertified: 0,
    totalPendingRetraining: 0,
    totalOverdueReviews: 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pipeline Compliance Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading compliance data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pipeline Compliance Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load compliance data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Pipeline Compliance Health
        </CardTitle>
        <CardDescription>
          Real-time compliance status across all organizations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{summary?.totalOrgs || 0}</p>
            <p className="text-xs text-muted-foreground">Organizations</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{summary?.healthyOrgs || 0}</p>
            <p className="text-xs text-muted-foreground">Healthy</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{summary?.warningOrgs || 0}</p>
            <p className="text-xs text-muted-foreground">Warning</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{summary?.criticalOrgs || 0}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-lg font-semibold">
                {summary?.totalCertified || 0}/{summary?.totalEmployees || 0}
              </p>
              <p className="text-xs text-muted-foreground">Certified Employees</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-lg font-semibold">{summary?.totalUncertified || 0}</p>
              <p className="text-xs text-muted-foreground">Working Uncertified</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <RefreshCw className="h-8 w-8 text-warning" />
            <div>
              <p className="text-lg font-semibold">{summary?.totalPendingRetraining || 0}</p>
              <p className="text-xs text-muted-foreground">Pending Retraining</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Calendar className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{summary?.totalOverdueReviews || 0}</p>
              <p className="text-xs text-muted-foreground">Overdue Reviews</p>
            </div>
          </div>
        </div>

        {/* Organization List */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Organization Status</h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {healthData?.map((org) => (
              <div 
                key={org.organization_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(org.compliance_status)}
                  <div>
                    <p className="font-medium text-sm">{org.organization_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {org.certified_employees}/{org.total_employees} certified
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <Progress value={org.certification_rate} className="h-2" />
                  </div>
                  <Badge className={getStatusColor(org.compliance_status)}>
                    {org.certification_rate}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
