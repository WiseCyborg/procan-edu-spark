import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, Activity, AlertTriangle, ExternalLink } from 'lucide-react';
import { useOperationsMetrics } from '@/hooks/useOperationsMetrics';
import { EmailAnalyticsCharts } from '@/components/admin/EmailAnalyticsCharts';
import { TestEmailSender } from '@/components/admin/TestEmailSender';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function EmailTab() {
  const { metrics, refreshMetrics } = useOperationsMetrics();
  const navigate = useNavigate();

  const { data: emailHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['email-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('email-health-check');
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Check every minute
  });

  // Check if domain verification error exists
  const hasDomainError = emailHealth?.errors?.some((error: string) => 
    error.includes('domain') || error.includes('verified') || error.includes('procannedu.com')
  );

  return (
    <div className="space-y-6 py-6">
      {/* Critical Domain Verification Alert */}
      {hasDomainError && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">🚨 URGENT: Email Domain Not Verified</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>
              All emails from <code className="px-2 py-1 bg-destructive/20 rounded">procannedu.com</code> are failing 
              because the domain is not verified with Resend.
            </p>
            <Button 
              onClick={() => navigate('/admin/email-domain')}
              variant="default"
              className="mt-2"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Fix Domain Verification Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Email System Health Widget */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Email System Health
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={emailHealth?.status === 'HEALTHY' ? 'default' : 'destructive'}>
                {emailHealth?.status || 'CHECKING...'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => refetchHealth()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Last Hour</p>
              <p className="text-2xl font-bold">{emailHealth?.metrics?.emails_last_hour || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {emailHealth?.metrics?.success_rate || '0%'}
              </p>
            </div>
          </div>
          
          {emailHealth?.errors && emailHealth.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Issues Detected</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2">
                  {emailHealth.errors.map((error: string, i: number) => (
                    <li key={i} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-xs text-muted-foreground">
            Last checked: {emailHealth?.timestamp 
              ? formatDistanceToNow(new Date(emailHealth.timestamp), { addSuffix: true })
              : 'Never'}
          </p>
        </CardContent>
      </Card>

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
