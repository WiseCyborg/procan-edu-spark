import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  usePipelineHealth, 
  useLatestPipelineStatus, 
  useStuckApplications,
  useRunPipelineHealthCheck 
} from '@/hooks/usePipelineHealth';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Clock, AlertCircle, Settings, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AlertRecipientManager } from '@/components/admin/AlertRecipientManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineHealthMonitor } from '@/components/admin/PipelineHealthMonitor';
import { EmailSystemDiagnostics } from '@/components/admin/EmailSystemDiagnostics';
import { EmailSystemRecovery } from '@/components/admin/EmailSystemRecovery';
import { PipelineHealthAgent } from '@/components/admin/PipelineHealthAgent';

export function PipelineHealthTab() {
  const { data: healthHistory } = usePipelineHealth();
  const { data: latestStatus } = useLatestPipelineStatus();
  const { data: stuckApps } = useStuckApplications();
  const runHealthCheck = useRunPipelineHealthCheck();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Degraded</Badge>;
      case 'critical':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Tabs defaultValue="agent" className="space-y-6">
      <TabsList>
        <TabsTrigger value="agent">
          <Bot className="h-4 w-4 mr-2" />
          Health Agent
        </TabsTrigger>
        <TabsTrigger value="status">Health Status</TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="h-4 w-4 mr-2" />
          Alert Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="agent" className="space-y-6">
        {/* Pipeline Health Agent - Primary Monitoring */}
        <PipelineHealthAgent />
      </TabsContent>

      <TabsContent value="status" className="space-y-6">
        {/* Email System Diagnostics */}
        <EmailSystemDiagnostics />
        
        {/* Automated Recovery Actions */}
        <EmailSystemRecovery />
        
        {/* New Pipeline Health Monitor */}
        <PipelineHealthMonitor />

        {/* Current Status */}
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pipeline Health Status</CardTitle>
              <CardDescription>
                Real-time monitoring of application pipeline health
              </CardDescription>
            </div>
            <Button
              onClick={() => runHealthCheck.mutate()}
              disabled={runHealthCheck.isPending}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${runHealthCheck.isPending ? 'animate-spin' : ''}`} />
              Run Check
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {latestStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(latestStatus.status)}
                  <div>
                    <div className="font-semibold">Overall Status</div>
                    <div className="text-sm text-muted-foreground">
                      Last checked {formatDistanceToNow(new Date(latestStatus.checked_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                {getStatusBadge(latestStatus.status)}
              </div>

              {latestStatus.metadata?.checks && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Stuck Applications</div>
                    <div className="text-2xl font-bold">
                      {latestStatus.metadata.checks.stuck_applications}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Orphaned Organizations</div>
                    <div className="text-2xl font-bold">
                      {latestStatus.metadata.checks.orphaned_organizations}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Stuck Notifications</div>
                    <div className="text-2xl font-bold">
                      {latestStatus.metadata.checks.stuck_notifications}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Failed Emails (1h)</div>
                    <div className="text-2xl font-bold">
                      {latestStatus.metadata.checks.failed_emails}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No health check data available. Click "Run Check" to perform initial check.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stuck Applications */}
      {stuckApps && stuckApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Stuck Applications
            </CardTitle>
            <CardDescription>
              Applications pending review for more than 48 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stuckApps.map((app) => (
                <div key={app.application_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{app.organization_name}</div>
                      <div className="text-sm text-muted-foreground">{app.contact_email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{app.hours_stuck}h stuck</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last updated: {formatDistanceToNow(new Date(app.last_updated), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Health Checks</CardTitle>
          <CardDescription>Last 10 pipeline health checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {healthHistory?.slice(0, 10).map((check) => (
              <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="text-sm font-medium">{check.check_type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(check.checked_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {check.error_count > 0 && (
                    <Badge variant="outline" className="text-destructive">
                      {check.error_count} errors
                    </Badge>
                  )}
                  {getStatusBadge(check.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="settings">
      <AlertRecipientManager />
    </TabsContent>
  </Tabs>
  );
}
