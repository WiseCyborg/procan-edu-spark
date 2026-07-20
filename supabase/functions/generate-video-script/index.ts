import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT =
  'You are a compliance training scriptwriter for Maryland cannabis Responsible Vendor Training. You write spoken narration scripts that stay strictly within the source material provided. You never introduce a rule, figure, deadline, citation, or regulatory fact that is not present in the supplied module content. You use plain spoken English suitable for narration.';

interface AssetResult {
  asset_id: string;
  module_number: number | null;
  status: 'succeeded' | 'skipped' | 'error';
  script_length?: number;
  script_words?: number;
  estimated_minutes?: number;
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = performance.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const apiKeyPresent = !!anthropicApiKey;

  const results: AssetResult[] = [];
  const skipReasons: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let skipped = 0;

  const logRun = async (status: 'success' | 'error', errorMessage?: string) => {
    try {
      await supabase.from('cron_job_executions').insert({
        job_name: 'generate-video-script',
        executed_at: new Date().toISOString(),
        status,
        execution_time_ms: Math.round(performance.now() - t0),
        error_message: JSON.stringify({
          assets_processed: processed,
          assets_succeeded: succeeded,
          assets_skipped: skipped,
          skip_reasons: skipReasons,
          api_key_present: apiKeyPresent,
          ...(errorMessage ? { error: errorMessage } : {}),
        }),
      });
    } catch (e) {
      console.error('[generate-video-script] log insert failed:', e);
    }
  };

  try {
    // ---- Authorisation ----
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user ?? null;

    if (user) {
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (rolesErr) throw new Error(`role lookup failed: ${rolesErr.message}`);
      const allowed = (roles ?? []).some(
        (r: { role: string }) => r.role === 'admin' || r.role === 'training_coordinator'
      );
      if (!allowed) {
        return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    // Service-role (no user attached to JWT) is allowed for future cron use.

    if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    // ---- Input ----
    let body: { asset_id?: string; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      // no body is fine
    }
    const rawLimit = typeof body.limit === 'number' ? body.limit : 3;
    const limit = Math.max(1, Math.min(10, rawLimit));

    // ---- Asset selection ----
    let assets: any[] = [];
    if (body.asset_id) {
      const { data, error } = await supabase
        .from('video_assets')
        .select('id, asset_key, module_id, course_id, title, regeneration_reason, needs_regeneration')
        .eq('id', body.asset_id)
        .limit(1);
      if (error) throw new Error(`asset lookup failed: ${error.message}`);
      assets = data ?? [];
    } else {
      const { data, error } = await supabase
        .from('video_assets')
        .select('id, asset_key, module_id, course_id, title, regeneration_reason, needs_regeneration')
        .eq('needs_regeneration', true);
      if (error) throw new Error(`asset lookup failed: ${error.message}`);
      assets = data ?? [];
    }

    // Sort: CONTENT CORRECTED first, then module_number (asc). module_number resolved after join,
    // so fetch modules up front for ordering.
    const moduleIds = [...new Set(assets.map((a) => a.module_id).filter(Boolean))] as string[];
    const moduleMap = new Map<string, any>();
    if (moduleIds.length > 0) {
      const { data: mods, error: modErr } = await supabase
        .from('course_modules')
        .select('id, module_number, title, content, comar_reference, comar_section_ref')
        .in('id', moduleIds);
      if (modErr) throw new Error(`module lookup failed: ${modErr.message}`);
      for (const m of mods ?? []) moduleMap.set(m.id, m);
    }

    assets.sort((a, b) => {
      const aCC = String(a.regeneration_reason ?? '').startsWith('CONTENT CORRECTED') ? 0 : 1;
      const bCC = String(b.regeneration_reason ?? '').startsWith('CONTENT CORRECTED') ? 0 : 1;
      if (aCC !== bCC) return aCC - bCC;
      const aMod = moduleMap.get(a.module_id)?.module_number ?? 9999;
      const bMod = moduleMap.get(b.module_id)?.module_number ?? 9999;
      return aMod - bMod;
    });

    const workset = body.asset_id ? assets : assets.slice(0, limit);

    for (const asset of workset) {
      processed++;
      const modNum: number | null = moduleMap.get(asset.module_id)?.module_number ?? null;

      if (!asset.module_id) {
        skipped++;
        const reason = 'no module_id';
        skipReasons.push(`${asset.id}: ${reason}`);
        results.push({ asset_id: asset.id, module_number: modNum, status: 'skipped', reason });
        continue;
      }

      const mod = moduleMap.get(asset.module_id);
      if (!mod || !mod.content) {
        skipped++;
        const reason = 'module has no content';
        skipReasons.push(`${asset.id}: ${reason}`);
        results.push({ asset_id: asset.id, module_number: modNum, status: 'skipped', reason });
        continue;
      }

      // COMAR text
      let comarText = '';
      const comarRef = mod.comar_section_ref || mod.comar_reference;
      if (comarRef) {
        const { data: reg } = await supabase
          .from('regulatory_content')
          .select('content_text')
          .eq('section_number', comarRef)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        comarText = reg?.content_text ?? '';
      }

      const moduleContent = String(mod.content).slice(0, 8000);
      const comarSlice = comarText.slice(0, 4000);
      const regenReason = asset.regeneration_reason ?? '(none)';

      const userPrompt = `MODULE ${mod.module_number}: ${mod.title}

REGENERATION REASON:
${regenReason}

MODULE CONTENT (authoritative — the ONLY source of rules, figures, deadlines, and citations you may use):
${moduleContent}

RELEVANT COMAR SECTION TEXT (for reference — you may quote citations aloud as the module does, but do not introduce rules from here that are not in the module content above):
${comarSlice || '(none available)'}

TASK:
Write a spoken narration script for a training video.

LENGTH — this is a hard requirement:
- Target 700 to 800 words. Never exceed 850 words.
- At roughly 150 words per minute this produces a video of about 5 minutes, which is the maximum a learner will reliably watch without disengaging.
- Do NOT attempt to cover every point in the module. The module text remains the complete, authoritative version. The video is an overview that carries the most consequential material.

WHAT TO PRIORITISE when the module contains more than fits:
1. Any rule with a specific figure, threshold, deadline or percentage — these must appear, stated exactly as written in the module. Examples of the kind of thing that must never be cut: reporting thresholds, retention periods, notification deadlines, dose limits, age requirements.
2. Any rule where following the wrong version causes a violation — obligations the agent must act on, not background context.
3. One or two concrete scenarios showing the rule applied at the counter.

WHAT TO CUT FIRST:
- Background, history, and rationale
- Repetition and summary sections
- Lists of examples where two or three suffice
- Encouragement and closing motivational passages

STYLE:
- Plain spoken English suitable for narration. No headings, no bullet points, no stage directions, no speaker labels.
- State figures exactly as the module states them.
- Cite COMAR sections aloud naturally where the module does, spelling out the numbers for speech — for example "COMAR fourteen point seventeen point twelve point ten".
- End with one short sentence telling the learner the full detail is in the module text below the video.
- Return ONLY the narration script text. No preamble, no title, no markdown, no commentary about the script.`;

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Anthropic ${response.status}: ${errText.slice(0, 300)}`);
        }

        const data = await response.json();
        const script: string = (data?.content?.[0]?.text ?? '').trim();
        if (!script) throw new Error('Anthropic returned empty script');

        const { error: updErr } = await supabase
          .from('video_assets')
          .update({
            draft_script: script,
            draft_generated_at: new Date().toISOString(),
            review_status: 'script_pending_review',
          })
          .eq('id', asset.id);
        if (updErr) throw new Error(`update failed: ${updErr.message}`);

        const scriptWords = (script.match(/\S+/g) ?? []).length;
        const estimatedMinutes = Math.round((scriptWords / 150) * 10) / 10;

        succeeded++;
        results.push({
          asset_id: asset.id,
          module_number: modNum,
          status: 'succeeded',
          script_length: script.length,
          script_words: scriptWords,
          estimated_minutes: estimatedMinutes,
        });
      } catch (perAssetErr) {
        const reason = perAssetErr instanceof Error ? perAssetErr.message : String(perAssetErr);
        console.error(`[generate-video-script] asset ${asset.id} failed:`, reason);
        results.push({ asset_id: asset.id, module_number: modNum, status: 'error', reason });
      }
    }

    await logRun('success');

    return new Response(
      JSON.stringify({ ok: true, processed, succeeded, skipped, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[generate-video-script] fatal:', msg);
    await logRun('error', msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg, processed, succeeded, skipped, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
