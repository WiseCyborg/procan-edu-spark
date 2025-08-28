import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { monitoring } from '@/lib/monitoring';

interface HealthStatus {
  database: 'healthy' | 'unhealthy' | 'checking';
  auth: 'healthy' | 'unhealthy' | 'checking';
  storage: 'healthy' | 'unhealthy' | 'checking';
  overall: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime: number;
}

export const useHealthCheck = (intervalMs = 30000) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    database: 'checking',
    auth: 'checking',
    storage: 'checking',
    overall: 'healthy',
    lastCheck: new Date().toISOString(),
    responseTime: 0,
  });

  const performHealthCheck = async (): Promise<HealthStatus> => {
    const startTime = performance.now();
    let checks = {
      database: 'unhealthy' as 'healthy' | 'unhealthy',
      auth: 'unhealthy' as 'healthy' | 'unhealthy',
      storage: 'unhealthy' as 'healthy' | 'unhealthy',
    };

    try {
      // Database health check
      const { error: dbError } = await supabase
        .from('courses')
        .select('id')
        .limit(1);
      
      checks.database = dbError ? 'unhealthy' : 'healthy';
    } catch (error) {
      monitoring.logError('Database health check failed', error);
    }

    try {
      // Auth health check
      const { error: authError } = await supabase.auth.getSession();
      checks.auth = authError ? 'unhealthy' : 'healthy';
    } catch (error) {
      monitoring.logError('Auth health check failed', error);
    }

    try {
      // Storage health check (just check if we can access buckets)
      const { error: storageError } = await supabase.storage.listBuckets();
      checks.storage = storageError ? 'unhealthy' : 'healthy';
    } catch (error) {
      monitoring.logError('Storage health check failed', error);
    }

    const responseTime = performance.now() - startTime;
    const healthyCount = Object.values(checks).filter(status => status === 'healthy').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === 3) {
      overall = 'healthy';
    } else if (healthyCount >= 1) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    const status: HealthStatus = {
      ...checks,
      overall,
      lastCheck: new Date().toISOString(),
      responseTime,
    };

    // Log health status
    monitoring.logInfo('Health Check Complete', {
      ...status,
      responseTimeMs: responseTime,
    });

    return status;
  };

  useEffect(() => {
    let mounted = true;

    const runHealthCheck = async () => {
      if (!mounted) return;
      
      try {
        const status = await performHealthCheck();
        if (mounted) {
          setHealthStatus(status);
        }
      } catch (error) {
        monitoring.logError('Health check failed', error);
        if (mounted) {
          setHealthStatus(prev => ({
            ...prev,
            overall: 'unhealthy',
            lastCheck: new Date().toISOString(),
          }));
        }
      }
    };

    // Initial health check
    runHealthCheck();

    // Set up periodic health checks
    const interval = setInterval(runHealthCheck, intervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return {
    healthStatus,
    performHealthCheck,
    isHealthy: healthStatus.overall === 'healthy',
    isDegraded: healthStatus.overall === 'degraded',
  };
};