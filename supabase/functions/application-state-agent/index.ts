import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * APPLICATION STATE AGENT
 * 
 * Enforces organization state machine:
 * APPLIED → REVIEWING → APPROVED → CONFIGURED → ACTIVE
 * 
 * Detects and fixes:
 * - Organizations stuck in intermediate states
 * - Invalid state transitions
 * - Missing required data at each stage
 */

interface StateIssue {
  issue_type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  organization_id?: string;
  application_id?: string;
  current_state: string;
  expected_state?: string;
  auto_fixed: boolean;
  fix_action?: string;
  metadata?: Record<string, any>;
}

// State machine definition
const STATE_MACHINE = {
  APPLIED: { next: ['REVIEWING', 'APPROVED', 'REJECTED'], requires: ['contact_email', 'organization_name'] },
  REVIEWING: { next: ['APPROVED', 'REJECTED'], requires: ['reviewed_by'] },
  APPROVED: { next: ['CONFIGURED'], requires: ['organization_id', 'registration_token'] },
  CONFIGURED: { next: ['ACTIVE'], requires: ['manager_registered', 'join_code', 'seats_allocated'] },
  ACTIVE: { next: [], requires: ['active_employees'] },
  REJECTED: { next: [], requires: [] }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const issues: StateIssue[] = [];
  let autoFixedCount = 0;
  const correlationId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[ASA-${correlationId}] Application State Agent starting...`);

    // Log agent start event
    await supabase.from('agent_events').insert({
      event_type: 'dispatch',
      source_agent: 'pipeline_health',
      target_agent: 'application_state',
      correlation_id: correlationId,
      payload: { trigger: 'scheduled' },
      status: 'processing'
    });

    // ========== 1. CHECK PENDING APPLICATIONS (STUCK IN APPLIED) ==========
    console.log(`[ASA-${correlationId}] Checking stuck applications...`);
    
    const stuckThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const { data: stuckPending } = await supabase
      .from('dispensary_applications')
      .select('*')
      .eq('application_status', 'pending')
      .lt('created_at', stuckThreshold.toISOString());

    if (stuckPending && stuckPending.length > 0) {
      for (const app of stuckPending) {
        const daysPending = Math.floor((Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24));
        
        issues.push({
          issue_type: 'stuck_in_pending',
          severity: daysPending > 14 ? 'critical' : 'warning',
          description: `Application "${app.organization_name}" pending for ${daysPending} days`,
          application_id: app.id,
          current_state: 'APPLIED',
          expected_state: 'REVIEWING',
          auto_fixed: false,
          metadata: { 
            days_pending: daysPending, 
            contact_email: app.contact_email,
            submitted_at: app.created_at
          }
        });
      }
    }

    // ========== 2. CHECK APPROVED BUT NOT CONFIGURED ==========
    console.log(`[ASA-${correlationId}] Checking approved applications...`);
    
    const { data: approvedApps } = await supabase
      .from('dispensary_applications')
      .select('*, organizations!dispensary_applications_organization_id_fkey(*)')
      .eq('application_status', 'approved');

    if (approvedApps) {
      for (const app of approvedApps) {
        const org = app.organizations;
        
        // Check if org was created
        if (!app.organization_id || !org) {
          issues.push({
            issue_type: 'approved_no_org',
            severity: 'critical',
            description: `Approved application "${app.organization_name}" has no linked organization`,
            application_id: app.id,
            current_state: 'APPROVED',
            expected_state: 'CONFIGURED',
            auto_fixed: false,
            metadata: { contact_email: app.contact_email }
          });
          continue;
        }

        // Check registration token
        if (!app.registration_token) {
          // Auto-fix: Generate token
          const newToken = crypto.randomUUID().replace(/-/g, '');
          const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          
          await supabase
            .from('dispensary_applications')
            .update({
              registration_token: newToken,
              registration_token_expires_at: newExpiry
            })
            .eq('id', app.id);

          issues.push({
            issue_type: 'missing_registration_token',
            severity: 'warning',
            description: `Generated missing registration token for "${app.organization_name}"`,
            application_id: app.id,
            organization_id: app.organization_id,
            current_state: 'APPROVED',
            auto_fixed: true,
            fix_action: 'Generated registration token with 7-day expiry'
          });
          autoFixedCount++;
        }

        // Check if manager registered
        const { count: managerCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', app.organization_id);

        // Check join codes
        const { count: joinCodeCount } = await supabase
          .from('rvt_join_codes')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', app.organization_id)
          .eq('is_active', true);

        // Check seats
        const { count: seatCount } = await supabase
          .from('rvt_seats')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', app.organization_id);

        const hasManager = (managerCount || 0) > 0;
        const hasJoinCode = (joinCodeCount || 0) > 0;
        const hasSeats = (seatCount || 0) > 0;

        // Determine actual state
        let actualState = 'APPROVED';
        let nextRequirement = '';

        if (!hasManager) {
          nextRequirement = 'Manager must complete registration';
        } else if (!hasJoinCode) {
          nextRequirement = 'Join code must be generated';
        } else if (!hasSeats) {
          nextRequirement = 'Training seats must be allocated';
        } else {
          actualState = 'CONFIGURED';
          
          // Check if should advance to ACTIVE
          const { count: activeEmployees } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', app.organization_id)
            .not('user_id', 'is', null);

          if ((activeEmployees || 0) > 1) {
            actualState = 'ACTIVE';
            
            // Update org to active if not already
            if (!org.is_active) {
              await supabase
                .from('organizations')
                .update({ is_active: true, updated_at: new Date().toISOString() })
                .eq('id', app.organization_id);

              issues.push({
                issue_type: 'advanced_to_active',
                severity: 'info',
                description: `Organization "${org.name}" advanced to ACTIVE state`,
                organization_id: app.organization_id,
                current_state: 'CONFIGURED',
                expected_state: 'ACTIVE',
                auto_fixed: true,
                fix_action: 'Set organization is_active = true',
                metadata: { active_employees: activeEmployees }
              });
              autoFixedCount++;
            }
          }
        }

        if (actualState === 'APPROVED' && nextRequirement) {
          const daysSinceApproval = Math.floor(
            (Date.now() - new Date(app.reviewed_at || app.updated_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceApproval > 3) {
            issues.push({
              issue_type: 'stuck_after_approval',
              severity: daysSinceApproval > 7 ? 'critical' : 'warning',
              description: `"${org.name}" approved ${daysSinceApproval} days ago but not fully configured`,
              organization_id: app.organization_id,
              application_id: app.id,
              current_state: actualState,
              expected_state: 'CONFIGURED',
              auto_fixed: false,
              metadata: {
                days_since_approval: daysSinceApproval,
                has_manager: hasManager,
                has_join_code: hasJoinCode,
                has_seats: hasSeats,
                next_requirement: nextRequirement
              }
            });
          }
        }
      }
    }

    // ========== 3. CHECK ORGANIZATIONS WITHOUT APPLICATIONS ==========
    console.log(`[ASA-${correlationId}] Checking orphaned organizations...`);
    
    const { data: orphanedOrgs } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .eq('admin_approved', true)
      .is('payment_status', null);

    // Check if they have corresponding applications
    if (orphanedOrgs) {
      for (const org of orphanedOrgs) {
        const { count: appCount } = await supabase
          .from('dispensary_applications')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        if (appCount === 0) {
          issues.push({
            issue_type: 'orphaned_organization',
            severity: 'warning',
            description: `Organization "${org.name}" has no associated application`,
            organization_id: org.id,
            current_state: 'UNKNOWN',
            auto_fixed: false,
            metadata: { created_at: org.created_at }
          });
        }
      }
    }

    // ========== UPDATE AGENT CONFIG ==========
    const duration = Date.now() - startTime;
    
    await supabase
      .from('agent_configs')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_duration_ms: duration,
        last_run_status: issues.length > 0 ? 'issues_found' : 'healthy',
        run_count: supabase.rpc('increment_agent_run_count', { agent: 'application_state' }),
        success_count: supabase.rpc('increment_agent_success_count', { agent: 'application_state' }),
        updated_at: new Date().toISOString()
      })
      .eq('agent_type', 'application_state');

    // ========== LOG COMPLETION EVENT ==========
    await supabase.from('agent_events').insert({
      event_type: 'report',
      source_agent: 'application_state',
      target_agent: 'pipeline_health',
      correlation_id: correlationId,
      payload: {
        issues_detected: issues.length,
        auto_fixed: autoFixedCount,
        duration_ms: duration,
        issues: issues
      },
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    // Log issues to pipeline_health_events
    for (const issue of issues) {
      if (!issue.auto_fixed || issue.severity !== 'info') {
        await supabase.from('pipeline_health_events').insert({
          pipeline: 'application',
          severity: issue.severity,
          issue_type: issue.issue_type,
          description: issue.description,
          organization_id: issue.organization_id,
          auto_fixed: issue.auto_fixed,
          fix_action: issue.fix_action,
          requires_admin: issue.severity === 'critical' && !issue.auto_fixed,
          metadata: issue.metadata || {}
        });
      }
    }

    console.log(`[ASA-${correlationId}] Completed in ${duration}ms. Issues: ${issues.length}, Auto-fixed: ${autoFixedCount}`);

    return new Response(JSON.stringify({
      success: true,
      agent: 'application_state',
      correlation_id: correlationId,
      summary: {
        issues_detected: issues.length,
        auto_fixed: autoFixedCount,
        duration_ms: duration
      },
      issues
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[ASA-${correlationId}] Error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      agent: 'application_state',
      correlation_id: correlationId,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
