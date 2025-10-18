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
    const { section_number, old_content, new_content } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log(`Analyzing impact for COMAR ${section_number}`);

    const prompt = `A Maryland cannabis regulation (COMAR ${section_number}) has been updated.

${old_content ? `OLD VERSION:\n${old_content}\n\n` : ''}NEW VERSION:\n${new_content}

Analyze this change and provide:
1. **Summary**: Brief description of what changed (2-3 sentences)
2. **Impact**: Which training topics are affected? Choose from: Laws, SOPs, Inventory, Sales, Safety, Health, Records, Security, Compliance, Packaging, Labeling, Transport, Waste, Testing, Customer Education, Emergencies, Training, Ethics
3. **Urgency**: critical/high/medium/low
4. **Suggested Updates**: Specific recommendations for updating course content, FAQs, and quiz questions
5. **Compliance Risk**: Does this create immediate compliance risk for existing certificate holders?

Return as JSON with keys: summary, affected_topics (array), urgency, suggested_updates, compliance_risk`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert in Maryland cannabis regulations and compliance training. Analyze regulatory changes for their impact on training content. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);
    
    console.log('AI Analysis:', analysis);

    // Update the regulatory_updates table with analysis
    const { error: updateError } = await supabase
      .from('regulatory_updates')
      .update({
        ai_impact_analysis: analysis.summary,
        affected_modules: analysis.affected_topics || []
      })
      .eq('section_number', section_number)
      .order('detected_at', { ascending: false })
      .limit(1);

    if (updateError) {
      console.error('Failed to update regulatory_updates:', updateError);
    }

    // Create review tasks for each affected module
    if (analysis.affected_topics && Array.isArray(analysis.affected_topics)) {
      for (const topic of analysis.affected_topics) {
        await supabase.from('content_review_queue').insert({
          content_type: 'course_module',
          location: `Module: ${topic}`,
          urgency: analysis.urgency || 'medium',
          ai_suggested_change: analysis.suggested_updates,
          status: 'pending'
        });
      }
    }

    // If critical, send immediate alert
    if (analysis.urgency === 'critical') {
      try {
        await supabase.functions.invoke('send-outdated-content-alerts', {
          body: {
            urgent: true,
            section_number,
            summary: analysis.summary,
            compliance_risk: analysis.compliance_risk
          }
        });
      } catch (alertError) {
        console.error('Failed to send critical alert:', alertError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-regulatory-impact:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
