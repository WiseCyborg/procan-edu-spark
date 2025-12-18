import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, Database, Zap, Activity, RefreshCw, CheckCircle, 
  AlertTriangle, XCircle, Clock, Send, AlertOctagon 
} from 'lucide-react';
import { useRealSystemHealth, SystemHealthData } from '@/hooks/useRealSystemHealth';
import { formatDistanceToNow } from 'date-fns';

const StatusBadge = ({ status }: { status: 'healthy' | 'degraded' | 'down' }) => {
  const variants = {
    healthy: { variant: 'default' as const, icon: CheckCircle, label: 'Healthy', className: 'bg-green-500' },
    degraded: { variant: 'secondary' as const, icon: AlertTriangle, label: 'Degraded', className: 'bg-yellow-500' },
    down: { variant: 'destructive' as const, icon: XCircle, label: 'Down', className: 'bg-red-500' },
  };
  
  const config = variants[status];
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.className} text-white`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
};

const MetricCard = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon,
  trend 
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
    <div className="p-2 rounded-md bg-background">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </div>
  </div>
);

export const RealSystemHealthPanel = () => {
  const { health, loading, refresh } = useRealSystemHealth();

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading system health...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertOctagon className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-muted-foreground">Unable to load system health data</p>
          <Button onClick={refresh} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <StatusBadge status={health.overallStatus} />
          <span className="text-sm text-muted-foreground">
            Last updated: {formatDistanceToNow(new Date(health.lastUpdated), { addSuffix: true })}
          </span>
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Email System Health */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle className="text-lg">Email System</CardTitle>
            </div>
            <StatusBadge status={health.email.status} />
          </div>
          <CardDescription>
            Provider: {health.email.provider} • Failure Rate: {health.email.failureRate}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="Sent (24h)" 
              value={health.email.sent24h} 
              icon={Send}
            />
            <MetricCard 
              label="Delivered" 
              value={health.email.delivered24h} 
              icon={CheckCircle}
            />
            <MetricCard 
              label="Failed" 
              value={health.email.failed24h} 
              icon={XCircle}
            />
            <MetricCard 
              label="Avg Send Time" 
              value={`${health.email.avgSendTimeMs}ms`} 
              icon={Clock}
            />
          </div>
          {health.email.lastSentAt && (
            <p className="text-xs text-muted-foreground mt-3">
              Last email sent: {formatDistanceToNow(new Date(health.email.lastSentAt), { addSuffix: true })}
            </p>
          )}
          {health.email.status !== 'healthy' && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {health.email.failureRate >= 20 
                  ? 'High failure rate detected - check email provider configuration'
                  : 'Elevated failure rate - monitoring recommended'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Health */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle className="text-lg">Database</CardTitle>
            </div>
            <StatusBadge status={health.database.status} />
          </div>
          <CardDescription>
            Query latency and connection health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard 
              label="Avg Query Time" 
              value={`${health.database.avgQueryTimeMs}ms`} 
              icon={Clock}
            />
            <MetricCard 
              label="Issues (24h)" 
              value={health.database.writeFailures24h} 
              icon={AlertOctagon}
            />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Query Performance</span>
              <span className={health.database.avgQueryTimeMs < 100 ? 'text-green-600' : 'text-yellow-600'}>
                {health.database.avgQueryTimeMs < 100 ? 'Excellent' : 'Normal'}
              </span>
            </div>
            <Progress 
              value={Math.min(100, 100 - (health.database.avgQueryTimeMs / 10))} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Edge Functions Health */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle className="text-lg">Edge Functions</CardTitle>
            </div>
            <StatusBadge status={health.edgeFunctions.status} />
          </div>
          <CardDescription>
            Serverless function execution status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard 
              label="Deployed" 
              value={health.edgeFunctions.totalExecutions1h} 
              icon={CheckCircle}
            />
            <MetricCard 
              label="Failures" 
              value={health.edgeFunctions.failures1h} 
              icon={XCircle}
            />
            <MetricCard 
              label="Avg Runtime" 
              value={`${health.edgeFunctions.avgRuntimeMs}ms`} 
              icon={Clock}
            />
          </div>
          {health.edgeFunctions.lastError && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                <strong>Last Error:</strong> {health.edgeFunctions.lastError}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Health Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle className="text-lg">Pipeline Health</CardTitle>
            </div>
            <Badge variant="outline">
              {health.pipeline.healthyPipelines}/{health.pipeline.totalPipelines} Healthy
            </Badge>
          </div>
          <CardDescription>
            {health.pipeline.lastRunAt 
              ? `Last agent run: ${formatDistanceToNow(new Date(health.pipeline.lastRunAt), { addSuffix: true })}`
              : 'Agent not yet run'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="Issues Detected" 
              value={health.pipeline.issuesDetected} 
              icon={AlertTriangle}
            />
            <MetricCard 
              label="Auto-Fixed Today" 
              value={health.pipeline.autoFixedToday} 
              icon={CheckCircle}
            />
            <MetricCard 
              label="Needs Attention" 
              value={health.pipeline.needsAttention} 
              icon={AlertOctagon}
            />
            <MetricCard 
              label="Healthy Pipelines" 
              value={`${health.pipeline.healthyPipelines}/${health.pipeline.totalPipelines}`} 
              icon={Activity}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
