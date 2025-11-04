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

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Starting curriculum optimization analysis...');

    // Fetch current course modules
    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select('*')
      .eq('is_active', true)
      .order('module_number');

    if (modulesError) throw modulesError;

    // Fetch recent competitor snapshots
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitor_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(5);

    if (competitorsError) throw competitorsError;

    // Fetch latest COMAR compliance tracking
    const { data: compliance, error: complianceError } = await supabase
      .from('rvt_compliance_tracking')
      .select('*')
      .eq('our_curriculum_aligned', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (complianceError) throw complianceError;

    // Fetch user difficulty data (modules with high failure rates)
    const { data: examAttempts, error: attemptsError } = await supabase
      .from('exam_attempts')
      .select('metadata, is_passed')
      .order('created_at', { ascending: false })
      .limit(100);

    if (attemptsError) throw attemptsError;

    // Analyze with AI
    const prompt = `You are a cannabis education curriculum expert. Analyze the following data and provide 3-5 specific, actionable recommendations to improve ProCann EDU's RVT training curriculum.

CURRENT CURRICULUM (${modules?.length || 0} modules):
${modules?.map(m => `Module ${m.module_number}: ${m.title} (Tier: ${m.stoplight_tier})`).join('\n')}

COMPETITOR INTELLIGENCE:
${competitors?.map(c => `- ${c.competitor_name}: Features: ${c.features_detected?.join(', ') || 'Unknown'}`).join('\n')}

COMPLIANCE GAPS:
${compliance?.map(c => `- ${c.comar_section}: ${c.gap_identified}`).join('\n')}

COMAR 14.17.15.05(E)(2) REQUIRED TOPICS:
1. Federal and Maryland cannabis laws
2. Cannabis product knowledge and safety
3. Dispensing best practices
4. Patient/consumer safety and interaction
5. Recordkeeping and compliance requirements

Based on this data, provide recommendations in the following JSON format:
{
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "compliance|competitive|usability",
      "title": "Brief title (max 60 chars)",
      "description": "What to change (max 200 chars)",
      "rationale": "Why this matters (max 300 chars)",
      "estimated_effort": "Time estimate",
      "impact": "Expected outcome"
    }
  ]
}

Focus on:
1. COMPLIANCE: Gaps between COMAR requirements and our curriculum
2. COMPETITIVE: Features competitors have that we don't
3. USABILITY: User experience improvements based on completion data`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in cannabis compliance education and curriculum design. Provide practical, actionable recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const aiResult = await openaiResponse.json();
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    // Save recommendations to database
    let savedCount = 0;
    for (const rec of analysis.recommendations || []) {
      const { error: insertError } = await supabase
        .from('curriculum_recommendations')
        .insert({
          priority: rec.priority,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          rationale: rec.rationale,
          estimated_effort: rec.estimated_effort,
          impact: rec.impact,
          status: 'pending'
        });

      if (!insertError) {
        savedCount++;
      }
    }

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Curriculum Optimizer',
      agent_type: 'curriculum_analysis',
      execution_status: 'success',
      items_processed: modules?.length || 0,
      actions_taken: {
        recommendations_generated: analysis.recommendations?.length || 0,
        recommendations_saved: savedCount
      },
      metadata: {
        modules_analyzed: modules?.length || 0,
        competitors_reviewed: competitors?.length || 0,
        compliance_gaps: compliance?.length || 0
      }
    });

    console.log(`Curriculum optimization complete. Generated ${savedCount} recommendations.`);

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: analysis.recommendations,
        saved_count: savedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in curriculum optimizer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
