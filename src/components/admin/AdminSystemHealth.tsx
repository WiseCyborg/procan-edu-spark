import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Database, Zap, Video, RefreshCw, Loader2, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EdgeFunctionsStatus } from '@/components/admin/EdgeFunctionsStatus';
import { ImageAssetManager } from '@/components/admin/ImageAssetManager';
import { VideoAssetManager } from '@/components/admin/VideoAssetManager';
import { RealSystemHealthPanel } from '@/components/admin/RealSystemHealthPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AdminSystemHealth = () => {
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
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview" className="flex items-center gap-1">
          <Activity className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="database">Database</TabsTrigger>
        <TabsTrigger value="functions">Functions</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <RealSystemHealthPanel />
      </TabsContent>

      <TabsContent value="email">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email System Details
            </CardTitle>
            <CardDescription>Detailed email delivery monitoring and diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            <RealSystemHealthPanel />
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
            <RealSystemHealthPanel />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="functions">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Comprehensive Health Check</CardTitle>
                <CardDescription>Run full system health analysis</CardDescription>
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
