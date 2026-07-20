import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT =
  'You are an expert in Maryland cannabis regulations and compliance training. Analyze regulatory changes for their impact on training content. Return valid JSON only.';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = performance.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let section_number = '';
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const apiKeyPresent = !!anthropicApiKey;
  let topicCount = 0;
  let resolvedModuleCount = 0;

  const logRun = async (status: 'success' | 'error', errorMessage?: string) => {
    try {
      await supabase.from('cron_job_executions').insert({
        job_name: 'analyze-regulatory-impact',
        executed_at: new Date().toISOString(),
        status,
        execution_time_ms: Math.round(performance.now() - t0),
        error_message: JSON.stringify({
          section_number,
          api_key_present: apiKeyPresent,
          topic_count: topicCount,
          resolved_module_count: resolvedModuleCount,
          ...(errorMessage ? { error: errorMessage } : {}),
        }),
      });
    } catch (e) {
      console.error('[analyze-regulatory-impact] log insert failed:', e);
    }
  };

  try {
    const body = await req.json();
    section_number = body.section_number ?? '';
    const old_content = body.old_content ?? null;
    const new_content = body.new_content ?? '';

    if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    console.log(`Analyzing impact for COMAR ${section_number}`);

    const prompt = `A Maryland cannabis regulation (COMAR ${section_number}) has been updated.

${old_content ? `OLD VERSION:\n${old_content}\n\n` : ''}NEW VERSION:\n${new_content}

Analyze this change and provide:
1. **Summary**: Brief description of what changed (2-3 sentences)
2. **Impact**: Which training topics are affected? Choose from: Laws, SOPs, Inventory, Sales, Safety, Health, Records, Security, Compliance, Packaging, Labeling, Transport, Waste, Testing, Customer Education, Emergencies, Training, Ethics
3. **Urgency**: critical/high/medium/low
4. **Suggested Updates**: Specific recommendations for updating course content, FAQs, and quiz questions
5. **Compliance Risk**: Does this create immediate compliance risk for existing certificate holders?

Return as JSON with keys: summary, affected_topics (array), urgency, suggested_updates, compliance_risk
Return ONLY the JSON object with no preamble, no explanation and no markdown fences.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API failed: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const rawText: string = data?.content?.[0]?.text ?? '';
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();

    let analysis: any;
    try {
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[analyze-regulatory-impact] Failed to parse model output:', rawText);
      throw new Error(`Failed to parse Anthropic JSON response: ${(parseErr as Error).message}`);
    }

    console.log('AI Analysis:', analysis);

    const topics: string[] = Array.isArray(analysis.affected_topics) ? analysis.affected_topics : [];
    topicCount = topics.length;

    // Resolve topic strings to module UUIDs via title ILIKE match
    let resolvedModuleIds: string[] = [];
    if (topics.length > 0) {
      const { data: modules, error: modErr } = await supabase
        .from('course_modules')
        .select('id, title, module_number, comar_reference')
        .eq('is_active', true);

      if (modErr) {
        console.error('[analyze-regulatory-impact] course_modules query failed:', modErr);
      } else if (modules) {
        const ids = new Set<string>();
        for (const topic of topics) {
          const t = String(topic).toLowerCase();
          for (const m of modules) {
            if (m.title && String(m.title).toLowerCase().includes(t)) {
              ids.add(m.id);
            }
          }
        }
        resolvedModuleIds = [...ids];
      }
    }
    resolvedModuleCount = resolvedModuleIds.length;

    // Look up the id of the most recent row for that section
    const { data: latest, error: latestErr } = await supabase
      .from('regulatory_updates')
      .select('id')
      .eq('section_number', section_number)
      .order('detected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) {
      console.error('[analyze-regulatory-impact] failed to look up latest row:', latestErr);
    } else if (latest?.id) {
      const { error: updateError } = await supabase
        .from('regulatory_updates')
        .update({
          ai_impact_analysis: analysis.summary ?? null,
          affected_modules: resolvedModuleIds,
          ai_affected_topics: topics,
        })
        .eq('id', latest.id);
      if (updateError) {
        console.error('Failed to update regulatory_updates:', updateError);
      }
    }

    // Critical urgency alert (best-effort)
    if (analysis.urgency === 'critical') {
      try {
        await supabase.functions.invoke('send-outdated-content-alerts', {
          body: {
            urgent: true,
            section_number,
            summary: analysis.summary,
            compliance_risk: analysis.compliance_risk,
          },
        });
      } catch (alertError) {
        console.error('Failed to send critical alert:', alertError);
      }
    }

    await logRun('success');

    return new Response(
      JSON.stringify({ success: true, analysis, resolved_module_ids: resolvedModuleIds }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error in analyze-regulatory-impact:', msg);
    await logRun('error', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
