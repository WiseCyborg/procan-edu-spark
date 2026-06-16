import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { filterOutTestOrgs } from "../_shared/test-org-filter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SEAT RECONCILIATION AGENT
 * 
 * Ensures seat allocation integrity:
 * - Purchased seats = allocated seats
 * - Seat status accuracy
 * - Join code validity
 * - Utilization tracking
 */

interface SeatIssue {
  issue_type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  organization_id: string;
  auto_fixed: boolean;
  fix_action?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const issues: SeatIssue[] = [];
  let autoFixedCount = 0;
  const correlationId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[SRA-${correlationId}] Seat Reconciliation Agent starting...`);

    // Log agent start
    await supabase.from('agent_events').insert({
      event_type: 'dispatch',
      source_agent: 'pipeline_health',
      target_agent: 'seat_reconciliation',
      correlation_id: correlationId,
      payload: { trigger: 'scheduled' },
      status: 'processing'
    });

    // Get config
    const { data: config } = await supabase
      .from('agent_configs')
      .select('thresholds')
      .eq('agent_type', 'seat_reconciliation')
      .single();

    const maxDeficit = config?.thresholds?.max_deficit || 50;
    const autoCreate = config?.thresholds?.auto_create !== false;

    // ========== 1. RECONCILE SEAT COUNTS ==========
    console.log(`[SRA-${correlationId}] Reconciling seat counts...`);
    
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, course_credits')
      .eq('admin_approved', true)
      .gt('course_credits', 0);

    if (orgs) {
      for (const org of orgs) {
        // Count actual seats
        const { count: actualSeats } = await supabase
          .from('rvt_seats')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        const expected = org.course_credits;
        const actual = actualSeats || 0;
        const deficit = expected - actual;

        if (deficit > 0) {
          if (autoCreate && deficit <= maxDeficit) {
            // Auto-fix: Create missing seats
            const { data: course } = await supabase
              .from('courses')
              .select('id')
              .eq('is_active', true)
              .limit(1)
              .single();

            if (course) {
              const seatsToCreate = Array.from({ length: deficit }, () => ({
                organization_id: org.id,
                course_id: course.id,
                status: 'available'
              }));

              await supabase.from('rvt_seats').insert(seatsToCreate);

              issues.push({
                issue_type: 'seat_deficit_fixed',
                severity: 'warning',
                description: `Created ${deficit} missing seats for "${org.name}"`,
                organization_id: org.id,
                auto_fixed: true,
                fix_action: `Created ${deficit} seats (expected: ${expected}, had: ${actual})`,
                metadata: { expected, actual, created: deficit }
              });
              autoFixedCount++;
            }
          } else {
            issues.push({
              issue_type: 'seat_deficit',
              severity: deficit > maxDeficit ? 'critical' : 'warning',
              description: `Organization "${org.name}" missing ${deficit} seats`,
              organization_id: org.id,
              auto_fixed: false,
              metadata: { expected, actual, deficit }
            });
          }
        } else if (deficit < 0) {
          // More seats than credits (overage)
          issues.push({
            issue_type: 'seat_overage',
            severity: 'info',
            description: `Organization "${org.name}" has ${Math.abs(deficit)} extra seats`,
            organization_id: org.id,
            auto_fixed: false,
            metadata: { expected, actual, overage: Math.abs(deficit) }
          });
        }
      }
    }

    // ========== 2. CHECK SEAT STATUS ACCURACY ==========
    console.log(`[SRA-${correlationId}] Checking seat status accuracy...`);
    
    // Find "assigned" seats with no user
    const { data: orphanedAssigned } = await supabase
      .from('rvt_seats')
      .select('id, organization_id, organizations!inner(name)')
      .eq('status', 'assigned')
      .is('assigned_user_id', null);

    if (orphanedAssigned && orphanedAssigned.length > 0) {
      // Auto-fix: Reset to available
      const seatIds = orphanedAssigned.map(s => s.id);
      
      await supabase
        .from('rvt_seats')
        .update({ status: 'available' })
        .in('id', seatIds);

      // Group by org for reporting
      const byOrg = orphanedAssigned.reduce((acc: any, seat: any) => {
        acc[seat.organization_id] = acc[seat.organization_id] || { count: 0, name: seat.organizations?.name };
        acc[seat.organization_id].count++;
        return acc;
      }, {});

      for (const [orgId, data] of Object.entries(byOrg)) {
        const { count, name } = data as any;
        issues.push({
          issue_type: 'orphaned_assigned_seats',
          severity: 'warning',
          description: `Reset ${count} orphaned "assigned" seats for "${name}"`,
          organization_id: orgId,
          auto_fixed: true,
          fix_action: `Reset ${count} seats from "assigned" to "available"`,
          metadata: { seats_reset: count }
        });
        autoFixedCount++;
      }
    }

    // ========== 3. CHECK JOIN CODE VALIDITY ==========
    console.log(`[SRA-${correlationId}] Checking join codes...`);
    
    const { data: orgsNeedingCodes } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('admin_approved', true)
      .eq('is_active', true);

    // B1: drop UAT/E2E synthetic orgs so phantom issues don't inflate dashboards.
    const realOrgsNeedingCodes = filterOutTestOrgs(orgsNeedingCodes);

    if (realOrgsNeedingCodes.length) {
      for (const org of realOrgsNeedingCodes) {
        const { data: joinCodes } = await supabase
          .from('rvt_join_codes')
          .select('id, code, is_active, expires_at')
          .eq('organization_id', org.id)
          .eq('is_active', true);

        if (!joinCodes || joinCodes.length === 0) {
          // Auto-fix: Generate join code (A2 — rvt_join_codes has no course_id column;
          // any reference would silently fail. Insert is now error-checked so we never
          // emit auto_fixed:true for a phantom write.)
          const code = `JOIN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

          const { data: inserted, error: insertErr } = await supabase
            .from('rvt_join_codes')
            .insert({
              organization_id: org.id,
              code: code,
              max_uses: 1000,
              current_uses: 0,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              is_active: true
            })
            .select('id')
            .single();

          if (insertErr || !inserted) {
            console.error(`[SRA-${correlationId}] Failed to insert join code for org ${org.id}:`, insertErr);
            issues.push({
              issue_type: 'missing_join_code',
              severity: 'critical',
              description: `Failed to auto-generate join code for "${org.name}": ${insertErr?.message ?? 'unknown error'}`,
              organization_id: org.id,
              auto_fixed: false,
              metadata: { error: insertErr?.message, code }
            });
          } else {
            issues.push({
              issue_type: 'missing_join_code',
              severity: 'warning',
              description: `Generated join code for "${org.name}"`,
              organization_id: org.id,
              auto_fixed: true,
              fix_action: `Created join code: ${code}`,
              metadata: { code, join_code_id: inserted.id }
            });
            autoFixedCount++;
          }
        } else {
          // Check for expired codes
          const validCodes = joinCodes.filter(jc => new Date(jc.expires_at) > new Date());
          
          if (validCodes.length === 0) {
            issues.push({
              issue_type: 'all_join_codes_expired',
              severity: 'warning',
              description: `All join codes expired for "${org.name}"`,
              organization_id: org.id,
              auto_fixed: false,
              metadata: { expired_codes: joinCodes.length }
            });
          }
        }
      }
    }

    // ========== 4. CALCULATE UTILIZATION METRICS ==========
    console.log(`[SRA-${correlationId}] Calculating utilization metrics...`);
    
    const { data: utilizationData } = await supabase
      .from('organizations')
      .select(`
        id, name,
        rvt_seats(status)
      `)
      .eq('admin_approved', true);

    if (utilizationData) {
      for (const org of utilizationData) {
        const seats = org.rvt_seats || [];
        const total = seats.length;
        
        if (total > 0) {
          const available = seats.filter((s: any) => s.status === 'available').length;
          const assigned = seats.filter((s: any) => s.status === 'assigned').length;
          const used = seats.filter((s: any) => s.status === 'used').length;
          const utilization = ((assigned + used) / total) * 100;

          // Low utilization warning
          if (utilization < 10 && total >= 10) {
            issues.push({
              issue_type: 'low_utilization',
              severity: 'info',
              description: `"${org.name}" has ${utilization.toFixed(1)}% seat utilization`,
              organization_id: org.id,
              auto_fixed: false,
              metadata: { total, available, assigned, used, utilization: utilization.toFixed(1) }
            });
          }
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
        updated_at: new Date().toISOString()
      })
      .eq('agent_type', 'seat_reconciliation');

    // ========== LOG COMPLETION ==========
    await supabase.from('agent_events').insert({
      event_type: 'report',
      source_agent: 'seat_reconciliation',
      target_agent: 'pipeline_health',
      correlation_id: correlationId,
      payload: {
        issues_detected: issues.length,
        auto_fixed: autoFixedCount,
        duration_ms: duration,
        issues
      },
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    // Log to pipeline_health_events
    for (const issue of issues) {
      await supabase.from('pipeline_health_events').insert({
        pipeline: 'seat',
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

    console.log(`[SRA-${correlationId}] Completed in ${duration}ms. Issues: ${issues.length}, Auto-fixed: ${autoFixedCount}`);

    return new Response(JSON.stringify({
      success: true,
      agent: 'seat_reconciliation',
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
    console.error(`[SRA-${correlationId}] Error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      agent: 'seat_reconciliation',
      correlation_id: correlationId,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
