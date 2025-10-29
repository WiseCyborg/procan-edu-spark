import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting at-risk student analysis...');

    // Get all organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('admin_approved', true);

    if (!orgs || orgs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, insights_created: 0, message: 'No organizations found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalInsights = 0;
    const insights: any[] = [];

    for (const org of orgs) {
      // Get employees for this org using RPC
      const { data: employees } = await supabase
        .rpc('get_organization_employees', { org_id: org.id });

      if (!employees || employees.length === 0) continue;

      // Analyze each employee
      for (const emp of employees) {
        const issues: string[] = [];
        let riskScore = 0;

        // Check progress
        if (emp.progress_percentage < 40) {
          issues.push(`Low progress: ${emp.progress_percentage}%`);
          riskScore += 30;
        }

        // Check last activity (if updated_at is old)
        const daysSinceActivity = Math.floor(
          (Date.now() - new Date(emp.last_activity).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActivity > 7) {
          issues.push(`Inactive for ${daysSinceActivity} days`);
          riskScore += 20;
        }

        // Check certificates
        if (emp.certificates_count === 0 && emp.progress_percentage > 80) {
          issues.push('No certificate despite high progress');
          riskScore += 15;
        }

        // Only create insights for at-risk students (score > 30)
        if (riskScore > 30) {
          insights.push({
            insight_type: 'at_risk_student',
            category: 'student_engagement',
            title: `${emp.first_name} ${emp.last_name} needs attention`,
            description: `Student is at risk with ${emp.progress_percentage}% progress. Issues: ${issues.join(', ')}`,
            confidence_score: riskScore,
            actionable: true,
            metadata: {
              user_id: emp.user_id,
              organization_id: org.id,
              organization_name: org.name,
              progress: emp.progress_percentage,
              days_inactive: daysSinceActivity,
              issues,
            },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
          totalInsights++;
        }
      }
    }

    // Insert insights in batch
    if (insights.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_insights')
        .insert(insights);

      if (insertError) {
        console.error('Error inserting insights:', insertError);
      }
    }

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'at-risk-analyzer',
      agent_type: 'student_engagement',
      execution_status: 'success',
      items_processed: orgs.length,
      changes_detected: totalInsights,
      actions_taken: { insights_created: totalInsights },
    });

    return new Response(
      JSON.stringify({
        success: true,
        organizations_analyzed: orgs.length,
        insights_created: totalInsights,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analysis error:', error);
    
    // Log failed run
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'at-risk-analyzer',
      agent_type: 'student_engagement',
      execution_status: 'failed',
      error_message: error.message,
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
