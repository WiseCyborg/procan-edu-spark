import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldAlert, 
  AlertTriangle, 
  RefreshCw, 
  FileWarning, 
  CalendarClock,
  Users,
  Award,
  Loader2
} from 'lucide-react';

interface ComplianceDashboardWidgetProps {
  organizationId: string;
}

interface ComplianceMetrics {
  organization_id: string;
  organization_name: string;
  expiring_certs_30d: number;
  invalid_signoffs: number;
  retraining_30d: number;
  open_incidents: number;
  overdue_reviews: number;
  total_employees: number;
  certified_employees: number;
}

export const ComplianceDashboardWidget: React.FC<ComplianceDashboardWidgetProps> = ({
  organizationId
}) => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['compliance-metrics', organizationId],
    queryFn: async () => {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('compliance_dashboard_metrics')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      
      if (error) throw error;
      return data as ComplianceMetrics;
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load compliance metrics
        </CardContent>
      </Card>
    );
  }

  const complianceRate = metrics.total_employees > 0
    ? Math.round((metrics.certified_employees / metrics.total_employees) * 100)
    : 0;

  const hasIssues = metrics.expiring_certs_30d > 0 || 
    metrics.invalid_signoffs > 0 || 
    metrics.open_incidents > 0 || 
    metrics.overdue_reviews > 0;

  return (
    <Card className={hasIssues ? 'border-amber-500/50' : 'border-green-500/50'}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Compliance Overview
          </div>
          <Badge variant={hasIssues ? 'secondary' : 'default'}>
            {complianceRate}% Certified
          </Badge>
        </CardTitle>
        <CardDescription>
          MCA audit readiness status for your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee Stats */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Total Employees</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {metrics.certified_employees} / {metrics.total_employees} certified
            </span>
          </div>
        </div>

        {/* Alert Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Expiring Certs */}
          <div className={`p-3 rounded-lg border ${metrics.expiring_certs_30d > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'bg-muted/30'}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CalendarClock className="h-4 w-4" />
              Expiring (30d)
            </div>
            <div className={`text-2xl font-bold ${metrics.expiring_certs_30d > 0 ? 'text-amber-600' : ''}`}>
              {metrics.expiring_certs_30d}
            </div>
          </div>

          {/* Invalid Signoffs */}
          <div className={`p-3 rounded-lg border ${metrics.invalid_signoffs > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'bg-muted/30'}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileWarning className="h-4 w-4" />
              Invalid Signoffs
            </div>
            <div className={`text-2xl font-bold ${metrics.invalid_signoffs > 0 ? 'text-amber-600' : ''}`}>
              {metrics.invalid_signoffs}
            </div>
          </div>

          {/* Open Incidents */}
          <div className={`p-3 rounded-lg border ${metrics.open_incidents > 0 ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/30'}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              Open Incidents
            </div>
            <div className={`text-2xl font-bold ${metrics.open_incidents > 0 ? 'text-destructive' : ''}`}>
              {metrics.open_incidents}
            </div>
          </div>

          {/* Retraining (30d) */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <RefreshCw className="h-4 w-4" />
              Retraining (30d)
            </div>
            <div className="text-2xl font-bold">
              {metrics.retraining_30d}
            </div>
          </div>
        </div>

        {/* Overdue Reviews Alert */}
        {metrics.overdue_reviews > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-destructive font-medium">
              {metrics.overdue_reviews} overdue compliance review{metrics.overdue_reviews !== 1 ? 's' : ''} require attention
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
