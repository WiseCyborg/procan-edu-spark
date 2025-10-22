import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Generating daily owner digest...');

    // Collect platform metrics (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Revenue metrics
    const { data: revenue } = await supabase
      .from('rvt_purchases')
      .select('amount_paid')
      .gte('created_at', yesterday)
      .eq('status', 'completed');
    
    const dailyRevenue = revenue?.reduce((sum, r) => sum + Number(r.amount_paid), 0) || 0;

    // User engagement
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    const { count: activeUsers } = await supabase
      .from('user_activity_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    const { data: completionData } = await supabase
      .from('user_progress')
      .select('is_completed')
      .gte('completed_at', yesterday);
    
    const completedModules = completionData?.filter(p => p.is_completed).length || 0;

    // Email health
    const { data: emailStats } = await supabase
      .from('email_logs')
      .select('status')
      .gte('created_at', yesterday);
    
    const emailSent = emailStats?.filter(e => e.status === 'sent').length || 0;
    const emailFailed = emailStats?.filter(e => e.status === 'failed').length || 0;
    const emailDeliveryRate = emailSent > 0 ? ((emailSent / (emailSent + emailFailed)) * 100).toFixed(1) : '100.0';

    // Compliance alerts
    const { data: alerts } = await supabase
      .from('compliance_alerts')
      .select('severity, title')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(5);

    // Regulatory updates
    const { data: regUpdates } = await supabase
      .from('regulatory_updates')
      .select('section_number, ai_impact_analysis')
      .gte('detected_at', yesterday)
      .order('detected_at', { ascending: false });

    // Use AI to generate insights
    const prompt = `You are an AI business intelligence analyst for ProCann Education, a cannabis compliance training platform.

**Platform Metrics (Last 24 Hours):**
- Revenue: $${dailyRevenue.toFixed(2)}
- New Users: ${newUsers || 0}
- Active Users: ${activeUsers || 0}
- Modules Completed: ${completedModules}
- Email Delivery Rate: ${emailDeliveryRate}%
- Emails Failed: ${emailFailed}

**Compliance Alerts:** ${alerts?.length || 0} unresolved
${alerts?.map(a => `- [${a.severity.toUpperCase()}] ${a.title}`).join('\n')}

**Regulatory Updates:** ${regUpdates?.length || 0} changes detected
${regUpdates?.map(r => `- COMAR ${r.section_number}: ${r.ai_impact_analysis?.slice(0, 100)}...`).join('\n')}

Generate a concise daily digest with:
1. executive_summary (2-3 sentences about overall platform health)
2. highlights (array of 3-5 bullet points of notable events)
3. insights (array of 2-3 data-driven observations or trends)
4. recommended_actions (array of 3-5 actionable items for owners, prioritized)
5. risk_assessment (any compliance or operational risks to watch)

Return as JSON only.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence analyst specializing in edtech and compliance. Generate actionable insights from platform data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const digest = JSON.parse(aiResult.choices[0].message.content);

    // Calculate platform health score
    const healthScore = calculateHealthScore({
      revenue: dailyRevenue,
      activeUsers: activeUsers || 0,
      emailDeliveryRate: parseFloat(emailDeliveryRate),
      unresolvedAlerts: alerts?.length || 0,
      completedModules: completedModules
    });

    // Store platform health score
    await supabase.from('platform_health_scores').insert({
      score_date: new Date().toISOString().split('T')[0],
      overall_score: healthScore.overall,
      email_health_score: healthScore.email,
      compliance_score: healthScore.compliance,
      engagement_score: healthScore.engagement,
      revenue_health_score: healthScore.revenue,
      calculation_metadata: {
        metrics: { dailyRevenue, newUsers, activeUsers, completedModules, emailDeliveryRate },
        digest
      }
    });

    // Store AI insights
    for (const insight of digest.insights || []) {
      await supabase.from('ai_insights').insert({
        insight_type: 'trend',
        category: 'operational',
        title: insight.slice(0, 100),
        description: insight,
        confidence_score: 0.85,
        actionable: true
      });
    }

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Daily Digest Generator',
      agent_type: 'owner_intelligence',
      execution_status: 'success',
      items_processed: 1,
      actions_taken: ['health_score_calculated', 'insights_generated'],
      metadata: { health_score: healthScore, metrics_summary: { dailyRevenue, activeUsers } }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        digest,
        healthScore
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-daily-digest:', error);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Daily Digest Generator',
      agent_type: 'owner_intelligence',
      execution_status: 'failed',
      error_message: error.message
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function calculateHealthScore(metrics: any) {
  const revenueScore = Math.min(100, (metrics.revenue / 500) * 100);
  const emailScore = metrics.emailDeliveryRate;
  const complianceScore = Math.max(0, 100 - (metrics.unresolvedAlerts * 15));
  const engagementScore = Math.min(100, (metrics.activeUsers / 50) * 100);
  const securityScore = 95;
  
  const overall = (
    revenueScore * 0.25 +
    emailScore * 0.20 +
    complianceScore * 0.25 +
    engagementScore * 0.20 +
    securityScore * 0.10
  );
  
  return {
    overall: Math.round(overall * 100) / 100,
    revenue: Math.round(revenueScore * 100) / 100,
    email: Math.round(emailScore * 100) / 100,
    compliance: Math.round(complianceScore * 100) / 100,
    engagement: Math.round(engagementScore * 100) / 100,
    security: Math.round(securityScore * 100) / 100
  };
}
