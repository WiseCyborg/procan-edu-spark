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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const startTime = Date.now();

  try {
    console.log('Starting form submission monitoring...');

    // Get form submission stats for last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Profile save operations
    const { data: profileOps, error: profileError } = await supabase
      .from('user_operation_logs')
      .select('*')
      .in('operation_type', ['profile_save', 'profile_onboarding'])
      .gte('created_at', oneDayAgo);

    if (profileError) throw profileError;

    // Dispensary application submissions
    const { data: appOps, error: appError } = await supabase
      .from('user_operation_logs')
      .select('*')
      .eq('operation_type', 'dispensary_application')
      .gte('created_at', oneDayAgo);

    if (appError) throw appError;

    // Analyze profile save failures
    const profileFailures = profileOps?.filter(op => !op.success) || [];
    const profileTotal = profileOps?.length || 0;
    const profileFailureRate = profileTotal > 0 ? (profileFailures.length / profileTotal) * 100 : 0;

    // Analyze application failures
    const appFailures = appOps?.filter(op => !op.success) || [];
    const appTotal = appOps?.length || 0;
    const appFailureRate = appTotal > 0 ? (appFailures.length / appTotal) * 100 : 0;

    // Group failures by error code
    const profileErrorBreakdown = profileFailures.reduce((acc: any, f) => {
      const code = f.error_code || 'unknown';
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});

    const appErrorBreakdown = appFailures.reduce((acc: any, f) => {
      const code = f.error_code || 'unknown';
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});

    // Identify most problematic fields (from error messages)
    const problematicFields = [...profileFailures, ...appFailures]
      .map(f => {
        const msg = f.error_message || '';
        // Extract field names from common error patterns
        const fieldMatch = msg.match(/field[:\s]+['"]?(\w+)['"]?/i) || 
                          msg.match(/column[:\s]+['"]?(\w+)['"]?/i);
        return fieldMatch ? fieldMatch[1] : null;
      })
      .filter(Boolean)
      .reduce((acc: any, field) => {
        acc[field!] = (acc[field!] || 0) + 1;
        return acc;
      }, {});

    // Generate insights
    const insights: any[] = [];

    // High failure rate alert
    if (profileFailureRate > 10) {
      insights.push({
        type: 'high_failure_rate',
        category: 'profile_save',
        title: 'High Profile Save Failure Rate',
        description: `${profileFailureRate.toFixed(1)}% of profile saves failed in the last 24 hours (${profileFailures.length}/${profileTotal})`,
        severity: profileFailureRate > 25 ? 'critical' : 'high',
        metadata: {
          failure_count: profileFailures.length,
          total_attempts: profileTotal,
          error_breakdown: profileErrorBreakdown
        }
      });

      // Create compliance alert if critical
      if (profileFailureRate > 25) {
        await supabase.from('compliance_alerts').insert({
          alert_type: 'system_failure',
          severity: 'critical',
          title: 'Critical: Profile Save Failure Rate',
          description: `${profileFailureRate.toFixed(1)}% of profile saves are failing. This is blocking user onboarding.`,
          metadata: {
            failure_rate: profileFailureRate,
            affected_operations: profileFailures.length,
            error_codes: Object.keys(profileErrorBreakdown),
            time_window: '24_hours'
          }
        });
      }
    }

    if (appFailureRate > 10) {
      insights.push({
        type: 'high_failure_rate',
        category: 'dispensary_application',
        title: 'Dispensary Application Failures',
        description: `${appFailureRate.toFixed(1)}% of dispensary applications failed (${appFailures.length}/${appTotal})`,
        severity: appFailureRate > 25 ? 'high' : 'medium',
        metadata: {
          failure_count: appFailures.length,
          total_attempts: appTotal,
          error_breakdown: appErrorBreakdown
        }
      });
    }

    // Problematic field insight
    const mostProblematicField = Object.entries(problematicFields)
      .sort(([, a]: any, [, b]: any) => b - a)[0];

    if (mostProblematicField && mostProblematicField[1] > 5) {
      insights.push({
        type: 'problematic_field',
        category: 'validation',
        title: `Field "${mostProblematicField[0]}" Causing Most Errors`,
        description: `The "${mostProblematicField[0]}" field has caused ${mostProblematicField[1]} validation errors in 24 hours`,
        severity: 'medium',
        metadata: {
          field_name: mostProblematicField[0],
          error_count: mostProblematicField[1],
          all_problematic_fields: problematicFields
        }
      });
    }

    // Store insights
    for (const insight of insights) {
      await supabase.from('ai_insights').insert({
        insight_type: insight.type,
        category: insight.category,
        title: insight.title,
        description: insight.description,
        confidence_score: 0.9,
        actionable: true,
        metadata: insight.metadata
      });
    }

    const executionTime = Date.now() - startTime;

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Form Submission Guardian',
      agent_type: 'form_health',
      execution_status: 'success',
      execution_duration_ms: executionTime,
      items_processed: profileTotal + appTotal,
      changes_detected: profileFailures.length + appFailures.length,
      metadata: {
        profile_stats: {
          total: profileTotal,
          failures: profileFailures.length,
          failure_rate: profileFailureRate
        },
        application_stats: {
          total: appTotal,
          failures: appFailures.length,
          failure_rate: appFailureRate
        },
        insights_generated: insights.length
      }
    });

    console.log(`Monitoring complete. Processed ${profileTotal + appTotal} operations, found ${insights.length} insights`);

    return new Response(
      JSON.stringify({
        success: true,
        profile_failure_rate: profileFailureRate,
        application_failure_rate: appFailureRate,
        insights_generated: insights.length,
        execution_time_ms: executionTime
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Form submission monitoring error:', error);

    // Log failed execution
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Form Submission Guardian',
      agent_type: 'form_health',
      execution_status: 'error',
      execution_duration_ms: Date.now() - startTime,
      error_message: error.message
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
