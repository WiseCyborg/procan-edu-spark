import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingDown } from 'lucide-react';
import { useOperationsMetrics } from '@/hooks/useOperationsMetrics';
import { EdgeFunctionsStatus } from '@/components/admin/EdgeFunctionsStatus';
import { IntegrationHealthMonitor } from '@/components/admin/IntegrationHealthMonitor';
import { SLODashboard } from '@/components/admin/SLODashboard';
import QueueAndCronPulse from '@/components/admin/QueueAndCronPulse';

export function HealthTab() {
  const { metrics } = useOperationsMetrics();

  const getHealthColor = (health: number) => {
    if (health >= 95) return 'text-green-600';
    if (health >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 py-6">
      {/* Queue & Cron Monitoring */}
      <QueueAndCronPulse />

      {/* SLO Dashboard */}
      <SLODashboard />

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center mb-4">
            <div className="relative h-40 w-40">
              <svg className="h-full w-full" viewBox="0 0 100 100">
                <circle
                  className="text-muted stroke-current"
                  strokeWidth="10"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                />
                <circle
                  className={`${getHealthColor(metrics.systemHealth)} stroke-current`}
                  strokeWidth="10"
                  strokeLinecap="round"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  strokeDasharray={`${metrics.systemHealth * 2.51}, 251`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold">{metrics.systemHealth}%</span>
              </div>
            </div>
          </div>
          <p className="text-center text-muted-foreground">
            {metrics.systemHealth >= 95 ? '✅ All systems operational' : 
             metrics.systemHealth >= 80 ? '⚠️ Minor issues detected' : 
             '🔴 Critical issues require attention'}
          </p>
        </CardContent>
      </Card>

      {/* Edge Functions Status */}
      <Card>
        <CardHeader>
          <CardTitle>Edge Functions</CardTitle>
        </CardHeader>
        <CardContent>
          <EdgeFunctionsStatus />
        </CardContent>
      </Card>

      {/* Integration Health */}
      <Card>
        <CardHeader>
          <CardTitle>Third-Party Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <IntegrationHealthMonitor />
        </CardContent>
      </Card>

      {/* Database Performance */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Query Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24ms</div>
            <p className="text-xs text-green-600 mt-1">
              <TrendingDown className="h-3 w-3 inline mr-1" />
              Optimal
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <Progress value={12} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4GB</div>
            <p className="text-xs text-muted-foreground mt-1">of 10GB</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
