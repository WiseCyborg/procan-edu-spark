import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error('Admin access required');
    }

    const { checkId } = await req.json();

    // Fetch the integrity check details
    const { data: check, error: checkError } = await supabase
      .from('system_integrity_checks')
      .select('*')
      .eq('id', checkId)
      .single();

    if (checkError || !check) {
      throw new Error('Integrity check not found');
    }

    console.log(`Analyzing issue: ${check.check_type} - ${check.issue_description}`);

    // Build context for AI analysis
    const analysisContext = `
System Integrity Issue Analysis Request

Issue Type: ${check.check_type}
Severity: ${check.severity}
Status: ${check.status}
Description: ${check.issue_description}
Suggested Fix: ${check.suggested_fix || 'None provided'}
Auto-Fixable: ${check.auto_fixable}
Technical Details: ${JSON.stringify(check.technical_details, null, 2)}

Please analyze this system integrity issue and provide:
1. ROOT CAUSE: What is the underlying cause of this issue?
2. AFFECTED SYSTEMS: What parts of the system are impacted? (edge functions, database tables, cron jobs, etc.)
3. FIX STEPS: Detailed step-by-step instructions to resolve this issue
4. RISK LEVEL: Assess the risk level (low/medium/high) of implementing the fix
5. ROLLBACK STRATEGY: How can we undo the fix if something goes wrong?
6. ESTIMATED TIME: How long will this fix take to execute?
7. VALIDATION: How do we verify the fix worked?

Format your response as JSON with these exact fields:
{
  "rootCause": "string",
  "affectedSystems": ["system1", "system2"],
  "fixSteps": [
    {"step": 1, "description": "...", "action": "...", "expectedResult": "..."}
  ],
  "riskLevel": "low|medium|high",
  "rollbackStrategy": "string",
  "estimatedDurationSeconds": number,
  "validationSteps": ["step1", "step2"]
}
`;

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a system reliability expert analyzing software integrity issues. Provide detailed, actionable remediation plans in JSON format.'
          },
          {
            role: 'user',
            content: analysisContext
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;

    // Parse AI response
    let analysisResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       analysisText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : analysisText;
      analysisResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      // Fallback to structured response
      analysisResult = {
        rootCause: analysisText.substring(0, 500),
        affectedSystems: ['Unknown - manual review needed'],
        fixSteps: [{ step: 1, description: 'Manual intervention required', action: 'Review AI analysis', expectedResult: 'Issue resolved' }],
        riskLevel: 'medium',
        rollbackStrategy: 'Manual rollback may be required',
        estimatedDurationSeconds: 300,
        validationSteps: ['Verify system health after fix']
      };
    }

    // Store the AI-generated fix plan
    const { data: fixPlan, error: planError } = await supabase
      .from('ai_fix_plans')
      .insert({
        check_id: checkId,
        analysis_model: 'google/gemini-2.5-flash',
        root_cause: analysisResult.rootCause,
        fix_steps: analysisResult.fixSteps,
        affected_systems: { systems: analysisResult.affectedSystems },
        risk_level: analysisResult.riskLevel.toLowerCase(),
        estimated_duration_seconds: analysisResult.estimatedDurationSeconds,
        rollback_strategy: analysisResult.rollbackStrategy,
      })
      .select()
      .single();

    if (planError) {
      console.error('Error storing fix plan:', planError);
      throw planError;
    }

    console.log('AI analysis complete, plan stored:', fixPlan.id);

    return new Response(
      JSON.stringify({
        success: true,
        fixPlan: {
          ...fixPlan,
          validationSteps: analysisResult.validationSteps
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-system-issue:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});