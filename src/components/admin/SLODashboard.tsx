import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const SLODashboard = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['slo-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slo_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Group by metric_name and take latest
      const latestMetrics = data.reduce((acc, metric) => {
        if (!acc[metric.metric_name]) {
          acc[metric.metric_name] = metric;
        }
        return acc;
      }, {} as Record<string, any>);
      
      return Object.values(latestMetrics);
    },
    refetchInterval: 60000
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Level Objectives (SLOs)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading metrics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Level Objectives (SLOs)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics?.map((metric) => (
            <div key={metric.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium capitalize text-sm">
                  {metric.metric_name.replace(/_/g, ' ')}
                </span>
                {getStatusIcon(metric.status)}
              </div>
              
              <div className="text-2xl font-bold mb-1">
                {parseFloat(metric.metric_value).toFixed(2)}
                {metric.unit === 'percentage' ? '%' : metric.unit === 'seconds' ? 's' : ''}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Target: {metric.target_value}{metric.unit === 'percentage' ? '%' : metric.unit === 'seconds' ? 's' : ''}
                </span>
                <Badge className={getStatusColor(metric.status)}>
                  {metric.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
