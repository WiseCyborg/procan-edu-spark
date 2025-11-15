import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Settings, 
  RefreshCw, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Users,
  Zap
} from 'lucide-react';
import { RealTimeMetricsGrid } from '@/components/realtime/RealTimeMetricsGrid';
import { RealTimeAlertsFeed } from '@/components/realtime/RealTimeAlertsFeed';
import { RealTimeUserActivity } from '@/components/realtime/RealTimeUserActivity';
import { RealTimeSystemHealth } from '@/components/realtime/RealTimeSystemHealth';
import { WhoIsHereWidget } from '@/components/realtime/WhoIsHereWidget';
import { AuthActivityFeed } from '@/components/realtime/AuthActivityFeed';
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';
import { EnhancedDraggableChat } from '@/components/chat/EnhancedDraggableChat';
import { ComprehensivePipelineHealth } from '@/components/admin/ComprehensivePipelineHealth';

export default function RealTimeOperationsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { metrics, alerts, refreshMetrics, loading } = useRealTimeAnalytics();

  const mockMessages = [
    {
      id: '1',
      content: 'Real-time operations dashboard is now live! Monitor all system activity here.',
      sender: 'System',
      timestamp: new Date(),
      type: 'system' as const,
      isUser: false
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Real-Time Operations Center</h1>
          <p className="text-muted-foreground">
            Live monitoring and analytics dashboard for all platform operations
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshMetrics}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Export Data
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Configure
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-lg font-semibold text-green-600">Operational</p>
              </div>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-lg font-semibold">{alerts.length}</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-lg font-semibold">{metrics.activeUsers}</p>
              </div>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <p className="text-lg font-semibold text-green-600">Optimal</p>
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <Activity className="h-4 w-4" />
            Pipeline Health
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Zap className="h-4 w-4" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <RealTimeMetricsGrid />
          <div className="grid gap-6 lg:grid-cols-2">
            <WhoIsHereWidget />
            <AuthActivityFeed />
          </div>
          <RealTimeAlertsFeed />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <ComprehensivePipelineHealth />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <RealTimeUserActivity />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <RealTimeSystemHealth />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <RealTimeAlertsFeed />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Advanced analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{metrics.courseProgress.completionsToday}</p>
                    <p className="text-xs text-muted-foreground">Completions Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">${metrics.payments.totalRevenue.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Revenue Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{metrics.certificates.generatedToday}</p>
                    <p className="text-xs text-muted-foreground">Certificates</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{metrics.organizations.active}</p>
                    <p className="text-xs text-muted-foreground">Active Orgs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <RealTimeUserActivity />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <RealTimeSystemHealth />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <RealTimeAlertsFeed />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Alert Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alert Thresholds</label>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>• High CPU: {'>'} 80%</div>
                    <div>• Memory: {'>'} 85%</div>
                    <div>• Response Time: {'>'} 200ms</div>
                    <div>• Error Rate: {'>'} 1%</div>
                  </div>
                </div>
                <Button size="sm" className="w-full">
                  Configure Alerts
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>Advanced analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Usage Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>Detailed reports available</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Draggable Chat Component */}
      <EnhancedDraggableChat messages={mockMessages} />
    </div>
  );
}