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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT and check admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (!roles?.some(r => r.role === 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Running pipeline health check...');

    // Run comprehensive health check
    const { data: healthData, error: healthError } = await supabase
      .rpc('run_pipeline_health_check');

    if (healthError) {
      console.error('Health check error:', healthError);
      throw healthError;
    }

    console.log('Health check result:', healthData);

    const status = healthData.status;
    const checks = healthData.checks;

    // Get detailed information about issues
    const issues = [];

    if (checks.stuck_applications > 0) {
      const { data: stuckApps } = await supabase
        .rpc('check_stuck_applications');
      
      issues.push({
        type: 'stuck_applications',
        count: checks.stuck_applications,
        details: stuckApps,
        severity: 'critical'
      });
    }

    if (checks.orphaned_organizations > 0) {
      const { data: orphanedApps } = await supabase
        .from('dispensary_applications')
        .select('id, organization_name, contact_email, reviewed_at')
        .eq('application_status', 'approved')
        .is('organization_id', null)
        .lt('reviewed_at', new Date(Date.now() - 3600000).toISOString());
      
      issues.push({
        type: 'orphaned_organizations',
        count: checks.orphaned_organizations,
        details: orphanedApps,
        severity: 'critical'
      });
    }

    if (checks.stuck_notifications > 10) {
      const { data: stuckNotifications } = await supabase
        .from('notification_queue')
        .select('id, notification_type, recipient_email, scheduled_for, retry_count')
        .eq('status', 'pending')
        .lt('scheduled_for', new Date(Date.now() - 3600000).toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(20);
      
      issues.push({
        type: 'stuck_notifications',
        count: checks.stuck_notifications,
        details: stuckNotifications,
        severity: 'degraded'
      });
    }

    if (checks.failed_emails > 5) {
      const { data: failedEmails } = await supabase
        .from('email_logs')
        .select('id, recipient_email, subject, error_message, created_at')
        .eq('status', 'failed')
        .gt('created_at', new Date(Date.now() - 3600000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      issues.push({
        type: 'failed_emails',
        count: checks.failed_emails,
        details: failedEmails,
        severity: 'degraded'
      });
    }

    // Send admin alerts if critical
    if (status === 'critical' || status === 'degraded') {
      // Get alert recipients from settings
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'pipeline_alert_recipients')
        .single();

      const recipients = settings?.setting_value as string[] || ['admin@procannedu.com'];
      
      // Queue alert for each recipient
      for (const email of recipients) {
        await supabase.from('notification_queue').insert({
          notification_type: 'admin_alert',
          recipient_email: email,
          subject: status === 'critical' 
            ? '🚨 CRITICAL: Pipeline Health Issues Detected'
            : '⚠️ WARNING: Pipeline Performance Degraded',
          priority: status === 'critical' ? 'urgent' : 'high',
          metadata: {
            status,
            checks,
            issues: issues.map(i => ({ type: i.type, count: i.count, severity: i.severity })),
            timestamp: new Date().toISOString()
          },
          scheduled_for: new Date().toISOString()
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        checks,
        issues,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Pipeline health check failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});