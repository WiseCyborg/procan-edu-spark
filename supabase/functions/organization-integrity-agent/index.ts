import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ORGANIZATION INTEGRITY AGENT
 * 
 * Ensures organization data integrity:
 * - Manager registration status
 * - Registration token validity
 * - Join code availability
 * - Organization-profile links
 */

interface IntegrityIssue {
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
  const issues: IntegrityIssue[] = [];
  let autoFixedCount = 0;
  const correlationId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[OIA-${correlationId}] Organization Integrity Agent starting...`);

    // Log agent start
    await supabase.from('agent_events').insert({
      event_type: 'dispatch',
      source_agent: 'pipeline_health',
      target_agent: 'organization_integrity',
      correlation_id: correlationId,
      payload: { trigger: 'scheduled' },
      status: 'processing'
    });

    // Get thresholds from config
    const { data: config } = await supabase
      .from('agent_configs')
      .select('thresholds')
      .eq('agent_type', 'organization_integrity')
      .single();

    const tokenExpiryDays = config?.thresholds?.token_expiry_days || 7;
    const reminderDays = config?.thresholds?.reminder_days || 3;

    // ========== 1. CHECK UNREGISTERED MANAGERS ==========
    console.log(`[OIA-${correlationId}] Checking unregistered managers...`);
    
    const { data: orgs } = await supabase
      .from('organizations')
      .select(`
        id, name, contact_email,
        profiles!profiles_organization_id_fkey(user_id, first_name, last_name),
        dispensary_applications!dispensary_applications_organization_id_fkey(
          id, registration_token, registration_token_expires_at, contact_email, contact_person
        )
      `)
      .eq('admin_approved', true)
      .eq('is_active', true);

    if (orgs) {
      for (const org of orgs) {
        const profiles = org.profiles || [];
        const app = org.dispensary_applications?.[0];
        
        // Check if org has any registered users
        const hasRegisteredUser = profiles.some((p: any) => p.user_id);
        
        if (!hasRegisteredUser) {
          if (app && app.registration_token) {
            const tokenExpiry = new Date(app.registration_token_expires_at);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (tokenExpiry < now) {
              // Token expired - auto-fix by regenerating
              const newToken = crypto.randomUUID().replace(/-/g, '');
              const newExpiry = new Date(Date.now() + tokenExpiryDays * 24 * 60 * 60 * 1000).toISOString();
              
              await supabase
                .from('dispensary_applications')
                .update({
                  registration_token: newToken,
                  registration_token_expires_at: newExpiry
                })
                .eq('id', app.id);

              issues.push({
                issue_type: 'expired_registration_token',
                severity: 'warning',
                description: `Regenerated expired token for "${org.name}"`,
                organization_id: org.id,
                auto_fixed: true,
                fix_action: `Generated new token expiring ${newExpiry}`,
                metadata: { 
                  old_expiry: app.registration_token_expires_at,
                  new_expiry: newExpiry,
                  contact_email: app.contact_email
                }
              });
              autoFixedCount++;
            } else if (daysUntilExpiry <= reminderDays) {
              // Token expiring soon
              issues.push({
                issue_type: 'token_expiring_soon',
                severity: 'info',
                description: `Registration token for "${org.name}" expires in ${daysUntilExpiry} days`,
                organization_id: org.id,
                auto_fixed: false,
                metadata: {
                  days_until_expiry: daysUntilExpiry,
                  contact_email: app.contact_email,
                  contact_person: app.contact_person
                }
              });
            } else {
              // Token valid but manager hasn't registered
              issues.push({
                issue_type: 'unregistered_manager',
                severity: 'info',
                description: `Manager for "${org.name}" hasn't registered (token valid ${daysUntilExpiry} more days)`,
                organization_id: org.id,
                auto_fixed: false,
                metadata: {
                  days_until_expiry: daysUntilExpiry,
                  contact_email: app.contact_email
                }
              });
            }
          } else {
            // No registration token at all
            issues.push({
              issue_type: 'no_registration_token',
              severity: 'critical',
              description: `Organization "${org.name}" has no manager and no registration token`,
              organization_id: org.id,
              auto_fixed: false,
              metadata: { contact_email: org.contact_email }
            });
          }
        }
      }
    }

    // ========== 2. CHECK ORPHANED PROFILES ==========
    console.log(`[OIA-${correlationId}] Checking orphaned profiles...`);
    
    const { data: orphanedProfiles } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, organization_id')
      .is('organization_id', null)
      .not('user_id', 'is', null);

    if (orphanedProfiles && orphanedProfiles.length > 0) {
      issues.push({
        issue_type: 'orphaned_profiles',
        severity: 'warning',
        description: `Found ${orphanedProfiles.length} user profiles without organization`,
        organization_id: 'system',
        auto_fixed: false,
        metadata: {
          count: orphanedProfiles.length,
          sample: orphanedProfiles.slice(0, 5).map(p => ({
            user_id: p.user_id,
            name: `${p.first_name} ${p.last_name}`
          }))
        }
      });
    }

    // ========== 3. CHECK ORGANIZATION CONTACT INFO ==========
    console.log(`[OIA-${correlationId}] Checking organization contact info...`);
    
    const { data: orgsWithoutContact } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('admin_approved', true)
      .or('contact_email.is.null,contact_person.is.null');

    if (orgsWithoutContact && orgsWithoutContact.length > 0) {
      for (const org of orgsWithoutContact) {
        issues.push({
          issue_type: 'missing_contact_info',
          severity: 'warning',
          description: `Organization "${org.name}" missing contact information`,
          organization_id: org.id,
          auto_fixed: false
        });
      }
    }

    // ========== 4. CHECK DUPLICATE ORGANIZATIONS ==========
    console.log(`[OIA-${correlationId}] Checking for duplicate organizations...`);
    
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('id, name, license_number')
      .eq('admin_approved', true);

    if (allOrgs) {
      const licenseMap = new Map<string, any[]>();
      
      for (const org of allOrgs) {
        if (org.license_number) {
          const existing = licenseMap.get(org.license_number) || [];
          existing.push(org);
          licenseMap.set(org.license_number, existing);
        }
      }

      for (const [license, orgs] of licenseMap) {
        if (orgs.length > 1) {
          issues.push({
            issue_type: 'duplicate_license',
            severity: 'critical',
            description: `License "${license}" used by ${orgs.length} organizations`,
            organization_id: orgs[0].id,
            auto_fixed: false,
            metadata: {
              organizations: orgs.map(o => ({ id: o.id, name: o.name }))
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
      .eq('agent_type', 'organization_integrity');

    // ========== LOG COMPLETION ==========
    await supabase.from('agent_events').insert({
      event_type: 'report',
      source_agent: 'organization_integrity',
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

    // Log issues to pipeline_health_events
    for (const issue of issues) {
      await supabase.from('pipeline_health_events').insert({
        pipeline: 'organization',
        severity: issue.severity,
        issue_type: issue.issue_type,
        description: issue.description,
        organization_id: issue.organization_id === 'system' ? null : issue.organization_id,
        auto_fixed: issue.auto_fixed,
        fix_action: issue.fix_action,
        requires_admin: issue.severity === 'critical' && !issue.auto_fixed,
        metadata: issue.metadata || {}
      });
    }

    console.log(`[OIA-${correlationId}] Completed in ${duration}ms. Issues: ${issues.length}, Auto-fixed: ${autoFixedCount}`);

    return new Response(JSON.stringify({
      success: true,
      agent: 'organization_integrity',
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
    console.error(`[OIA-${correlationId}] Error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      agent: 'organization_integrity',
      correlation_id: correlationId,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
