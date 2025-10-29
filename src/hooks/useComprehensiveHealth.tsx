import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthReport {
  timestamp: string;
  overall_health: number;
  grade: string;
  response_time_ms: number;
  components: Record<string, any>;
  gaps: Array<{
    component: string;
    health: number;
    status: string;
    severity: string;
  }>;
  summary: {
    healthy_components: number;
    degraded_components: number;
    unhealthy_components: number;
  };
}

export const useComprehensiveHealth = (autoRefresh = false, intervalMs = 60000) => {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHealthReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'comprehensive-health-check',
        { method: 'POST' }
      );

      if (error) throw error;

      setHealthReport(data);

      // Alert on critical issues
      if (data.overall_health < 70) {
        toast({
          title: "System Health Alert",
          description: `Overall health is ${data.overall_health}%. Please review critical issues.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to fetch health report:', error);
      toast({
        title: "Health Check Failed",
        description: "Unable to retrieve system health data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (autoRefresh) {
      fetchHealthReport();
      const interval = setInterval(fetchHealthReport, intervalMs);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, intervalMs, fetchHealthReport]);

  return {
    healthReport,
    loading,
    fetchHealthReport,
    isHealthy: healthReport ? healthReport.overall_health >= 90 : false,
    isDegraded: healthReport ? healthReport.overall_health >= 70 && healthReport.overall_health < 90 : false,
    isUnhealthy: healthReport ? healthReport.overall_health < 70 : false,
  };
};
