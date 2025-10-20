import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Zap, Settings, AlertCircle } from 'lucide-react';

interface ProviderStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  lastCheck: string;
  responseTime: number;
}

export const EmailProviderSettings = () => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkProviderStatus();
  }, []);

  const checkProviderStatus = async () => {
    const { data } = await supabase
      .from('email_provider_health')
      .select('*')
      .order('last_check_at', { ascending: false });

    if (data) {
      const statusMap: { [key: string]: ProviderStatus } = {};
      
      data.forEach(p => {
        if (!statusMap[p.provider_name]) {
          statusMap[p.provider_name] = {
            name: p.provider_name,
            status: p.status as 'online' | 'degraded' | 'offline',
            lastCheck: p.last_check_at,
            responseTime: p.response_time_ms || 0,
          };
        }
      });

      setProviders(Object.values(statusMap));
    }
  };

  const testAllProviders = async () => {
    setTesting(true);
    
    try {
      toast({
        title: 'Testing Providers',
        description: 'Testing Resend and SMTP connections...',
      });

      const { data, error } = await supabase.functions.invoke('test-email-providers');

      if (error) throw error;

      toast({
        title: 'Test Complete',
        description: `Results: ${JSON.stringify(data, null, 2)}`,
      });

      await checkProviderStatus();
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Could not test email providers',
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
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'offline':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Provider Configuration</CardTitle>
          <CardDescription>
            Monitor and test email delivery providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testAllProviders} disabled={testing}>
              <Zap className="h-4 w-4 mr-2" />
              {testing ? 'Testing...' : 'Test All Providers'}
            </Button>

            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => (
                <Card key={provider.name}>
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
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        Response Time: <span className="font-semibold">{provider.responseTime}ms</span>
                      </p>
                      <p className="text-muted-foreground">
                        Last Check: <span className="font-semibold">
                          {new Date(provider.lastCheck).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {providers.length === 0 && (
                <Card className="col-span-2">
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      No provider data available. Click "Test All Providers" to check status.
                    </p>
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