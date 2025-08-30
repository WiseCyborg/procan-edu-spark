import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Server, 
  Zap, 
  Globe, 
  HardDrive,
  Cpu,
  MemoryStick,
  Activity
} from 'lucide-react';
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';
import { useState, useEffect } from 'react';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'error';
  icon: React.ReactNode;
}

export const RealTimeSystemHealth = () => {
  const { metrics } = useRealTimeAnalytics();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const updateMetrics = () => {
      // Mock system metrics - in real implementation, these would come from monitoring APIs
      const mockMetrics: SystemMetric[] = [
        {
          name: 'CPU Usage',
          value: Math.random() * 30 + 20, // 20-50%
          unit: '%',
          status: 'healthy',
          icon: <Cpu className="h-4 w-4" />
        },
        {
          name: 'Memory Usage',
          value: Math.random() * 40 + 30, // 30-70%
          unit: '%',
          status: 'healthy',
          icon: <MemoryStick className="h-4 w-4" />
        },
        {
          name: 'Disk Usage',
          value: Math.random() * 20 + 40, // 40-60%
          unit: '%',
          status: 'healthy',
          icon: <HardDrive className="h-4 w-4" />
        },
        {
          name: 'API Response Time',
          value: Math.random() * 50 + 100, // 100-150ms
          unit: 'ms',
          status: 'healthy',
          icon: <Activity className="h-4 w-4" />
        }
      ];

      setSystemMetrics(mockMetrics);
      setLastUpdated(new Date());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getProgressColor = (value: number, unit: string) => {
    if (unit === '%') {
      if (value > 80) return 'bg-red-500';
      if (value > 60) return 'bg-yellow-500';
      return 'bg-green-500';
    }
    if (unit === 'ms') {
      if (value > 200) return 'bg-red-500';
      if (value > 150) return 'bg-yellow-500';
      return 'bg-green-500';
    }
    return 'bg-blue-500';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Service Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">Service Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-sm">Database</span>
            </div>
            {getStatusBadge(metrics.systemHealth.database)}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="text-sm">API Gateway</span>
            </div>
            {getStatusBadge(metrics.systemHealth.api)}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Edge Functions</span>
            </div>
            {getStatusBadge(metrics.systemHealth.functions)}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last Updated</span>
              <span>{lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemMetrics.map((metric) => (
            <div key={metric.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {metric.icon}
                  <span className="text-sm">{metric.name}</span>
                </div>
                <span className="text-sm font-medium">
                  {metric.value.toFixed(1)}{metric.unit}
                </span>
              </div>
              <Progress 
                value={metric.unit === '%' ? metric.value : (metric.value / 300) * 100} 
                className="h-2"
              />
            </div>
          ))}
          
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-medium">99.98%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Response Time (Avg)</span>
              <span className="font-medium">
                {systemMetrics.find(m => m.name === 'API Response Time')?.value.toFixed(0) || 0}ms
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};