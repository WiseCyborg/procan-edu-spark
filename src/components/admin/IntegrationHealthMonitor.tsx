import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IntegrationHealth {
  integration_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_check: string;
  response_time_ms: number | null;
  success_rate: number | null;
  error_count: number;
}

export const IntegrationHealthMonitor = () => {
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchIntegrationHealth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_health')
        .select('*')
        .order('last_check', { ascending: false });

      if (error) throw error;
      setIntegrations((data || []) as IntegrationHealth[]);
    } catch (error) {
      toast({
        title: "Failed to fetch integration health",
        description: "Unable to retrieve integration status data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testPayPal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-paypal-connection');
      if (error) throw error;
      
      toast({
        title: data.success ? "PayPal Connected" : "PayPal Connection Failed",
        description: data.success ? `Latency: ${data.latencyMs}ms` : data.error,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Unable to test PayPal connection",
        variant: "destructive",
      });
    }
  };

  const testEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-email-providers');
      if (error) throw error;
      
      toast({
        title: "Email Provider Test Complete",
        description: `Resend: ${data.resend?.status}, SMTP: ${data.smtp?.status}`,
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Unable to test email providers",
        variant: "destructive",
      });
    }
  };

  const testSMTP = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-smtp-connection');
      if (error) throw error;
      
      toast({
        title: data.success ? "SMTP Connected" : "SMTP Connection Failed",
        description: data.success ? `Latency: ${data.latencyMs}ms` : data.error,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Unable to test SMTP connection",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchIntegrationHealth();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-600">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-600">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Integration Health
            </CardTitle>
            <CardDescription>Payment, email, and external service monitoring</CardDescription>
          </div>
          <Button onClick={fetchIntegrationHealth} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Integration Status List */}
        <div className="space-y-2">
          {integrations.map((integration) => (
            <div key={integration.integration_name} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium capitalize">{integration.integration_name}</div>
                <div className="text-xs text-muted-foreground">
                  Last checked: {new Date(integration.last_check).toLocaleString()}
                </div>
                {integration.success_rate && (
                  <div className="text-xs text-muted-foreground">
                    Success rate: {integration.success_rate}%
                  </div>
                )}
              </div>
              <div className="text-right space-y-1">
                {getStatusBadge(integration.status)}
                {integration.response_time_ms && (
                  <div className="text-xs text-muted-foreground">
                    {integration.response_time_ms}ms
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Test Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={testPayPal} size="sm" variant="outline">
            Test PayPal
          </Button>
          <Button onClick={testEmail} size="sm" variant="outline">
            Test Email
          </Button>
          <Button onClick={testSMTP} size="sm" variant="outline">
            Test SMTP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
