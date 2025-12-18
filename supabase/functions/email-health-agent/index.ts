import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Thresholds for circuit breaker
const THRESHOLDS = {
  failuresPerMinute: 5,
  bounceRatePercent: 10,
  complaintRatePercent: 0.1,
  timeoutRatePercent: 20,
  circuitOpenDurationMs: 5 * 60 * 1000, // 5 minutes
};

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'critical';
  metrics: {
    deliveryRate24h: number;
    bounceRate24h: number;
    complaintRate24h: number;
    failures1h: number;
    latencyAvgMs: number;
    queueDepth: number;
    emailsSent24h: number;
    emailsDelivered24h: number;
    emailsOpened24h: number;
    emailsClicked24h: number;
  };
  circuitState: 'closed' | 'open' | 'half_open';
  circuitReason: string | null;
  incidents: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
  actionsPerformed: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[EmailHealthAgent] Starting health check...');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Fetch email events from last 24 hours
    const { data: events24h, error: eventsError } = await supabase
      .from('email_events')
      .select('*')
      .gte('created_at', oneDayAgo.toISOString());

    if (eventsError) {
      console.error('[EmailHealthAgent] Error fetching events:', eventsError);
    }

    // Also check email_logs for backward compatibility
    const { data: logs24h } = await supabase
      .from('email_logs')
      .select('*')
      .gte('created_at', oneDayAgo.toISOString());

    // Combine data sources
    const allEmails = [...(events24h || []), ...(logs24h || [])];
    const emails1h = allEmails.filter(e => new Date(e.created_at) >= oneHourAgo);

    // Calculate metrics
    const total24h = allEmails.length;
    const sent24h = allEmails.filter(e => ['sent', 'delivered', 'opened', 'clicked'].includes(e.status)).length;
    const delivered24h = allEmails.filter(e => e.status === 'delivered').length;
    const opened24h = allEmails.filter(e => e.status === 'opened' || e.opened_at).length;
    const clicked24h = allEmails.filter(e => e.status === 'clicked' || e.clicked_at).length;
    const bounced24h = allEmails.filter(e => e.status === 'bounced').length;
    const failed24h = allEmails.filter(e => e.status === 'failed').length;
    const complained24h = allEmails.filter(e => e.status === 'complaint').length;
    const failures1h = emails1h.filter(e => e.status === 'failed').length;

    const deliveryRate = total24h > 0 ? (delivered24h / total24h) * 100 : 100;
    const bounceRate = total24h > 0 ? (bounced24h / total24h) * 100 : 0;
    const complaintRate = total24h > 0 ? (complained24h / total24h) * 100 : 0;

    // Get queue depth (pending emails)
    const { count: queueDepth } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Calculate average latency from emails with timing data
    const emailsWithTiming = allEmails.filter(e => e.created_at && e.sent_at);
    const avgLatency = emailsWithTiming.length > 0
      ? emailsWithTiming.reduce((acc, e) => {
          const created = new Date(e.created_at).getTime();
          const sent = new Date(e.sent_at).getTime();
          return acc + (sent - created);
        }, 0) / emailsWithTiming.length
      : 0;

    // Determine incidents and actions
    const incidents: HealthCheckResult['incidents'] = [];
    const actionsPerformed: string[] = [];
    let circuitState: 'closed' | 'open' | 'half_open' = 'closed';
    let circuitReason: string | null = null;

    // Check for failure spikes
    if (failures1h >= THRESHOLDS.failuresPerMinute * 60) {
      incidents.push({
        severity: 'critical',
        message: `High failure rate: ${failures1h} failures in the last hour`,
        timestamp: now.toISOString(),
      });
      circuitState = 'open';
      circuitReason = 'High failure rate detected';
    }

    // Check bounce rate
    if (bounceRate >= THRESHOLDS.bounceRatePercent) {
      incidents.push({
        severity: 'critical',
        message: `High bounce rate: ${bounceRate.toFixed(1)}%`,
        timestamp: now.toISOString(),
      });
      if (circuitState !== 'open') {
        circuitState = 'open';
        circuitReason = 'High bounce rate';
      }
    }

    // Check complaint rate
    if (complaintRate >= THRESHOLDS.complaintRatePercent) {
      incidents.push({
        severity: 'critical',
        message: `High complaint rate: ${complaintRate.toFixed(3)}%`,
        timestamp: now.toISOString(),
      });
      if (circuitState !== 'open') {
        circuitState = 'open';
        circuitReason = 'High complaint rate';
      }
    }

    // Check delivery rate
    if (deliveryRate < 90 && total24h > 10) {
      incidents.push({
        severity: 'warning',
        message: `Low delivery rate: ${deliveryRate.toFixed(1)}%`,
        timestamp: now.toISOString(),
      });
    }

    // Check queue depth
    if ((queueDepth || 0) > 100) {
      incidents.push({
        severity: 'warning',
        message: `High queue depth: ${queueDepth} pending emails`,
        timestamp: now.toISOString(),
      });
    }

    // Determine overall status
    let status: HealthCheckResult['status'] = 'healthy';
    if (incidents.some(i => i.severity === 'critical')) {
      status = 'critical';
    } else if (incidents.some(i => i.severity === 'warning')) {
      status = 'degraded';
    }

    // Auto-retry transient failures
    const { data: retriableEmails } = await supabase
      .from('email_events')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .gte('created_at', oneHourAgo.toISOString());

    if (retriableEmails && retriableEmails.length > 0) {
      actionsPerformed.push(`Identified ${retriableEmails.length} emails for retry`);
    }

    // Update email_health_snapshot
    const { error: snapshotError } = await supabase
      .from('email_health_snapshot')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001', // Single row
        created_at: now.toISOString(),
        delivery_rate_24h: deliveryRate,
        bounce_rate_24h: bounceRate,
        complaint_rate_24h: complaintRate,
        failures_1h: failures1h,
        latency_avg_ms: Math.round(avgLatency),
        queue_depth: queueDepth || 0,
        circuit_state: circuitState,
        circuit_reason: circuitReason,
        emails_sent_24h: sent24h,
        emails_delivered_24h: delivered24h,
        emails_opened_24h: opened24h,
        emails_clicked_24h: clicked24h,
      });

    if (snapshotError) {
      console.error('[EmailHealthAgent] Error updating snapshot:', snapshotError);
    }

    // Update circuit breaker table
    await supabase
      .from('email_circuit_breaker')
      .update({
        circuit_state: circuitState,
        failure_count: failures1h,
        updated_at: now.toISOString(),
        opened_at: circuitState === 'open' ? now.toISOString() : null,
      })
      .eq('id', (await supabase.from('email_circuit_breaker').select('id').limit(1).single()).data?.id);

    const result: HealthCheckResult = {
      status,
      metrics: {
        deliveryRate24h: Math.round(deliveryRate * 10) / 10,
        bounceRate24h: Math.round(bounceRate * 10) / 10,
        complaintRate24h: Math.round(complaintRate * 1000) / 1000,
        failures1h,
        latencyAvgMs: Math.round(avgLatency),
        queueDepth: queueDepth || 0,
        emailsSent24h: sent24h,
        emailsDelivered24h: delivered24h,
        emailsOpened24h: opened24h,
        emailsClicked24h: clicked24h,
      },
      circuitState,
      circuitReason,
      incidents,
      actionsPerformed,
    };

    console.log('[EmailHealthAgent] Health check complete:', result.status);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('[EmailHealthAgent] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
