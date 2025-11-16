import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Users, 
  Award, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';
import { usePipelineMetrics } from '@/hooks/usePipelineMetrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const ComprehensivePipelineHealth = () => {
  const { data: metrics, isLoading } = usePipelineMetrics();
  
  // Queue health from existing view
  const { data: queueHealth } = useQuery({
    queryKey: ['queue-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_queue_health')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (percentage: number) => {
    if (percentage >= 80) return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
    if (percentage >= 60) return <Badge variant="default" className="bg-yellow-500">Warning</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Top Row: 3 Metric Tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Application → Approval
              </span>
              {getHealthBadge(metrics.approval_rate_30d)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-3xl font-bold flex items-baseline gap-2">
                {metrics.approval_rate_30d}%
                <span className="text-sm font-normal text-muted-foreground">
                  ({metrics.applications_approved_30d}/{metrics.applications_submitted_30d})
                </span>
              </div>
              <Progress value={metrics.approval_rate_30d} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Median: {Math.round(metrics.avg_approval_hours_30d)}h to approve
              </div>
              {metrics.applications_pending > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  {metrics.applications_pending} pending review
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Seat Utilization
              </span>
              {getHealthBadge(metrics.seat_utilization_rate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-3xl font-bold flex items-baseline gap-2">
                {metrics.seat_utilization_rate}%
                <span className="text-sm font-normal text-muted-foreground">
                  ({metrics.used_seats}/{metrics.total_seats})
                </span>
              </div>
              <Progress value={metrics.seat_utilization_rate} className="h-2" />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Available</div>
                  <div className="font-semibold">{metrics.available_seats}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Assigned</div>
                  <div className="font-semibold">{metrics.assigned_seats}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Used</div>
                  <div className="font-semibold text-green-600">{metrics.used_seats}</div>
                </div>
              </div>
              {metrics.orgs_with_unused_seats > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  {metrics.orgs_with_unused_seats} orgs with unused seats
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Certification Conversion
              </span>
              {getHealthBadge(metrics.certification_conversion_rate_30d)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-3xl font-bold flex items-baseline gap-2">
                {metrics.certification_conversion_rate_30d}%
                <span className="text-sm font-normal text-muted-foreground">
                  ({metrics.certificates_issued_30d} certs)
                </span>
              </div>
              <Progress value={metrics.certification_conversion_rate_30d} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Median: {Math.round(metrics.avg_completion_days_30d)} days to certify
              </div>
              {metrics.certificates_expiring_soon > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  {metrics.certificates_expiring_soon} expiring in 30 days
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Queue & Job Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Async Job Queue Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueHealth ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {queueHealth.queued_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Queued</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {queueHealth.processing_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {queueHealth.completed_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${queueHealth.failed_count > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {queueHealth.failed_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>

              {(queueHealth.queued_count > 50 || queueHealth.failed_count > 0) && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">
                      {queueHealth.queued_count > 50 ? `High queue backlog (${queueHealth.queued_count} jobs)` : ''}
                      {queueHealth.queued_count > 50 && queueHealth.failed_count > 0 ? ' • ' : ''}
                      {queueHealth.failed_count > 0 ? `${queueHealth.failed_count} failed jobs need attention` : ''}
                    </span>
                  </div>
                </div>
              )}

              {queueHealth.queued_count === 0 && queueHealth.failed_count === 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">All queues healthy</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: 3 Mini Funnels */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Dispensary Funnel (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Applied</span>
                <span className="font-semibold">{metrics.funnel_dispensary_applied}</span>
              </div>
              <Progress value={100} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Approved</span>
                <span className="font-semibold text-green-600">
                  {metrics.funnel_dispensary_approved} ({metrics.funnel_dispensary_applied > 0 ? Math.round((metrics.funnel_dispensary_approved / metrics.funnel_dispensary_applied) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_dispensary_applied > 0 ? (metrics.funnel_dispensary_approved / metrics.funnel_dispensary_applied) * 100 : 0} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Manager Registered</span>
                <span className="font-semibold">
                  {metrics.funnel_dispensary_registered} ({metrics.funnel_dispensary_approved > 0 ? Math.round((metrics.funnel_dispensary_registered / metrics.funnel_dispensary_approved) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_dispensary_approved > 0 ? (metrics.funnel_dispensary_registered / metrics.funnel_dispensary_approved) * 100 : 0} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Seats Purchased</span>
                <span className="font-semibold text-blue-600">
                  {metrics.funnel_dispensary_seats_purchased} ({metrics.funnel_dispensary_approved > 0 ? Math.round((metrics.funnel_dispensary_seats_purchased / metrics.funnel_dispensary_approved) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_dispensary_approved > 0 ? (metrics.funnel_dispensary_seats_purchased / metrics.funnel_dispensary_approved) * 100 : 0} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Employee Funnel (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Invited</span>
                <span className="font-semibold">{metrics.funnel_employee_invited}</span>
              </div>
              <Progress value={100} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Registered</span>
                <span className="font-semibold">
                  {metrics.funnel_employee_registered} ({metrics.funnel_employee_invited > 0 ? Math.round((metrics.funnel_employee_registered / metrics.funnel_employee_invited) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_employee_invited > 0 ? (metrics.funnel_employee_registered / metrics.funnel_employee_invited) * 100 : 0} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Started Course</span>
                <span className="font-semibold">
                  {metrics.funnel_employee_started} ({metrics.funnel_employee_registered > 0 ? Math.round((metrics.funnel_employee_started / metrics.funnel_employee_registered) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_employee_registered > 0 ? (metrics.funnel_employee_started / metrics.funnel_employee_registered) * 100 : 0} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Completed</span>
                <span className="font-semibold text-green-600">
                  {metrics.funnel_employee_completed} ({metrics.funnel_employee_started > 0 ? Math.round((metrics.funnel_employee_completed / metrics.funnel_employee_started) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_employee_started > 0 ? (metrics.funnel_employee_completed / metrics.funnel_employee_started) * 100 : 0} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Took Exam</span>
                <span className="font-semibold text-blue-600">
                  {metrics.funnel_employee_took_exam} ({metrics.funnel_employee_completed > 0 ? Math.round((metrics.funnel_employee_took_exam / metrics.funnel_employee_completed) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_employee_completed > 0 ? (metrics.funnel_employee_took_exam / metrics.funnel_employee_completed) * 100 : 0} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Certification Funnel (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Exams Taken</span>
                <span className="font-semibold">{metrics.funnel_cert_took_exam}</span>
              </div>
              <Progress value={100} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Passed</span>
                <span className="font-semibold text-green-600">
                  {metrics.funnel_cert_passed} ({metrics.funnel_cert_took_exam > 0 ? Math.round((metrics.funnel_cert_passed / metrics.funnel_cert_took_exam) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_cert_took_exam > 0 ? (metrics.funnel_cert_passed / metrics.funnel_cert_took_exam) * 100 : 0} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Cert Generated</span>
                <span className="font-semibold">
                  {metrics.funnel_cert_generated} ({metrics.funnel_cert_passed > 0 ? Math.round((metrics.funnel_cert_generated / metrics.funnel_cert_passed) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_cert_passed > 0 ? (metrics.funnel_cert_generated / metrics.funnel_cert_passed) * 100 : 0} className="h-1" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Delivered</span>
                <span className="font-semibold text-blue-600">
                  {metrics.funnel_cert_delivered} ({metrics.funnel_cert_generated > 0 ? Math.round((metrics.funnel_cert_delivered / metrics.funnel_cert_generated) * 100) : 0}%)
                </span>
              </div>
              <Progress value={metrics.funnel_cert_generated > 0 ? (metrics.funnel_cert_delivered / metrics.funnel_cert_generated) * 100 : 0} className="h-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
