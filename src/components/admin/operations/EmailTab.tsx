import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw } from 'lucide-react';
import { useOperationsMetrics } from '@/hooks/useOperationsMetrics';
import { EmailAnalyticsCharts } from '@/components/admin/EmailAnalyticsCharts';
import { TestEmailSender } from '@/components/admin/TestEmailSender';

export function EmailTab() {
  const { metrics, refreshMetrics } = useOperationsMetrics();

  return (
    <div className="space-y-6 py-6">
      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle>Email Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="font-medium">Resend</p>
                  <p className="text-xs text-muted-foreground">Primary Provider</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50">Healthy</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="font-medium">SMTP</p>
                  <p className="text-xs text-muted-foreground">Backup Provider</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50">Standby</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sent (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.emailsSent24h}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.emailsDelivered}</div>
            <Progress value={metrics.emailDeliveryRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failedEmails}</div>
            {metrics.failedEmails > 0 && (
              <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                View Details →
              </Button>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingEmails}</div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Email Delivery Analytics</CardTitle>
          <Button variant="outline" size="sm" onClick={refreshMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <EmailAnalyticsCharts />
        </CardContent>
      </Card>

      {/* Quick Email Test */}
      <Card>
        <CardHeader>
          <CardTitle>Test Email Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <TestEmailSender />
        </CardContent>
      </Card>
    </div>
  );
}
