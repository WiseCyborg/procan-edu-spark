import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CERTIFICATE INTEGRITY AGENT
 * 
 * Ensures certificate data integrity:
 * - Passed exams have certificates
 * - Certificate numbers are unique
 * - Expiry dates are accurate
 * - Verification data is consistent
 */

interface CertIssue {
  issue_type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  organization_id?: string;
  user_id?: string;
  certificate_id?: string;
  auto_fixed: boolean;
  fix_action?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const issues: CertIssue[] = [];
  let autoFixedCount = 0;
  const correlationId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[CIA-${correlationId}] Certificate Integrity Agent starting...`);

    // Log agent start
    await supabase.from('agent_events').insert({
      event_type: 'dispatch',
      source_agent: 'pipeline_health',
      target_agent: 'certificate_integrity',
      correlation_id: correlationId,
      payload: { trigger: 'scheduled' },
      status: 'processing'
    });

    // Get config
    const { data: config } = await supabase
      .from('agent_configs')
      .select('thresholds')
      .eq('agent_type', 'certificate_integrity')
      .single();

    const expiryWarningDays = config?.thresholds?.expiry_warning_days || 30;
    const autoGenerate = config?.thresholds?.auto_generate !== false;

    // ========== 1. CHECK PASSED EXAMS WITHOUT CERTIFICATES ==========
    console.log(`[CIA-${correlationId}] Checking passed exams without certificates...`);
    
    const { data: passedExams } = await supabase
      .from('exam_attempts')
      .select(`
        id, user_id, course_id, completed_at, total_score,
        profiles!inner(first_name, last_name, organization_id, email_cache)
      `)
      .eq('is_passed', true)
      .not('completed_at', 'is', null);

    if (passedExams) {
      for (const exam of passedExams) {
        // Check if certificate exists
        const { count: certCount } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', exam.user_id)
          .eq('course_id', exam.course_id);

        if (certCount === 0) {
          const profile = exam.profiles as any;
          
          if (autoGenerate) {
            // Auto-fix: Generate certificate
            const certNumber = `RVT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
            const issueDate = new Date().toISOString();
            const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

            const { error: certError } = await supabase.from('certificates').insert({
              user_id: exam.user_id,
              course_id: exam.course_id,
              exam_attempt_id: exam.id,
              certificate_number: certNumber,
              issue_date: issueDate,
              expiry_date: expiryDate,
              is_revoked: false
            });

            if (!certError) {
              issues.push({
                issue_type: 'missing_certificate_generated',
                severity: 'warning',
                description: `Generated certificate for ${profile.first_name} ${profile.last_name}`,
                organization_id: profile.organization_id,
                user_id: exam.user_id,
                auto_fixed: true,
                fix_action: `Created certificate ${certNumber}`,
                metadata: {
                  certificate_number: certNumber,
                  exam_score: exam.total_score,
                  exam_date: exam.completed_at
                }
              });
              autoFixedCount++;
            }
          } else {
            issues.push({
              issue_type: 'missing_certificate',
              severity: 'critical',
              description: `${profile.first_name} ${profile.last_name} passed exam but has no certificate`,
              organization_id: profile.organization_id,
              user_id: exam.user_id,
              auto_fixed: false,
              metadata: {
                exam_id: exam.id,
                exam_score: exam.total_score,
                exam_date: exam.completed_at,
                email: profile.email_cache
              }
            });
          }
        }
      }
    }

    // ========== 2. CHECK EXPIRING CERTIFICATES ==========
    console.log(`[CIA-${correlationId}] Checking expiring certificates...`);
    
    const warningDate = new Date(Date.now() + expiryWarningDays * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiringCerts } = await supabase
      .from('certificates')
      .select(`
        id, certificate_number, user_id, expiry_date,
        profiles!inner(first_name, last_name, organization_id, email_cache)
      `)
      .eq('is_revoked', false)
      .lt('expiry_date', warningDate)
      .gt('expiry_date', new Date().toISOString());

    if (expiringCerts) {
      for (const cert of expiringCerts) {
        const profile = cert.profiles as any;
        const daysUntilExpiry = Math.ceil(
          (new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        issues.push({
          issue_type: 'certificate_expiring',
          severity: daysUntilExpiry <= 7 ? 'warning' : 'info',
          description: `Certificate for ${profile.first_name} ${profile.last_name} expires in ${daysUntilExpiry} days`,
          organization_id: profile.organization_id,
          user_id: cert.user_id,
          certificate_id: cert.id,
          auto_fixed: false,
          metadata: {
            certificate_number: cert.certificate_number,
            expiry_date: cert.expiry_date,
            days_until_expiry: daysUntilExpiry,
            email: profile.email_cache
          }
        });
      }
    }

    // ========== 3. CHECK EXPIRED CERTIFICATES ==========
    console.log(`[CIA-${correlationId}] Checking expired certificates...`);
    
    const { data: expiredCerts } = await supabase
      .from('certificates')
      .select(`
        id, certificate_number, user_id, expiry_date,
        profiles!inner(first_name, last_name, organization_id)
      `)
      .eq('is_revoked', false)
      .lt('expiry_date', new Date().toISOString());

    if (expiredCerts && expiredCerts.length > 0) {
      // Group by organization
      const byOrg = expiredCerts.reduce((acc: any, cert: any) => {
        const orgId = cert.profiles?.organization_id || 'unknown';
        acc[orgId] = acc[orgId] || [];
        acc[orgId].push(cert);
        return acc;
      }, {});

      for (const [orgId, certs] of Object.entries(byOrg)) {
        const certList = certs as any[];
        issues.push({
          issue_type: 'expired_certificates',
          severity: 'warning',
          description: `${certList.length} expired certificate(s) in organization`,
          organization_id: orgId === 'unknown' ? undefined : orgId,
          auto_fixed: false,
          metadata: {
            count: certList.length,
            certificates: certList.map(c => ({
              number: c.certificate_number,
              user: `${c.profiles?.first_name} ${c.profiles?.last_name}`,
              expired: c.expiry_date
            }))
          }
        });
      }
    }

    // ========== 4. CHECK DUPLICATE CERTIFICATE NUMBERS ==========
    console.log(`[CIA-${correlationId}] Checking for duplicate certificate numbers...`);
    
    const { data: allCerts } = await supabase
      .from('certificates')
      .select('id, certificate_number');

    if (allCerts) {
      const certMap = new Map<string, string[]>();
      
      for (const cert of allCerts) {
        const existing = certMap.get(cert.certificate_number) || [];
        existing.push(cert.id);
        certMap.set(cert.certificate_number, existing);
      }

      for (const [certNum, ids] of certMap) {
        if (ids.length > 1) {
          issues.push({
            issue_type: 'duplicate_certificate_number',
            severity: 'critical',
            description: `Certificate number "${certNum}" is duplicated`,
            auto_fixed: false,
            metadata: {
              certificate_number: certNum,
              duplicate_count: ids.length,
              certificate_ids: ids
            }
          });
        }
      }
    }

    // ========== 5. CHECK REVOKED CERTIFICATE VERIFICATION ==========
    console.log(`[CIA-${correlationId}] Checking revoked certificate verifications...`);
    
    const { data: revokedWithVerifications } = await supabase
      .from('certificates')
      .select(`
        id, certificate_number,
        certificate_verifications(id, verified_at)
      `)
      .eq('is_revoked', true);

    if (revokedWithVerifications) {
      for (const cert of revokedWithVerifications) {
        const recentVerifications = (cert.certificate_verifications || []).filter(
          (v: any) => new Date(v.verified_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );

        if (recentVerifications.length > 0) {
          issues.push({
            issue_type: 'revoked_cert_verified',
            severity: 'warning',
            description: `Revoked certificate ${cert.certificate_number} was verified ${recentVerifications.length} time(s) in last 30 days`,
            certificate_id: cert.id,
            auto_fixed: false,
            metadata: {
              certificate_number: cert.certificate_number,
              recent_verifications: recentVerifications.length
            }
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
        updated_at: new Date().toISOString()
      })
      .eq('agent_type', 'certificate_integrity');

    // ========== LOG COMPLETION ==========
    await supabase.from('agent_events').insert({
      event_type: 'report',
      source_agent: 'certificate_integrity',
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
        pipeline: 'certification',
        severity: issue.severity,
        issue_type: issue.issue_type,
        description: issue.description,
        organization_id: issue.organization_id,
        user_id: issue.user_id,
        auto_fixed: issue.auto_fixed,
        fix_action: issue.fix_action,
        requires_admin: issue.severity === 'critical' && !issue.auto_fixed,
        metadata: issue.metadata || {}
      });
    }

    console.log(`[CIA-${correlationId}] Completed in ${duration}ms. Issues: ${issues.length}, Auto-fixed: ${autoFixedCount}`);

    return new Response(JSON.stringify({
      success: true,
      agent: 'certificate_integrity',
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
    console.error(`[CIA-${correlationId}] Error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      agent: 'certificate_integrity',
      correlation_id: correlationId,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
