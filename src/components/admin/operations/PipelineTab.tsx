import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOperationsMetrics } from '@/hooks/useOperationsMetrics';
import DispensaryApplicationManager from '@/components/admin/DispensaryApplicationManager';

export function PipelineTab() {
  const { metrics } = useOperationsMetrics();

  const pipelineSteps = [
    {
      name: 'Applications Submitted',
      count: metrics.pendingApplications + metrics.applicationsApproved + metrics.applicationsRejected,
      status: 'healthy' as const
    },
    {
      name: 'Pending Review',
      count: metrics.pendingApplications,
      status: metrics.pendingApplications > 10 ? 'warning' as const : 'healthy' as const,
      issues: metrics.pendingApplications > 10 ? 'High queue detected' : undefined
    },
    {
      name: 'Approved',
      count: metrics.applicationsApproved,
      status: 'healthy' as const
    },
    {
      name: 'Payment Complete',
      count: Math.floor(metrics.applicationsApproved * 0.8),
      status: 'healthy' as const
    }
  ];

  return (
    <div className="space-y-6 py-6">
      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Application Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pipelineSteps.map((step, index) => {
              const total = pipelineSteps[0].count || 1;
              const conversionRate = index === 0 ? 100 : (step.count / total) * 100;
              
              return (
                <div key={step.name} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${step.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="font-medium">{step.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">{step.count}</span>
                      <Badge variant="outline">{conversionRate.toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={conversionRate} className="h-3" />
                  {step.issues && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ {step.issues}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Application Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <DispensaryApplicationManager />
        </CardContent>
      </Card>
    </div>
  );
}
