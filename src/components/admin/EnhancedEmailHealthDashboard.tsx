import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertCircle, CheckCircle, Clock, Mail, Search, TrendingUp, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProviderHealth {
  provider_name: string;
  status: 'online' | 'degraded' | 'offline';
  response_time_ms: number;
  last_success_at: string;
  error_count: number;
}

interface EmailMetrics {
  total_sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  email_type: string;
  status: string;
  created_at: string;
  sent_at?: string;
  metadata?: any;
}

export const EnhancedEmailHealthDashboard = () => {
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [metrics, setMetrics] = useState<EmailMetrics>({
    total_sent: 0,
    delivered: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    delivery_rate: 0,
    open_rate: 0,
    click_rate: 0,
  });
  const [recentEmails, setRecentEmails] = useState<EmailLog[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmailHealth();
    
    const channel = supabase
      .channel('email-health-monitoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_logs' }, () => {
        fetchEmailHealth();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_provider_health' }, () => {
        fetchProviderHealth();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmailHealth = async () => {
    try {
      setLoading(true);
      
      // Fetch email logs
      const { data: emailLogs } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setRecentEmails((emailLogs || []) as EmailLog[]);

      // Fetch communication logs for open/click rates
      const { data: commLogs } = await supabase
        .from('communication_logs')
        .select('*');

      // Calculate metrics
      const totalSent = emailLogs?.filter(e => e.status === 'sent').length || 0;
      const failed = emailLogs?.filter(e => e.status === 'failed').length || 0;
      const opened = commLogs?.filter(c => c.opened_at).length || 0;
      const clicked = commLogs?.filter(c => c.clicked_at).length || 0;

      setMetrics({
        total_sent: emailLogs?.length || 0,
        delivered: totalSent,
        failed,
        opened,
        clicked,
        delivery_rate: totalSent > 0 ? (totalSent / (totalSent + failed)) * 100 : 0,
        open_rate: totalSent > 0 ? (opened / totalSent) * 100 : 0,
        click_rate: totalSent > 0 ? (clicked / totalSent) * 100 : 0,
      });

      await fetchProviderHealth();
    } catch (error) {
      console.error('Error fetching email health:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email health data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderHealth = async () => {
    const { data } = await supabase
      .from('email_provider_health')
      .select('*')
      .order('last_check_at', { ascending: false });

    if (data) {
      setProviderHealth(data as ProviderHealth[]);
    }
  };

  const testProviders = async () => {
    try {
      toast({
        title: 'Testing Providers',
        description: 'Testing Resend and SMTP connections...',
      });

      const { data, error } = await supabase.functions.invoke('test-email-providers');

      if (error) throw error;

      toast({
        title: 'Test Complete',
        description: `Resend: ${data.resend.status}, SMTP: ${data.smtp.status}`,
      });

      await fetchProviderHealth();
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Could not test email providers',
        variant: 'destructive',
      });
    }
  };

  const searchEmailHistory = async () => {
    if (!searchEmail) return;

    try {
      const { data } = await supabase
        .from('email_logs')
        .select('*')
        .ilike('recipient_email', `%${searchEmail}%`)
        .order('created_at', { ascending: false });

      setRecentEmails((data || []) as EmailLog[]);
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Could not search email history',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Health Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {providerHealth.map((provider) => (
          <Card key={provider.provider_name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {provider.provider_name.toUpperCase()}
              </CardTitle>
              {getStatusIcon(provider.status)}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-2 w-2 rounded-full ${getHealthColor(provider.status)} animate-pulse`} />
                <Badge variant="outline">{provider.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Response: {provider.response_time_ms}ms
              </p>
              <p className="text-xs text-muted-foreground">
                Last success: {provider.last_success_at ? formatDistanceToNow(new Date(provider.last_success_at), { addSuffix: true }) : 'Never'}
              </p>
              <p className="text-xs text-muted-foreground">
                Errors: {provider.error_count}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Real-Time Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_sent}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.delivery_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {metrics.delivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.open_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.opened} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failed}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Needs attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Health Alert */}
      {metrics.delivery_rate < 90 && metrics.total_sent > 10 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Warning: Low Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your delivery rate is below 90%. Check provider status and review failed emails.
            </p>
            <Button onClick={testProviders} className="mt-2" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Test Providers
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Email Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Email History</CardTitle>
          <CardDescription>Find emails sent to specific users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchEmailHistory()}
            />
            <Button onClick={searchEmailHistory}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Email Activity
          </CardTitle>
          <CardDescription>Live feed of email delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentEmails.map((email) => (
              <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{email.recipient_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {email.email_type} • {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                  </p>
                  {email.metadata?.error && (
                    <p className="text-xs text-red-500 truncate">{email.metadata.error}</p>
                  )}
                </div>
                <Badge variant={email.status === 'sent' ? 'default' : 'destructive'}>
                  {email.status}
                </Badge>
              </div>
            ))}
            {recentEmails.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No emails found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};