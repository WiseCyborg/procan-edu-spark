import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Zap, Settings, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProviderStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline' | 'slow';
  lastCheck: string;
  lastSuccess: string | null;
  responseTime: number;
  errorMessage: string | null;
}

export const EmailProviderSettings = () => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkProviderStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkProviderStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkProviderStatus = async () => {
    try {
      const { data } = await supabase
        .from('email_provider_health')
        .select('*')
        .order('last_check_at', { ascending: false });

      if (data) {
        const statusMap: { [key: string]: ProviderStatus } = {};
        
        data.forEach(p => {
          if (!statusMap[p.provider_name]) {
            const metadata = p.metadata as any;
            statusMap[p.provider_name] = {
              name: p.provider_name,
              status: p.status as 'online' | 'degraded' | 'offline' | 'slow',
              lastCheck: p.last_check_at,
              lastSuccess: p.last_success_at,
              responseTime: p.response_time_ms || 0,
              errorMessage: metadata?.error || null,
            };
          }
        });

        setProviders(Object.values(statusMap));
      }
    } catch (error) {
      console.error('Failed to fetch provider status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testAllProviders = async () => {
    setTesting(true);
    
    try {
      toast({
        title: 'Testing Email Providers',
        description: 'Sending test emails via Resend and SMTP...',
      });

      const { data, error } = await supabase.functions.invoke('test-email-providers');

      if (error) throw error;

      setLastTestTime(new Date());

      const results = data?.results || {};
      const resendOk = results.resend?.status !== 'offline';
      const smtpOk = results.smtp?.status !== 'offline';

      toast({
        title: resendOk && smtpOk ? 'All Providers Online ✓' : 'Provider Issues Detected',
        description: `Resend: ${results.resend?.status || 'unknown'} (${results.resend?.responseTime || 0}ms) | SMTP: ${results.smtp?.status || 'unknown'} (${results.smtp?.responseTime || 0}ms)`,
        variant: resendOk && smtpOk ? 'default' : 'destructive',
      });

      await checkProviderStatus();
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message || 'Could not test email providers',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
      case 'slow':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Settings className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'default';
      case 'degraded':
      case 'slow':
        return 'secondary';
      case 'offline':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getHealthSummary = () => {
    if (providers.length === 0) return { status: 'unknown', message: 'No data' };
    
    const allOnline = providers.every(p => p.status === 'online');
    const anyOffline = providers.some(p => p.status === 'offline');
    
    if (allOnline) return { status: 'healthy', message: 'All providers operational' };
    if (anyOffline) return { status: 'critical', message: 'Provider failures detected' };
    return { status: 'degraded', message: 'Degraded performance' };
  };

  const health = getHealthSummary();

  return (
    <div className="space-y-6">
      {/* Health Summary Alert */}
      {providers.length > 0 && (
        <Alert variant={health.status === 'critical' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span><strong>Email System Status:</strong> {health.message}</span>
            {lastTestTime && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last tested: {lastTestTime.toLocaleTimeString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Email Provider Status</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={checkProviderStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={testAllProviders} disabled={testing} size="sm">
                <Zap className="h-4 w-4 mr-2" />
                {testing ? 'Testing...' : 'Test Providers'}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Live monitoring of Resend and SMTP email delivery services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">

            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => (
                <Card key={provider.name} className="relative">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {getStatusIcon(provider.status)}
                        {provider.name.toUpperCase()}
                      </span>
                      <Badge variant={getStatusColor(provider.status)}>
                        {provider.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Response Time:</span>
                        <span className={`font-semibold ${
                          provider.responseTime < 1000 ? 'text-green-600' : 
                          provider.responseTime < 3000 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {provider.responseTime}ms
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Last Check:</span>
                        <span className="font-semibold text-xs">
                          {new Date(provider.lastCheck).toLocaleString()}
                        </span>
                      </div>

                      {provider.lastSuccess && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Last Success:</span>
                          <span className="font-semibold text-xs text-green-600">
                            {new Date(provider.lastSuccess).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {provider.errorMessage && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription className="text-xs">
                            {provider.errorMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {providers.length === 0 && !loading && (
                <Card className="col-span-2">
                  <CardContent className="py-8">
                    <div className="text-center space-y-2">
                      <Settings className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No provider data available
                      </p>
                      <Button onClick={testAllProviders} variant="outline">
                        <Zap className="h-4 w-4 mr-2" />
                        Run Initial Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loading && (
                <Card className="col-span-2">
                  <CardContent className="py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <p className="text-muted-foreground">Loading provider status...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failover Configuration</CardTitle>
          <CardDescription>
            Automatic failover settings for email delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Primary Provider</p>
                <p className="text-sm text-muted-foreground">Resend API</p>
              </div>
              <Badge>Active</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Fallback Provider</p>
                <p className="text-sm text-muted-foreground">SMTP</p>
              </div>
              <Badge variant="outline">Standby</Badge>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <p className="font-medium">Retry Configuration</p>
              <p className="text-sm text-muted-foreground">Attempts: 3</p>
              <p className="text-sm text-muted-foreground">Delay: 5min, 30min, 2hr</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};