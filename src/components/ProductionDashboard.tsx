import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { useCache } from '@/lib/cache';
import { monitoring } from '@/lib/monitoring';
import { 
  Activity, 
  Database, 
  Shield, 
  Zap, 
  RefreshCw, 
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export const ProductionDashboard: React.FC = () => {
  const { healthStatus, performHealthCheck, isHealthy, isDegraded } = useHealthCheck();
  const { stats } = useCache();

  const handleManualHealthCheck = async () => {
    monitoring.trackUserAction('Manual Health Check');
    await performHealthCheck();
  };

  const handleMemoryCheck = () => {
    const memoryData = monitoring.trackMemoryUsage();
    monitoring.trackUserAction('Memory Check', memoryData || {});
  };

  const getStatusIcon = (status: 'healthy' | 'unhealthy' | 'checking') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Production Dashboard</h2>
        <div className="flex items-center gap-2">
          <Badge 
            variant={isHealthy ? 'default' : isDegraded ? 'secondary' : 'destructive'}
            className="gap-1"
          >
            <div className={`h-2 w-2 rounded-full ${getStatusColor(healthStatus.overall)}`} />
            System {healthStatus.overall}
          </Badge>
          <Button
            onClick={handleManualHealthCheck}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            {getStatusIcon(healthStatus.database)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus.database === 'healthy' ? 'Online' : 'Issues'}
            </div>
            <p className="text-xs text-muted-foreground">
              Connection status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authentication</CardTitle>
            {getStatusIcon(healthStatus.auth)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus.auth === 'healthy' ? 'Active' : 'Down'}
            </div>
            <p className="text-xs text-muted-foreground">
              Auth service status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            {getStatusIcon(healthStatus.storage)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus.storage === 'healthy' ? 'Ready' : 'Error'}
            </div>
            <p className="text-xs text-muted-foreground">
              File storage status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(healthStatus.responseTime)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Last health check
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats().size}
            </div>
            <p className="text-xs text-muted-foreground">
              Cached items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Check</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs font-bold">
              {new Date(healthStatus.lastCheck).toLocaleTimeString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Health monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                onClick={handleMemoryCheck}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                Check Memory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Environment:</strong> {import.meta.env.MODE}
            </div>
            <div>
              <strong>Build:</strong> {import.meta.env.VITE_APP_VERSION || 'Development'}
            </div>
            <div>
              <strong>User Agent:</strong> {navigator.userAgent.split(' ')[0]}
            </div>
            <div>
              <strong>Timestamp:</strong> {new Date().toISOString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};