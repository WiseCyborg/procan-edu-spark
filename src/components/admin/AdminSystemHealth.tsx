import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Database, Zap, Video } from 'lucide-react';
import { useEmailHealthMonitor } from '@/hooks/useEmailHealthMonitor';
import { ProductionDashboard } from '@/components/ProductionDashboard';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EdgeFunctionsStatus } from '@/components/admin/EdgeFunctionsStatus';
import { ImageAssetManager } from '@/components/admin/ImageAssetManager';
import { VideoAssetManager } from '@/components/admin/VideoAssetManager';

export const AdminSystemHealth = () => {
  const { circuitBreaker, loading } = useEmailHealthMonitor();

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
