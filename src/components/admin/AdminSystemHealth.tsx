import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Database, Zap, Video, RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useEmailHealthMonitor } from '@/hooks/useEmailHealthMonitor';
import { ProductionDashboard } from '@/components/ProductionDashboard';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EdgeFunctionsStatus } from '@/components/admin/EdgeFunctionsStatus';
import { ImageAssetManager } from '@/components/admin/ImageAssetManager';
import { VideoAssetManager } from '@/components/admin/VideoAssetManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AdminSystemHealth = () => {
  const { circuitBreaker, loading } = useEmailHealthMonitor();
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [healthCheckResult, setHealthCheckResult] = useState<any>(null);

  const runComprehensiveHealthCheck = async () => {
    setIsRunningHealthCheck(true);
    setHealthCheckResult(null);
    
    try {
      console.log('[HealthCheck] Starting comprehensive health check...');
      const { data, error } = await supabase.functions.invoke('comprehensive-health-check', {
        method: 'POST'
      });

      if (error) {
        console.error('[HealthCheck] Error:', error);
        toast.error('Health check failed: ' + error.message);
        return;
      }

      console.log('[HealthCheck] Result:', data);
      setHealthCheckResult(data);
      
      if (data?.overall_health >= 90) {
        toast.success(`System healthy: ${data.overall_health}% (Grade: ${data.grade})`);
      } else if (data?.overall_health >= 70) {
        toast.warning(`System degraded: ${data.overall_health}% - Check issues below`);
      } else {
        toast.error(`System unhealthy: ${data?.overall_health || 0}% - Immediate attention needed`);
      }
    } catch (err) {
      console.error('[HealthCheck] Exception:', err);
      toast.error('Failed to run health check');
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  return (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="email">Email System</TabsTrigger>
        <TabsTrigger value="database">Database</TabsTrigger>
        <TabsTrigger value="functions">Edge Functions</TabsTrigger>
        <TabsTrigger value="media">Media Assets</TabsTrigger>
      </TabsList>

      <TabsContent value="email">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email System Health
            </CardTitle>
            <CardDescription>Monitor email delivery and circuit breaker status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading email health...</p>
            ) : circuitBreaker ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Circuit State:</span>
                  <Badge variant={circuitBreaker.circuit_state === 'closed' ? 'default' : 'destructive'}>
                    {circuitBreaker.circuit_state.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Failure Count:</span>
                  <span className="text-sm">{circuitBreaker.failure_count}</span>
                </div>
                {circuitBreaker.last_failure_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Failure:</span>
                    <span className="text-sm">{new Date(circuitBreaker.last_failure_at).toLocaleString()}</span>
                  </div>
                )}
                {circuitBreaker.circuit_state !== 'closed' && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Email circuit breaker is open - email delivery is currently blocked
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load email health status</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="database">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Health
            </CardTitle>
            <CardDescription>Monitor database performance and integrity</CardDescription>
          </CardHeader>
          <CardContent>
            <ProductionDashboard />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="functions">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Health Check</CardTitle>
                <CardDescription>Run comprehensive system health check</CardDescription>
              </div>
              <Button 
                onClick={runComprehensiveHealthCheck} 
                disabled={isRunningHealthCheck}
              >
                {isRunningHealthCheck ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Run Health Check</>
                )}
              </Button>
            </div>
          </CardHeader>
          {healthCheckResult && (
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant={healthCheckResult.overall_health >= 90 ? 'default' : healthCheckResult.overall_health >= 70 ? 'secondary' : 'destructive'}>
                  {healthCheckResult.grade} - {healthCheckResult.overall_health}%
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Response: {healthCheckResult.response_time_ms}ms
                </span>
                {healthCheckResult.gaps?.length > 0 && (
                  <span className="text-sm text-orange-600">
                    {healthCheckResult.gaps.length} issue(s) found
                  </span>
                )}
              </div>
            </CardContent>
          )}
        </Card>
        <EdgeFunctionsStatus />
      </TabsContent>

      <TabsContent value="media" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Media Management
            </CardTitle>
            <CardDescription>Manage video and image assets for training modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <VideoAssetManager />
            <ImageAssetManager />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
