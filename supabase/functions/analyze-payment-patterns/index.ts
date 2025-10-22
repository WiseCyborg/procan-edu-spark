import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: purchases } = await supabase
      .from('rvt_purchases')
      .select('*')
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: true });

    const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
    const avgPurchaseSize = purchases?.length ? totalRevenue / purchases.length : 0;
    const largestPurchase = Math.max(...(purchases?.map(p => Number(p.amount_paid)) || [0]));
    
    const orgRevenue = purchases?.reduce((acc, p) => {
      const orgId = p.organization_id;
      if (!acc[orgId]) acc[orgId] = { total: 0, purchases: 0 };
      acc[orgId].total += Number(p.amount_paid);
      acc[orgId].purchases += 1;
      return acc;
    }, {} as Record<string, any>);

    const prompt = `Analyze these payment patterns for a cannabis training platform:

**90-Day Revenue Summary:**
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Purchases: ${purchases?.length || 0}
- Average Purchase: $${avgPurchaseSize.toFixed(2)}
- Largest Purchase: $${largestPurchase.toFixed(2)}

**Organization Distribution:**
${Object.entries(orgRevenue || {}).slice(0, 10).map(([orgId, data]: [string, any]) => 
  `- Org ${orgId}: $${data.total.toFixed(2)} (${data.purchases} purchases)`
).join('\n')}

Generate JSON with:
1. revenue_trend: "growing", "stable", or "declining"
2. churn_risk_organizations: Array of org IDs showing concerning patterns
3. upsell_opportunities: Organizations likely to buy more seats
4. pricing_insights: Any recommendations about pricing strategy
5. forecast_next_30_days: Estimated revenue for next month

Return valid JSON only.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a revenue analytics expert. Analyze payment data and provide actionable business insights.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    await supabase.from('ai_insights').insert({
      insight_type: 'prediction',
      category: 'revenue',
      title: `Revenue Trend: ${analysis.revenue_trend}`,
      description: `Forecast: $${analysis.forecast_next_30_days} next 30 days. ${analysis.pricing_insights}`,
      confidence_score: 0.80,
      actionable: true,
      metadata: analysis
    });

    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Revenue Intelligence Bot',
      agent_type: 'revenue_intelligence',
      execution_status: 'success',
      items_processed: purchases?.length || 0,
      metadata: { total_revenue: totalRevenue, analysis }
    });

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-payment-patterns:', error);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Revenue Intelligence Bot',
      agent_type: 'revenue_intelligence',
      execution_status: 'failed',
      error_message: error.message
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
