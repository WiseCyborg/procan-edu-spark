import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, GitBranch, Heart, TrendingUp, Eye, RefreshCw, Wrench } from 'lucide-react';
import { useOperationsMetrics } from '@/hooks/useOperationsMetrics';

export function OverviewTab() {
  const { metrics, refreshMetrics } = useOperationsMetrics();

  const emailHealth = metrics.emailDeliveryRate;
  const pipelineConversion = metrics.pipelineConversion;
  const systemHealth = metrics.systemHealth;

  return (
    <div className="space-y-6 py-6">
      {/* Critical Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Alert variant={emailHealth > 95 ? 'default' : 'destructive'}>
          <Mail className="h-4 w-4" />
          <AlertTitle>Email Delivery</AlertTitle>
          <AlertDescription>
            {emailHealth.toFixed(1)}% success rate (last 24h)
            {emailHealth < 95 && <Button variant="link" size="sm" className="p-0 h-auto ml-2">Fix Issues →</Button>}
          </AlertDescription>
        </Alert>

        <Alert variant={pipelineConversion > 70 ? 'default' : 'destructive'}>
          <GitBranch className="h-4 w-4" />
          <AlertTitle>Dispensary Pipeline</AlertTitle>
          <AlertDescription>
            {pipelineConversion.toFixed(1)}% conversion rate
            {pipelineConversion < 70 && <Button variant="link" size="sm" className="p-0 h-auto ml-2">Review →</Button>}
          </AlertDescription>
        </Alert>

        <Alert variant={systemHealth > 90 ? 'default' : 'destructive'}>
          <Heart className="h-4 w-4" />
          <AlertTitle>System Health</AlertTitle>
          <AlertDescription>
            {systemHealth}% overall health
            {systemHealth < 90 && <Button variant="link" size="sm" className="p-0 h-auto ml-2">Diagnose →</Button>}
          </AlertDescription>
        </Alert>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Platform users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emails (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.emailsSent24h}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.failedEmails} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Apps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.pendingApplications}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.avgApprovalTime}h avg approval time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(metrics.revenueMTD / 100).toFixed(0)}</div>
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Wrench className="h-4 w-4 mr-2" />
            Run Fast Track Test
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Review Applications
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Check Email Logs
          </Button>
          <Button variant="outline" size="sm" onClick={refreshMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Metrics
          </Button>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status Overview</CardTitle>
          <CardDescription>Real-time operational status of all systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database Performance</span>
              <Badge variant="default">Optimal</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Edge Functions</span>
              <Badge variant="default">{metrics.edgeFunctionsUp}/{metrics.edgeFunctionsTotal} Online</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email Delivery</span>
              <Badge variant={emailHealth > 95 ? 'default' : 'destructive'}>
                {emailHealth.toFixed(0)}% Success
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Processing</span>
              <Badge variant="default">Connected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
