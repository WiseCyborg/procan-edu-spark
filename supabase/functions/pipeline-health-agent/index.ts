import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PipelineIssue {
  pipeline: string;
  severity: 'info' | 'warning' | 'critical';
  issue_type: string;
  description: string;
  organization_id?: string;
  user_id?: string;
  auto_fixed: boolean;
  fix_action?: string;
  requires_admin: boolean;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const issues: PipelineIssue[] = [];
  let autoFixedCount = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[PHA] Pipeline Health Agent starting...');

    // ========== 1. CHECK APPLICATIONS → ORGANIZATIONS ==========
    console.log('[PHA] Checking Applications → Organizations pipeline...');
    
    // Find approved applications without linked organizations
    const { data: orphanedApps } = await supabase
      .from('dispensary_applications')
      .select('id, organization_name, contact_email, contact_person')
      .eq('application_status', 'approved')
      .is('organization_id', null);

    if (orphanedApps && orphanedApps.length > 0) {
      for (const app of orphanedApps) {
        issues.push({
          pipeline: 'application',
          severity: 'critical',
          issue_type: 'approved_without_org',
          description: `Approved application "${app.organization_name}" has no linked organization`,
          metadata: { application_id: app.id, contact_email: app.contact_email },
          auto_fixed: false,
          requires_admin: true,
        });
      }
    }

    // ========== 2. CHECK ORGANIZATIONS → MANAGERS ==========
    console.log('[PHA] Checking Organizations → Managers pipeline...');
    
    const { data: orgsWithoutManagers } = await supabase
      .from('organizations')
      .select(`
        id, name,
        profiles!profiles_organization_id_fkey(user_id)
      `)
      .eq('admin_approved', true)
      .eq('is_active', true);

    if (orgsWithoutManagers) {
      for (const org of orgsWithoutManagers) {
        const hasManager = org.profiles && org.profiles.length > 0;
        if (!hasManager) {
          // Check if there's a pending registration token
          const { data: pendingApp } = await supabase
            .from('dispensary_applications')
            .select('id, registration_token, registration_token_expires_at, contact_email')
            .eq('organization_id', org.id)
            .not('registration_token', 'is', null)
            .single();

          if (pendingApp) {
            const isExpired = new Date(pendingApp.registration_token_expires_at) < new Date();
            if (isExpired) {
              // Auto-fix: Regenerate token
              const newToken = crypto.randomUUID().replace(/-/g, '');
              const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
              
              await supabase
                .from('dispensary_applications')
                .update({
                  registration_token: newToken,
                  registration_token_expires_at: newExpiry
                })
                .eq('id', pendingApp.id);

              issues.push({
                pipeline: 'organization',
                severity: 'warning',
                issue_type: 'expired_registration_token',
                description: `Organization "${org.name}" had expired manager registration token - regenerated`,
                organization_id: org.id,
                auto_fixed: true,
                fix_action: 'Regenerated registration token with 7-day expiry',
                requires_admin: false,
                metadata: { old_expiry: pendingApp.registration_token_expires_at, new_expiry: newExpiry }
              });
              autoFixedCount++;
            } else {
              issues.push({
                pipeline: 'organization',
                severity: 'info',
                issue_type: 'unregistered_manager',
                description: `Organization "${org.name}" manager hasn't registered yet (token valid until ${new Date(pendingApp.registration_token_expires_at).toLocaleDateString()})`,
                organization_id: org.id,
                auto_fixed: false,
                requires_admin: false,
                metadata: { contact_email: pendingApp.contact_email }
              });
            }
          } else {
            issues.push({
              pipeline: 'organization',
              severity: 'critical',
              issue_type: 'no_manager_no_token',
              description: `Organization "${org.name}" has no manager and no registration token`,
              organization_id: org.id,
              auto_fixed: false,
              requires_admin: true,
            });
          }
        }
      }
    }

    // ========== 3. CHECK ORGANIZATIONS → SEATS ==========
    console.log('[PHA] Checking Organizations → Seats pipeline...');
    
    const { data: orgSeats } = await supabase
      .from('organizations')
      .select('id, name, course_credits')
      .eq('admin_approved', true)
      .gt('course_credits', 0);

    if (orgSeats) {
      for (const org of orgSeats) {
        const { count: seatCount } = await supabase
          .from('rvt_seats')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        if ((seatCount || 0) < org.course_credits) {
          const deficit = org.course_credits - (seatCount || 0);
          
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
              status: 'available',
              seat_type: 'standard'
            }));

            await supabase.from('rvt_seats').insert(seatsToCreate);

            issues.push({
              pipeline: 'seat',
              severity: 'warning',
              issue_type: 'seat_deficit',
              description: `Organization "${org.name}" was missing ${deficit} seats - created`,
              organization_id: org.id,
              auto_fixed: true,
              fix_action: `Created ${deficit} training seats`,
              requires_admin: false,
              metadata: { expected: org.course_credits, actual: seatCount, created: deficit }
            });
            autoFixedCount++;
          }
        }
      }
    }

    // ========== 4. CHECK ORGANIZATIONS → JOIN CODES ==========
    console.log('[PHA] Checking Organizations → Join Codes pipeline...');
    
    const { data: orgsWithSeats } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('admin_approved', true)
      .eq('is_active', true);

    if (orgsWithSeats) {
      for (const org of orgsWithSeats) {
        const { data: joinCodes } = await supabase
          .from('rvt_join_codes')
          .select('id, code, is_active, expires_at')
          .eq('organization_id', org.id)
          .eq('is_active', true);

        if (!joinCodes || joinCodes.length === 0) {
          // Auto-fix: Generate join code
          const code = `JOIN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          
          const { data: course } = await supabase
            .from('courses')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();

          if (course) {
            await supabase.from('rvt_join_codes').insert({
              organization_id: org.id,
              code: code,
              course_id: course.id,
              max_uses: 1000,
              current_uses: 0,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              is_active: true
            });

            issues.push({
              pipeline: 'seat',
              severity: 'warning',
              issue_type: 'missing_join_code',
              description: `Organization "${org.name}" had no active join code - generated`,
              organization_id: org.id,
              auto_fixed: true,
              fix_action: `Generated join code: ${code}`,
              requires_admin: false,
              metadata: { new_code: code }
            });
            autoFixedCount++;
          }
        } else {
          // Check for expired codes
          const hasValidCode = joinCodes.some(jc => new Date(jc.expires_at) > new Date());
          if (!hasValidCode) {
            issues.push({
              pipeline: 'seat',
              severity: 'warning',
              issue_type: 'expired_join_codes',
              description: `Organization "${org.name}" has only expired join codes`,
              organization_id: org.id,
              auto_fixed: false,
              requires_admin: true,
            });
          }
        }
      }
    }

    // ========== 5. CHECK TRAINING PROGRESS (STALLED USERS) ==========
    console.log('[PHA] Checking Training → Progress pipeline...');
    
    const stalledThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days
    
    const { data: stalledUsers } = await supabase
      .from('user_progress')
      .select(`
        user_id,
        course_id,
        updated_at,
        profiles!inner(first_name, last_name, organization_id, organizations!inner(name))
      `)
      .eq('is_completed', false)
      .lt('updated_at', stalledThreshold.toISOString());

    if (stalledUsers && stalledUsers.length > 0) {
      // Group by user to avoid duplicate issues
      const uniqueUsers = new Map();
      for (const record of stalledUsers) {
        if (!uniqueUsers.has(record.user_id)) {
          uniqueUsers.set(record.user_id, record);
        }
      }

      for (const [userId, record] of uniqueUsers) {
        const profile = record.profiles as any;
        const daysSinceActivity = Math.floor((Date.now() - new Date(record.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        
        issues.push({
          pipeline: 'training',
          severity: daysSinceActivity > 30 ? 'warning' : 'info',
          issue_type: 'stalled_training',
          description: `${profile.first_name} ${profile.last_name} from "${profile.organizations?.name}" hasn't progressed in ${daysSinceActivity} days`,
          organization_id: profile.organization_id,
          user_id: userId,
          auto_fixed: false,
          requires_admin: false,
          metadata: { days_inactive: daysSinceActivity, last_activity: record.updated_at }
        });
      }
    }

    // ========== 6. CHECK CERTIFICATION PIPELINE ==========
    console.log('[PHA] Checking Certification pipeline...');
    
    // Find users who passed exam but have no certificate
    const { data: passedNoCert } = await supabase
      .from('exam_attempts')
      .select(`
        id, user_id, course_id, completed_at, total_score,
        profiles!inner(first_name, last_name, organization_id)
      `)
      .eq('is_passed', true)
      .is('completed_at', 'not.null');

    if (passedNoCert) {
      for (const attempt of passedNoCert) {
        const { count: certCount } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', attempt.user_id)
          .eq('course_id', attempt.course_id);

        if (certCount === 0) {
          const profile = attempt.profiles as any;
          issues.push({
            pipeline: 'certification',
            severity: 'critical',
            issue_type: 'passed_no_certificate',
            description: `${profile.first_name} ${profile.last_name} passed exam but has no certificate`,
            organization_id: profile.organization_id,
            user_id: attempt.user_id,
            auto_fixed: false,
            requires_admin: true,
            metadata: { exam_attempt_id: attempt.id, score: attempt.total_score }
          });
        }
      }
    }

    // ========== UPDATE SNAPSHOT ==========
    console.log('[PHA] Updating pipeline health snapshot...');
    
    // Calculate metrics
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
      .select('*', { count: 'exact', head: true });

    const { count: totalInTraining } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('is_completed', false);

    // Count issues by type
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const needsAdminCount = issues.filter(i => i.requires_admin && !i.auto_fixed).length;
    const orgsWithIssues = new Set(issues.filter(i => i.organization_id).map(i => i.organization_id)).size;

    // Calculate healthy pipelines (7 total)
    const pipelinesHealthy = 7 - (criticalCount > 0 ? 1 : 0) - (needsAdminCount > 0 ? 1 : 0);

    const duration = Date.now() - startTime;

    // Update snapshot
    await supabase
      .from('pipeline_health_snapshot')
      .update({
        total_orgs: totalOrgs || 0,
        healthy_orgs: (totalOrgs || 0) - orgsWithIssues,
        orgs_with_issues: orgsWithIssues,
        total_seats: totalSeats || 0,
        allocated_seats: allocatedSeats || 0,
        seat_mismatches: issues.filter(i => i.issue_type === 'seat_deficit').length,
        unregistered_managers: issues.filter(i => i.issue_type === 'unregistered_manager' || i.issue_type === 'no_manager_no_token').length,
        stalled_users: issues.filter(i => i.issue_type === 'stalled_training').length,
        total_in_training: totalInTraining || 0,
        total_certified: totalCertified || 0,
        pipelines_healthy: pipelinesHealthy,
        pipelines_total: 7,
        issues_detected: issues.length,
        auto_fixed_today: autoFixedCount,
        needs_admin_attention: needsAdminCount,
        last_run_at: new Date().toISOString(),
        last_run_duration_ms: duration,
        updated_at: new Date().toISOString()
      })
      .not('id', 'is', null);

    // ========== LOG EVENTS ==========
    if (issues.length > 0) {
      console.log(`[PHA] Logging ${issues.length} issues...`);
      
      // Only log new issues (check if similar issue exists in last 24 hours)
      for (const issue of issues) {
        const { count: recentCount } = await supabase
          .from('pipeline_health_events')
          .select('*', { count: 'exact', head: true })
          .eq('issue_type', issue.issue_type)
          .eq('organization_id', issue.organization_id || '')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (recentCount === 0 || issue.auto_fixed) {
          await supabase.from('pipeline_health_events').insert({
            pipeline: issue.pipeline,
            severity: issue.severity,
            issue_type: issue.issue_type,
            description: issue.description,
            organization_id: issue.organization_id,
            user_id: issue.user_id,
            auto_fixed: issue.auto_fixed,
            fix_action: issue.fix_action,
            requires_admin: issue.requires_admin,
            metadata: issue.metadata || {}
          });
        }
      }
    }

    console.log(`[PHA] Completed in ${duration}ms. Issues: ${issues.length}, Auto-fixed: ${autoFixedCount}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        issues_detected: issues.length,
        auto_fixed: autoFixedCount,
        needs_admin: needsAdminCount,
        pipelines_healthy: pipelinesHealthy,
        duration_ms: duration
      },
      issues: issues
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[PHA] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
