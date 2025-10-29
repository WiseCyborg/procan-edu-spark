import { useEffect, useState } from 'react';
import { useComprehensiveHealth } from '@/hooks/useComprehensiveHealth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Download, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function UnifiedHealthReport() {
  const { healthReport, loading, fetchHealthReport, isHealthy, isDegraded, isUnhealthy } = useComprehensiveHealth(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchHealthReport();
  }, [fetchHealthReport]);

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (health: number) => {
    if (health >= 90) return <Badge className="bg-green-600">Healthy</Badge>;
    if (health >= 70) return <Badge className="bg-yellow-600">Degraded</Badge>;
    return <Badge variant="destructive">Unhealthy</Badge>;
  };

  const getStatusIcon = (health: number) => {
    if (health >= 90) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (health >= 70) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-health-report');
      
      if (error) throw error;

      // Download CSV
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Exported",
        description: "Health report has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export health report",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading && !healthReport) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!healthReport) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No health data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Report</h1>
          <p className="text-muted-foreground">Comprehensive monitoring across all components</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchHealthReport} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Health Score</CardTitle>
          <CardDescription>Last checked: {new Date(healthReport.timestamp).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`text-6xl font-bold ${getHealthColor(healthReport.overall_health)}`}>
                {healthReport.overall_health}
              </div>
              <div>
                <div className="text-2xl font-semibold">Grade {healthReport.grade}</div>
                {getHealthBadge(healthReport.overall_health)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Response Time</div>
              <div className="text-2xl font-semibold">{healthReport.response_time_ms}ms</div>
            </div>
          </div>
          <Progress value={healthReport.overall_health} className="h-3" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{healthReport.summary.healthy_components} Healthy</span>
            <span>{healthReport.summary.degraded_components} Degraded</span>
            <span>{healthReport.summary.unhealthy_components} Unhealthy</span>
          </div>
        </CardContent>
      </Card>

      {/* Component Health Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(healthReport.components).map(([component, data]: [string, any]) => (
          <Card key={component}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium capitalize">{component}</CardTitle>
                {getStatusIcon(data.health)}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getHealthColor(data.health)}`}>
                {data.health}%
              </div>
              <Progress value={data.health} className="mt-2 h-2" />
              {data.latency_ms && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Latency: {data.latency_ms}ms
                </div>
              )}
              {data.success_rate && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Success Rate: {data.success_rate}%
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Identified Gaps */}
      {healthReport.gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Identified Issues ({healthReport.gaps.length})</CardTitle>
            <CardDescription>Components requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {healthReport.gaps.map((gap, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    gap.severity === 'high' ? 'text-red-600' :
                    gap.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold capitalize">{gap.component}</h4>
                      <Badge variant={gap.severity === 'high' ? 'destructive' : 'secondary'}>
                        {gap.severity} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Health: {gap.health}% - Status: {gap.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
