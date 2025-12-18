import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailHealthMetrics {
  sent24h: number;
  delivered24h: number;
  failed24h: number;
  retried24h: number;
  avgSendTimeMs: number;
  failureRate: number;
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  lastSentAt: string | null;
}

interface DatabaseHealthMetrics {
  status: 'healthy' | 'degraded' | 'down';
  avgQueryTimeMs: number;
  writeFailures24h: number;
  lastCheckedAt: string;
}

interface EdgeFunctionMetrics {
  totalExecutions1h: number;
  failures1h: number;
  avgRuntimeMs: number;
  status: 'healthy' | 'degraded' | 'down';
  lastError: string | null;
}

interface PipelineHealthSummary {
  healthyPipelines: number;
  totalPipelines: number;
  issuesDetected: number;
  autoFixedToday: number;
  needsAttention: number;
  lastRunAt: string | null;
}

export interface SystemHealthData {
  email: EmailHealthMetrics;
  database: DatabaseHealthMetrics;
  edgeFunctions: EdgeFunctionMetrics;
  pipeline: PipelineHealthSummary;
  overallStatus: 'healthy' | 'degraded' | 'down';
  lastUpdated: string;
}

export const useRealSystemHealth = (autoRefresh = true, intervalMs = 30000) => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmailHealth = async (): Promise<EmailHealthMetrics> => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Get email counts by status
    const { data: emailLogs, error } = await supabase
      .from('email_logs')
      .select('status, provider, created_at, sent_at')
      .gte('created_at', twentyFourHoursAgo);

    if (error) {
      console.error('Error fetching email logs:', error);
      return {
        sent24h: 0,
        delivered24h: 0,
        failed24h: 0,
        retried24h: 0,
        avgSendTimeMs: 0,
        failureRate: 0,
        provider: 'Unknown',
        status: 'down',
        lastSentAt: null,
      };
    }

    const logs = emailLogs || [];
    const sent = logs.filter(l => ['sent', 'delivered', 'queued', 'sending'].includes(l.status || '')).length;
    const delivered = logs.filter(l => l.status === 'delivered').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const retried = logs.filter(l => l.status === 'retrying').length;
    
    // Calculate average send time from logs that have both created_at and sent_at
    const logsWithTiming = logs.filter(l => l.created_at && l.sent_at);
    const avgSendTimeMs = logsWithTiming.length > 0
      ? logsWithTiming.reduce((acc, l) => {
          const created = new Date(l.created_at).getTime();
          const sent = new Date(l.sent_at!).getTime();
          return acc + (sent - created);
        }, 0) / logsWithTiming.length
      : 0;

    const total = sent + failed;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;
    
    // Determine provider from most recent log
    const provider = logs.length > 0 ? (logs[0].provider || 'Resend') : 'Resend';
    
    // Get last sent timestamp
    const sentLogs = logs.filter(l => l.sent_at).sort((a, b) => 
      new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime()
    );
    const lastSentAt = sentLogs.length > 0 ? sentLogs[0].sent_at : null;

    // Determine status
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (failureRate >= 20 || failed >= 10) {
      status = 'down';
    } else if (failureRate >= 5 || failed >= 3) {
      status = 'degraded';
    }

    return {
      sent24h: sent,
      delivered24h: delivered,
      failed24h: failed,
      retried24h: retried,
      avgSendTimeMs: Math.round(avgSendTimeMs),
      failureRate: Math.round(failureRate * 10) / 10,
      provider,
      status,
      lastSentAt,
    };
  };

  const fetchDatabaseHealth = async (): Promise<DatabaseHealthMetrics> => {
    const startTime = performance.now();
    
    try {
      // Simple query to test database connectivity and measure latency
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      const queryTime = Math.round(performance.now() - startTime);
      
      if (error) {
        return {
          status: 'down',
          avgQueryTimeMs: 0,
          writeFailures24h: 0,
          lastCheckedAt: new Date().toISOString(),
        };
      }

      // Check for recent system integrity issues
      const { data: integrityIssues } = await supabase
        .from('system_integrity_checks')
        .select('id')
        .eq('status', 'detected')
        .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const writeFailures = integrityIssues?.length || 0;
      
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (queryTime > 1000 || writeFailures > 10) {
        status = 'degraded';
      }
      if (queryTime > 3000 || writeFailures > 50) {
        status = 'down';
      }

      return {
        status,
        avgQueryTimeMs: queryTime,
        writeFailures24h: writeFailures,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'down',
        avgQueryTimeMs: 0,
        writeFailures24h: 0,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  };

  const fetchEdgeFunctionHealth = async (): Promise<EdgeFunctionMetrics> => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: functionStatus, error } = await supabase
      .from('edge_function_status')
      .select('*')
      .order('last_check', { ascending: false });

    if (error) {
      return {
        totalExecutions1h: 0,
        failures1h: 0,
        avgRuntimeMs: 0,
        status: 'down',
        lastError: 'Unable to fetch status',
      };
    }

    const functions = functionStatus || [];
    const deployed = functions.filter(f => f.is_deployed);
    const failed = functions.filter(f => !f.is_deployed);
    
    const avgRuntime = deployed.length > 0
      ? deployed.reduce((acc, f) => acc + (f.response_time_ms || 0), 0) / deployed.length
      : 0;

    const lastError = failed.length > 0 ? failed[0].error_message : null;

    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (failed.length > 0) {
      status = failed.length > 3 ? 'down' : 'degraded';
    }

    return {
      totalExecutions1h: deployed.length,
      failures1h: failed.length,
      avgRuntimeMs: Math.round(avgRuntime),
      status,
      lastError,
    };
  };

  const fetchPipelineHealth = async (): Promise<PipelineHealthSummary> => {
    // Get latest snapshot
    const { data: snapshot } = await supabase
      .from('pipeline_health_snapshot')
      .select('*')
      .order('last_run_at', { ascending: false })
      .limit(1)
      .single();

    // Get today's events
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: events } = await supabase
      .from('pipeline_health_events')
      .select('*')
      .gte('created_at', todayStart.toISOString());

    const autoFixed = events?.filter(e => e.auto_fixed).length || 0;
    const needsAttention = events?.filter(e => !e.auto_fixed && e.severity !== 'info').length || 0;

    if (snapshot) {
      return {
        healthyPipelines: snapshot.healthy_orgs || 0,
        totalPipelines: 6, // app → org → seat → user → training → cert
        issuesDetected: (snapshot.issues_detected || 0) + (snapshot.seat_mismatches || 0),
        autoFixedToday: snapshot.auto_fixed_today || autoFixed,
        needsAttention: snapshot.needs_admin_attention || needsAttention,
        lastRunAt: snapshot.last_run_at,
      };
    }

    return {
      healthyPipelines: 0,
      totalPipelines: 6,
      issuesDetected: 0,
      autoFixedToday: autoFixed,
      needsAttention,
      lastRunAt: null,
    };
  };

  const fetchAllHealth = useCallback(async () => {
    setLoading(true);
    try {
      const [email, database, edgeFunctions, pipeline] = await Promise.all([
        fetchEmailHealth(),
        fetchDatabaseHealth(),
        fetchEdgeFunctionHealth(),
        fetchPipelineHealth(),
      ]);

      // Calculate overall status
      const statuses = [email.status, database.status, edgeFunctions.status];
      let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (statuses.includes('down')) {
        overallStatus = 'down';
      } else if (statuses.includes('degraded')) {
        overallStatus = 'degraded';
      }

      setHealth({
        email,
        database,
        edgeFunctions,
        pipeline,
        overallStatus,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error fetching system health:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllHealth();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAllHealth, intervalMs);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, intervalMs, fetchAllHealth]);

  return { health, loading, refresh: fetchAllHealth };
};
