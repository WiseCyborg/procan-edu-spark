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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Starting AI content optimization analysis...');

    // Fetch exam analytics data
    const { data: topicAnalytics, error: topicError } = await supabase
      .from('exam_topic_analytics')
      .select('*')
      .order('pass_rate');

    if (topicError) throw topicError;

    const { data: strugglingData, error: strugglingError } = await supabase
      .from('exam_struggling_sections')
      .select('*')
      .limit(10);

    if (strugglingError) throw strugglingError;

    const { data: difficultyData, error: difficultyError } = await supabase
      .from('exam_difficulty_analysis')
      .select('*')
      .order('failure_rate', { ascending: false })
      .limit(10);

    if (difficultyError) throw difficultyError;

    // Fetch course modules
    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select('*')
      .eq('is_active', true)
      .order('module_number');

    if (modulesError) throw modulesError;

    // Build AI prompt
    const prompt = `You are an education content optimization expert specializing in cannabis compliance training.

Analyze the following exam performance data and provide 3-5 specific, actionable recommendations to improve course content:

STRUGGLING TOPICS (lowest pass rates):
${topicAnalytics?.slice(0, 5).map(t => 
  `- Section ${t.section_number}: ${t.section_title} (${t.comar_section})
   Pass Rate: ${t.pass_rate?.toFixed(1)}%
   Avg Score: ${t.average_score?.toFixed(1)}%
   Sample Size: ${t.total_attempts} attempts`
).join('\n')}

SECTIONS WHERE STUDENTS STRUGGLE MOST:
${strugglingData?.map(s => 
  `- ${s.section_title}: ${s.students_struggling}/${s.total_attempts} struggling (${s.struggle_rate?.toFixed(1)}%)
   Average struggling score: ${s.avg_struggling_score?.toFixed(1)}%`
).join('\n')}

DIFFICULTY PATTERNS:
${difficultyData?.map(d => 
  `- ${d.section_title} (${d.comar_section}): ${d.difficulty_level} difficulty
   Failure Rate: ${d.failure_rate?.toFixed(1)}%
   Performance: ${d.average_performance?.toFixed(1)}%`
).join('\n')}

CURRENT MODULES:
${modules?.map(m => 
  `Module ${m.module_number}: ${m.title} (${m.estimated_minutes}min, Tier: ${m.stoplight_tier})`
).join('\n')}

Based on this data, provide recommendations in JSON format:
{
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "exam_performance",
      "title": "Brief actionable title (max 60 chars)",
      "description": "What to change and why (max 200 chars)",
      "rationale": "Data-driven explanation (max 300 chars)",
      "estimated_effort": "Time estimate (e.g., '2-4 hours')",
      "impact": "Expected outcome (e.g., 'Improve pass rate by 15%')",
      "related_sections": [section_numbers],
      "specific_actions": ["Action 1", "Action 2", "Action 3"]
    }
  ]
}

Focus on:
1. Topics with pass rates below 70%
2. Sections where >30% of students struggle
3. Patterns across multiple failed attempts
4. Specific content gaps or confusing explanations
5. Need for more examples, visuals, or interactive elements`;

    console.log('Calling Lovable AI for content analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in education content optimization and curriculum design. Provide practical, data-driven recommendations based on student performance analytics.'
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    console.log(`Generated ${analysis.recommendations?.length || 0} recommendations`);

    // Save recommendations to database
    let savedCount = 0;
    const savedRecommendations = [];

    for (const rec of analysis.recommendations || []) {
      const { data: inserted, error: insertError } = await supabase
        .from('curriculum_recommendations')
        .insert({
          priority: rec.priority,
          category: 'exam_performance',
          title: rec.title,
          description: rec.description,
          rationale: rec.rationale,
          estimated_effort: rec.estimated_effort,
          impact: rec.impact,
          status: 'pending',
          related_sections: rec.related_sections || [],
          data_source: {
            specific_actions: rec.specific_actions || [],
            analytics_snapshot: {
              struggling_topics: strugglingData?.length || 0,
              avg_pass_rate: topicAnalytics?.reduce((sum, t) => sum + (t.pass_rate || 0), 0) / (topicAnalytics?.length || 1)
            }
          },
          created_by_agent: 'ai-content-optimizer'
        })
        .select()
        .single();

      if (!insertError && inserted) {
        savedCount++;
        savedRecommendations.push(inserted);
      } else {
        console.error('Error saving recommendation:', insertError);
      }
    }

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Content Optimizer',
      agent_type: 'content_optimization',
      execution_status: 'success',
      items_processed: topicAnalytics?.length || 0,
      actions_taken: {
        recommendations_generated: analysis.recommendations?.length || 0,
        recommendations_saved: savedCount,
        critical_issues: analysis.recommendations?.filter((r: any) => r.priority === 'critical').length || 0
      },
      metadata: {
        struggling_sections: strugglingData?.length || 0,
        topics_analyzed: topicAnalytics?.length || 0,
        modules_reviewed: modules?.length || 0
      }
    });

    console.log(`Content optimization complete. Saved ${savedCount} recommendations.`);

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: savedRecommendations,
        saved_count: savedCount,
        analytics_summary: {
          total_topics: topicAnalytics?.length || 0,
          struggling_sections: strugglingData?.length || 0,
          avg_pass_rate: topicAnalytics?.reduce((sum, t) => sum + (t.pass_rate || 0), 0) / (topicAnalytics?.length || 1)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI content optimizer:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
