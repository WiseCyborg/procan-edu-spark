import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * PIPELINE HEALTH AGENT (META-COORDINATOR)
 * 
 * The orchestrator that coordinates all child agents:
 * - Application State Agent
 * - Organization Integrity Agent  
 * - Seat Reconciliation Agent
 * - Certificate Integrity Agent
 * - Communications Agent (email-health-agent)
 * 
 * Responsibilities:
 * - Dispatch to child agents
 * - Aggregate results
 * - Update health snapshot
 * - Manage escalations
 */

interface AgentResult {
  agent: string;
  success: boolean;
  issues_detected: number;
  auto_fixed: number;
  duration_ms: number;
  error?: string;
}

interface PipelineDimension {
  name: string;
  status: 'healthy' | 'degraded' | 'broken';
  issues_count: number;
  last_check: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  const agentResults: AgentResult[] = [];
  let totalIssues = 0;
  let totalAutoFixed = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[PHA-META-${correlationId}] Pipeline Health Agent (Meta) starting orchestration...`);

    // Log orchestration start
    await supabase.from('agent_events').insert({
      event_type: 'dispatch',
      source_agent: 'scheduler',
      target_agent: 'pipeline_health',
      correlation_id: correlationId,
      payload: { trigger: 'scheduled', mode: 'orchestration' },
      status: 'processing'
    });

    // Check which agents are enabled
    const { data: agentConfigs } = await supabase
      .from('agent_configs')
      .select('agent_type, is_enabled, schedule_cron')
      .eq('is_enabled', true);

    const enabledAgents = new Set(agentConfigs?.map(c => c.agent_type) || []);

    // ========== DISPATCH TO CHILD AGENTS ==========
    const childAgents = [
      { name: 'application-state-agent', type: 'application_state', pipeline: 'application' },
      { name: 'organization-integrity-agent', type: 'organization_integrity', pipeline: 'organization' },
      { name: 'seat-reconciliation-agent', type: 'seat_reconciliation', pipeline: 'seat' },
      { name: 'certificate-integrity-agent', type: 'certificate_integrity', pipeline: 'certification' },
      { name: 'email-health-agent', type: 'communications', pipeline: 'communications' },
    ];

    console.log(`[PHA-META-${correlationId}] Dispatching to ${childAgents.length} child agents...`);

    // Dispatch to each enabled agent
    for (const agent of childAgents) {
      if (!enabledAgents.has(agent.type) && agent.type !== 'communications') {
        console.log(`[PHA-META-${correlationId}] Skipping disabled agent: ${agent.name}`);
        continue;
      }

      try {
        console.log(`[PHA-META-${correlationId}] Invoking ${agent.name}...`);
        
        const agentStartTime = Date.now();
        
        // Call child agent
        const response = await fetch(`${supabaseUrl}/functions/v1/${agent.name}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ correlation_id: correlationId })
        });

        const result = await response.json();
        const agentDuration = Date.now() - agentStartTime;

        agentResults.push({
          agent: agent.name,
          success: result.success !== false,
          issues_detected: result.summary?.issues_detected || 0,
          auto_fixed: result.summary?.auto_fixed || 0,
          duration_ms: agentDuration,
          error: result.error
        });

        totalIssues += result.summary?.issues_detected || 0;
        totalAutoFixed += result.summary?.auto_fixed || 0;

        console.log(`[PHA-META-${correlationId}] ${agent.name} completed: ${result.summary?.issues_detected || 0} issues`);

      } catch (error) {
        console.error(`[PHA-META-${correlationId}] Error invoking ${agent.name}:`, error);
        
        agentResults.push({
          agent: agent.name,
          success: false,
          issues_detected: 0,
          auto_fixed: 0,
          duration_ms: 0,
          error: error.message
        });
      }
    }

    // ========== AGGREGATE HEALTH STATUS ==========
    console.log(`[PHA-META-${correlationId}] Aggregating health status...`);

    // Get recent events by pipeline
    const { data: recentEvents } = await supabase
      .from('pipeline_health_events')
      .select('pipeline, severity, auto_fixed, requires_admin')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const pipelineStats: Record<string, { critical: number, warning: number, info: number, auto_fixed: number }> = {};
    
    for (const event of recentEvents || []) {
      if (!pipelineStats[event.pipeline]) {
        pipelineStats[event.pipeline] = { critical: 0, warning: 0, info: 0, auto_fixed: 0 };
      }
      pipelineStats[event.pipeline][event.severity as keyof typeof pipelineStats[string]]++;
      if (event.auto_fixed) pipelineStats[event.pipeline].auto_fixed++;
    }

    // Calculate dimension statuses
    const dimensions: PipelineDimension[] = [
      'application', 'organization', 'seat', 'training', 'certification', 'communications'
    ].map(name => {
      const stats = pipelineStats[name] || { critical: 0, warning: 0, info: 0, auto_fixed: 0 };
      let status: 'healthy' | 'degraded' | 'broken' = 'healthy';
      
      if (stats.critical > 0) status = 'broken';
      else if (stats.warning > 2) status = 'degraded';
      
      return {
        name,
        status,
        issues_count: stats.critical + stats.warning + stats.info,
        last_check: new Date().toISOString()
      };
    });

    const healthyCount = dimensions.filter(d => d.status === 'healthy').length;
    const degradedCount = dimensions.filter(d => d.status === 'degraded').length;
    const brokenCount = dimensions.filter(d => d.status === 'broken').length;

    // ========== UPDATE SNAPSHOT ==========
    console.log(`[PHA-META-${correlationId}] Updating pipeline health snapshot...`);

    // Get current metrics
    const { count: totalOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('admin_approved', true);

    const { count: totalSeats } = await supabase
      .from('rvt_seats')
      .select('*', { count: 'exact', head: true });

    const { count: allocatedSeats } = await supabase
      .from('rvt_seats')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    const { count: totalCertified } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('is_revoked', false);

    const { count: totalInTraining } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('is_completed', false);

    const { count: unregisteredManagers } = await supabase
      .from('organizations')
      .select(`
        id,
        profiles!profiles_organization_id_fkey(user_id)
      `, { count: 'exact', head: true })
      .eq('admin_approved', true)
      .eq('is_active', true);

    const needsAdminCount = recentEvents?.filter(e => e.requires_admin && !e.auto_fixed).length || 0;
    const orgsWithIssues = new Set(
      (recentEvents || [])
        .filter(e => e.severity === 'critical' || e.severity === 'warning')
        .map(e => e.pipeline)
    ).size;

    const duration = Date.now() - startTime;

    // Update snapshot
    await supabase
      .from('pipeline_health_snapshot')
      .update({
        total_orgs: totalOrgs || 0,
        healthy_orgs: Math.max(0, (totalOrgs || 0) - orgsWithIssues),
        orgs_with_issues: orgsWithIssues,
        total_seats: totalSeats || 0,
        allocated_seats: allocatedSeats || 0,
        seat_mismatches: pipelineStats['seat']?.warning || 0,
        unregistered_managers: pipelineStats['organization']?.warning || 0,
        stalled_users: pipelineStats['training']?.warning || 0,
        total_in_training: totalInTraining || 0,
        total_certified: totalCertified || 0,
        pipelines_healthy: healthyCount,
        pipelines_total: dimensions.length,
        issues_detected: totalIssues,
        auto_fixed_today: totalAutoFixed,
        needs_admin_attention: needsAdminCount,
        last_run_at: new Date().toISOString(),
        last_run_duration_ms: duration,
        updated_at: new Date().toISOString()
      })
      .not('id', 'is', null);

    // Update agent config (read-modify-write; cron is non-overlapping)
    const { data: cfgRow } = await supabase
      .from('agent_configs')
      .select('run_count, success_count')
      .eq('agent_type', 'pipeline_health')
      .maybeSingle();

    await supabase
      .from('agent_configs')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_duration_ms: duration,
        last_run_status: brokenCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy',
        run_count: (cfgRow?.run_count ?? 0) + 1,
        success_count: (cfgRow?.success_count ?? 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('agent_type', 'pipeline_health');

    // ========== CHECK ESCALATIONS ==========
    if (brokenCount > 0 || needsAdminCount > 5) {
      console.log(`[PHA-META-${correlationId}] Creating escalation...`);
      
      await supabase.from('agent_escalations').insert({
        agent_type: 'pipeline_health',
        escalation_level: brokenCount > 2 ? 3 : brokenCount > 0 ? 2 : 1,
        issue_type: 'system_health_degraded',
        issue_description: `System health degraded: ${brokenCount} broken, ${degradedCount} degraded pipelines`,
        metadata: {
          dimensions,
          agent_results: agentResults,
          total_issues: totalIssues,
          needs_admin: needsAdminCount
        }
      });
    }

    // ========== LOG COMPLETION ==========
    await supabase.from('agent_events').insert({
      event_type: 'health_update',
      source_agent: 'pipeline_health',
      target_agent: 'ui',
      correlation_id: correlationId,
      payload: {
        dimensions,
        summary: {
          healthy: healthyCount,
          degraded: degradedCount,
          broken: brokenCount,
          total_issues: totalIssues,
          auto_fixed: totalAutoFixed,
          needs_admin: needsAdminCount
        },
        agent_results: agentResults,
        duration_ms: duration
      },
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    console.log(`[PHA-META-${correlationId}] Orchestration completed in ${duration}ms`);
    console.log(`[PHA-META-${correlationId}] Health: ${healthyCount} healthy, ${degradedCount} degraded, ${brokenCount} broken`);
    console.log(`[PHA-META-${correlationId}] Issues: ${totalIssues} detected, ${totalAutoFixed} auto-fixed`);

    return new Response(JSON.stringify({
      success: true,
      correlation_id: correlationId,
      summary: {
        pipelines: {
          healthy: healthyCount,
          degraded: degradedCount,
          broken: brokenCount,
          total: dimensions.length
        },
        issues: {
          detected: totalIssues,
          auto_fixed: totalAutoFixed,
          needs_admin: needsAdminCount
        },
        duration_ms: duration
      },
      dimensions,
      agent_results: agentResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[PHA-META-${correlationId}] Error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      correlation_id: correlationId,
      error: error.message,
      agent_results: agentResults
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
