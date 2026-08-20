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

  // Transactional self-tests (Test Email / Test SMTP) are removed: API acceptance is not
  // delivery, so those buttons could only produce misleading "success" signals.
  const testPayPalEndpoint = () =>
    toast({
      title: "Endpoint check retired",
      description:
        "The PayPal endpoint reachability check is not instrumented in this build. Check Edge Function logs in Supabase instead.",
    });

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
              <div className="text-end space-y-1">
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

        {integrations.length === 0 && !loading && (
          <div className="p-3 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground">
            Degraded — integration telemetry not instrumented (zero observed checks). No integration
            can be reported as healthy from this panel.
          </div>
        )}

        {/* Non-transactional endpoint check only */}
        <div className="pt-4 border-t space-y-2">
          <Button onClick={testPayPalEndpoint} size="sm" variant="outline">
            PayPal endpoint check (non-transactional)
          </Button>
          <p className="text-xs text-muted-foreground">
            Endpoint reachability only — no payment is created and no email is sent. Transactional
            email/SMTP self-tests were removed: provider acceptance is not delivery.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
