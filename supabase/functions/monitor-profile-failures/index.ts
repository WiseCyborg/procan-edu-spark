import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const agentName = 'Profile Failure Monitor';

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get failure stats for last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: failures, error: failuresError } = await supabase
      .from('user_operation_logs')
      .select('*')
      .eq('operation_type', 'profile_save')
      .eq('success', false)
      .gte('created_at', oneHourAgo);

    if (failuresError) throw failuresError;

    // Get total attempts
    const { count: totalAttempts, error: countError } = await supabase
      .from('user_operation_logs')
      .select('id', { count: 'exact', head: true })
      .eq('operation_type', 'profile_save')
      .gte('created_at', oneHourAgo);

    if (countError) throw countError;

    // Analyze failure patterns
    const errorCounts: Record<string, number> = {};
    const affectedUsers = new Set<string>();

    failures?.forEach((f: any) => {
      if (f.error_code) {
        errorCounts[f.error_code] = (errorCounts[f.error_code] || 0) + 1;
      }
      if (f.user_id) {
        affectedUsers.add(f.user_id);
      }
    });

    const failureCount = failures?.length || 0;
    const failureRate = totalAttempts ? (failureCount / totalAttempts) * 100 : 0;

    // Create alert if failure rate > 10%
    if (failureRate > 10) {
      await supabase.from('compliance_alerts').insert({
        alert_type: 'system_failure',
        severity: 'high',
        title: 'High Profile Save Failure Rate',
        description: `${failureRate.toFixed(1)}% of profile saves failed in the last hour (${failureCount}/${totalAttempts})`,
        metadata: {
          failure_rate: failureRate,
          error_breakdown: errorCounts,
          affected_users: affectedUsers.size,
          time_window: 'last_hour',
          top_error: Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        }
      });
    }

    // Log agent run
    const executionTime = Date.now() - startTime;
    await supabase.from('ai_agent_runs').insert({
      agent_name: agentName,
      agent_type: 'system_health',
      execution_status: 'success',
      execution_duration_ms: executionTime,
      items_processed: totalAttempts || 0,
      changes_detected: failureCount,
      metadata: {
        failure_rate: failureRate,
        error_breakdown: errorCounts,
        affected_users: affectedUsers.size
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        failure_rate: failureRate,
        total_failures: failureCount,
        total_attempts: totalAttempts,
        error_breakdown: errorCounts,
        affected_users: affectedUsers.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${agentName}] Error:`, error);
    
    const executionTime = Date.now() - startTime;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Log failed execution
    await supabase.from('ai_agent_runs').insert({
      agent_name: agentName,
      agent_type: 'system_health',
      execution_status: 'failed',
      execution_duration_ms: executionTime,
      error_message: error.message
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        agent: agentName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
