import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROPOSED_LABEL = 'PROPOSED informal web draft 9/16/26, not final law';
const PROPOSED_SECTION = '14.17.15.05';
const PROPOSED_HASH = 'nopa-informal-web-draft-2026-09-16';
const M29_CLOSER =
  'Scripts derived from the module content live in the ProCann EDU production LMS, verified against COMAR Title 14 Subtitle 17 and MCA Bulletin 2019-017 on 18 August 2026.';

const SYSTEM_PROMPT =
  'You are a compliance training scriptwriter for Maryland cannabis Responsible Vendor Training. You write spoken narration scripts that stay strictly within the source material provided. You never introduce a rule, figure, deadline, citation, or regulatory fact that is not present in the supplied module content or in a supplied proposed-draft block. You use plain spoken English suitable for narration. ' +
  `A block marked "${PROPOSED_LABEL}" is not current law and is not final law. You must never state a rule from that block as something the law currently requires. If you mention any rule from that block, including a 90-day item, an every-2-years item, a 10-day item, or a 30-day standard-operating-procedure item, the same sentence must contain the exact words: ${PROPOSED_LABEL}. Do not mention PCE-744.`;

interface Tie {
  cites: string;
  lines: string[];
}

const NOPA_TIES: Record<number, Tie> = {
  24: {
    cites: 'D(3)(a) and D(3)(c)',
    lines: [
      'An approved training program shall provide a core curriculum of relevant statutory and regulatory provisions, including:',
      '(a) Administrative and criminal liability and license and court sanctions;',
      '(c) State and local licensing and enforcement;',
    ],
  },
  25: {
    cites: 'D(3)(d) and D(3)(e)',
    lines: [
      'An approved training program shall provide a core curriculum of relevant statutory and regulatory provisions, including:',
      '(d) Public health and safety standards relevant to each license type;',
      '(e) Grower, processor, or dispensary operations as established in this subtitle and Administration guidance;',
    ],
  },
  26: {
    cites: 'D(3)(e)',
    lines: [
      'An approved training program shall provide a core curriculum of relevant statutory and regulatory provisions, including:',
      '(e) Grower, processor, or dispensary operations as established in this subtitle and Administration guidance;',
    ],
  },
  27: {
    cites: 'D(3)(b) and D(3)(e)',
    lines: [
      'An approved training program shall provide a core curriculum of relevant statutory and regulatory provisions, including:',
      '(b) Statutory and regulatory requirements for employees and owners;',
      '(e) Grower, processor, or dispensary operations as established in this subtitle and Administration guidance;',
    ],
  },
  28: {
    cites: 'D(3)(e) and D(3)(f)',
    lines: [
      'An approved training program shall provide a core curriculum of relevant statutory and regulatory provisions, including:',
      '(e) Grower, processor, or dispensary operations as established in this subtitle and Administration guidance;',
      '(f) Cannabis product requirements;',
    ],
  },
  29: {
    cites: 'A(2)(a) and A(2)(b), SOP training within 30 days',
    lines: [
      '(2) Standard operating procedures:',
      "(a) Within 30 days of a new employee's start date; and",
      "(b) Within 30 days of any changes to the licensee's standard operating procedures that impact the employee's duties or working conditions;",
    ],
  },
};

interface SlideSpecSlide {
  heading: string;
  bullets: string[];
  chip?: string;
  key?: boolean;
}

interface SlideSpec {
  title: { module: string; lines: string[]; subtitle: string; chip: string };
  slides: SlideSpecSlide[];
  narration: string[];
  closing: { lines: string[]; sub: string; chip: string };
}

interface AssetResult {
  asset_id: string;
  module_number: number | null;
  status: 'succeeded' | 'skipped' | 'error';
  script_length?: number;
  script_words?: number;
  estimated_minutes?: number;
  slide_count?: number;
  reason?: string;
}

const collapse = (value: string) => value.replace(/\s+/g, ' ').trim();

const sentencesOf = (value: string) =>
  collapse(value).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

const DEADLINE_RE = /90[\s-]*days|ninety\s+days|every\s+2\s+years|every\s+two\s+years|10[\s-]*days|ten\s+days/i;
const SOP_30_RE = /30[\s-]*days/i;

function unlabeledProposedSentences(text: string): string[] {
  const bad: string[] = [];
  for (const sentence of sentencesOf(text)) {
    const deadline = DEADLINE_RE.test(sentence);
    const sopTiming = SOP_30_RE.test(sentence) && /standard operating|SOP/i.test(sentence);
    if ((deadline || sopTiming) && !sentence.includes(PROPOSED_LABEL)) bad.push(sentence);
  }
  return bad;
}

function mentionsPce(text: string): boolean {
  return /PCE[-\s]?744/i.test(text);
}

function withM29Closer(script: string): string {
  const trimmed = script.trim();
  if (trimmed.endsWith(M29_CLOSER)) return trimmed;
  const marker = 'Scripts derived from the module content live in the ProCann EDU';
  const idx = trimmed.indexOf(marker);
  const base = (idx >= 0 ? trimmed.slice(0, idx) : trimmed).trim().replace(/[.?!]\s*$/, '.');
  return `${base} ${M29_CLOSER}`;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every((item) => typeof item === 'string' && item.trim().length > 0)) return null;
  return value.map((item) => String(item).trim());
}

function parseSlideSpec(raw: string): SlideSpec {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('slide response was not JSON');
  const parsed = JSON.parse(raw.slice(start, end + 1));
  const lines = asStringArray(parsed?.title?.lines);
  const closingLines = asStringArray(parsed?.closing?.lines);
  const narration = asStringArray(parsed?.narration);
  if (!lines || !closingLines || !narration) throw new Error('slide JSON is missing required text arrays');
  if (typeof parsed?.title?.module !== 'string' || !parsed.title.module.trim()) {
    throw new Error('slide title.module is empty');
  }
  if (typeof parsed?.title?.subtitle !== 'string' || typeof parsed?.title?.chip !== 'string') {
    throw new Error('slide title subtitle or chip is missing');
  }
  if (!Array.isArray(parsed?.slides)) throw new Error('slide JSON has no slides array');
  const slides: SlideSpecSlide[] = parsed.slides.map((slide: any, index: number) => {
    const bullets = asStringArray(slide?.bullets);
    if (typeof slide?.heading !== 'string' || !slide.heading.trim() || !bullets) {
      throw new Error(`slide ${index + 1} is missing a heading or bullets`);
    }
    const chip = typeof slide?.chip === 'string' ? slide.chip.trim() : '';
    return {
      heading: slide.heading.trim(),
      bullets,
      ...(chip ? { chip } : {}),
      key: !!slide?.key,
    };
  });
  if (typeof parsed?.closing?.sub !== 'string' || typeof parsed?.closing?.chip !== 'string') {
    throw new Error('slide closing sub or chip is missing');
  }
  return {
    title: {
      module: parsed.title.module.trim(),
      lines,
      subtitle: parsed.title.subtitle.trim(),
      chip: parsed.title.chip.trim(),
    },
    slides,
    narration,
    closing: {
      lines: closingLines,
      sub: parsed.closing.sub.trim(),
      chip: parsed.closing.chip.trim(),
    },
  };
}

function validateSlideSpec(spec: SlideSpec, script: string, moduleNumber: number | null): void {
  if (spec.slides.length < 4 || spec.slides.length > 8) {
    throw new Error(`slide count ${spec.slides.length} is outside 4 to 8`);
  }
  if (spec.narration.length !== spec.slides.length + 2) {
    throw new Error(`narration length ${spec.narration.length} is not slides + 2`);
  }
  if (!spec.title.module || !spec.title.subtitle || !spec.title.chip) {
    throw new Error('title card is incomplete');
  }
  if (!spec.closing.sub || !spec.closing.chip) throw new Error('closing card is incomplete');
  const joined = collapse(spec.narration.join(' '));
  if (joined !== collapse(script)) {
    throw new Error('slide narration does not match the draft script word for word');
  }
  const visible = [
    spec.title.module,
    spec.title.subtitle,
    spec.title.chip,
    ...spec.title.lines,
    spec.closing.sub,
    spec.closing.chip,
    ...spec.closing.lines,
    ...spec.narration,
    ...spec.slides.flatMap((slide) => [slide.heading, slide.chip ?? '', ...slide.bullets]),
  ].join('\n');
  if (mentionsPce(visible) || mentionsPce(script)) throw new Error('draft mentions PCE-744');
  const unlabeled = unlabeledProposedSentences(`${script}\n${visible}`);
  if (unlabeled.length > 0) {
    throw new Error(`proposed deadline stated without the required label: ${unlabeled[0].slice(0, 180)}`);
  }
  if (moduleNumber === 29 && !spec.narration[spec.narration.length - 1].trim().endsWith(M29_CLOSER)) {
    throw new Error('module 29 closing narration does not keep the existing closer');
  }
}

function proposedBlock(moduleNumber: number | null, storedText: string): string {
  if (moduleNumber == null || !(moduleNumber in NOPA_TIES)) {
    return `(none for this module). Do not add rules from ${PROPOSED_SECTION}.`;
  }
  const tie = NOPA_TIES[moduleNumber];
  const missing = tie.lines.filter((line) => !storedText.includes(line));
  if (missing.length > 0) {
    throw new Error(`stored proposed draft is missing ${tie.cites}`);
  }
  return `${PROPOSED_LABEL}
Section: COMAR ${PROPOSED_SECTION}. Tied provisions for this module only: ${tie.cites}.
These lines are not current law and are not final law. Do not state them as a current obligation. If you say any of them aloud, the same sentence must include the exact label "${PROPOSED_LABEL}". Do not use any other subsection of this draft. Do not mention the 90-day, every-2-years, or 10-day items unless one of the lines below contains that item. Do not mention PCE-744.

${tie.lines.join('\n')}`;
}

async function callAnthropic(
  apiKey: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic ${response.status}: ${errText.slice(0, 300)}`);
  }
  const data = await response.json();
  const text = String(data?.content?.[0]?.text ?? '').trim();
  if (!text) throw new Error('Anthropic returned an empty response');
  return text;
}

function scriptPrompt(args: {
  moduleNumber: number;
  title: string;
  regenReason: string;
  moduleContent: string;
  comarSlice: string;
  proposed: string;
}): string {
  const closerRule = args.moduleNumber === 29
    ? `End the script with this sentence, character for character, and do not rewrite it: ${M29_CLOSER}`
    : 'End with one short sentence telling the learner the full detail is in the module text below the video.';
  return `MODULE ${args.moduleNumber}: ${args.title}

REGENERATION REASON:
${args.regenReason}

MODULE CONTENT (authoritative for current rules — the only source of current rules, figures, deadlines, and citations you may use):
${args.moduleContent}

RELEVANT CURRENT COMAR SECTION TEXT (adopted text only — you may quote citations aloud as the module does, but do not introduce rules from here that are not in the module content above):
${args.comarSlice || '(none available)'}

PROPOSED-RULE INPUT:
${args.proposed}

TASK:
Write a spoken narration script for a training video.

LENGTH — this is a hard requirement:
- Target 700 to 800 words. Never exceed 850 words.
- At roughly 150 words per minute this produces a video of about 5 minutes.
- Do NOT attempt to cover every point in the module. The module text remains the complete, authoritative version. The video is an overview that carries the most consequential material.

WHAT TO PRIORITISE when the module contains more than fits:
1. Any current rule with a specific figure, threshold, deadline or percentage — these must appear, stated exactly as written in the module.
2. Any current rule where following the wrong version causes a violation.
3. The tied proposed-draft provisions, each one spoken as proposed and not as current law, with the exact label "${PROPOSED_LABEL}" in the same sentence.
4. One or two concrete scenarios showing a current rule applied at the counter.

WHAT TO CUT FIRST:
- Background, history, and rationale
- Repetition and summary sections
- Lists of examples where two or three suffice
- Encouragement and closing motivational passages

STYLE:
- Plain spoken English suitable for narration. No headings, no bullet points, no stage directions, no speaker labels.
- State current figures exactly as the module states them.
- Cite COMAR sections aloud naturally where the module does, spelling out the numbers for speech — for example "COMAR fourteen point seventeen point twelve point ten".
- Never mention PCE-744.
- Never present the proposed draft, including any 90-day, every-2-years, or 10-day item, as current law.
- ${closerRule}
- Return ONLY the narration script text. No preamble, no title, no markdown, no commentary about the script.`;
}

function slidePrompt(script: string, moduleNumber: number | null, title: string): string {
  const collapsed = collapse(script);
  return `Turn this approved-for-review narration into an on-screen slide spec. Do not rewrite the narration.

MODULE ${moduleNumber ?? ''}: ${title}
LABEL, when a slide states a proposed-draft rule: ${PROPOSED_LABEL}

NARRATION, already collapsed to single spaces. The narration array must be an exact split of this string. Joining the array with single spaces must reproduce it character for character:
${collapsed}

Return ONLY JSON with this shape:
{
  "title": { "module": "Module N", "lines": ["short line", "short line"], "subtitle": "current COMAR cites from the narration", "chip": "Module N" },
  "slides": [
    { "heading": "short heading", "bullets": ["short bullet"], "chip": "", "key": false }
  ],
  "narration": ["title spoken text", "slide 1 spoken text", "closing spoken text"],
  "closing": { "lines": ["short line"], "sub": "one short line", "chip": "Close" }
}

RULES:
- Use 4 to 8 slides.
- narration.length must equal slides.length + 2. Index 0 is the title card. The last index is the closing card. The entries in between are one per slide, in order.
- Do not add, drop, or rephrase any word of the narration. Split only on sentence boundaries.
- Headings and bullets are short on-screen text taken from the narration. They are not a new script.
- If a heading, bullet, subtitle, or narration sentence states a rule from the proposed draft, including a 90-day, every-2-years, 10-day, or 30-day SOP item, that same text must include "${PROPOSED_LABEL}", and that slide's chip must be "${PROPOSED_LABEL}".
- Do not mention PCE-744.
- ${moduleNumber === 29 ? `The last narration entry must end with: ${M29_CLOSER}` : 'The last narration entry is the closing sentence already in the script.'}`;
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
          proposed_label: PROPOSED_LABEL,
          ...(errorMessage ? { error: errorMessage } : {}),
        }),
      });
    } catch (e) {
      console.error('[generate-video-script] log insert failed:', e);
    }
  };

  try {
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

    if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    let body: { asset_id?: string; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      // no body is fine
    }
    const rawLimit = typeof body.limit === 'number' ? body.limit : 3;
    const limit = Math.max(1, Math.min(10, rawLimit));

    const { data: proposedRow, error: proposedErr } = await supabase
      .from('regulatory_content')
      .select('content_text, authority_status, authority_label, section_title, effective_date')
      .eq('section_number', PROPOSED_SECTION)
      .eq('version_hash', PROPOSED_HASH)
      .eq('authority_status', 'proposed')
      .maybeSingle();
    if (proposedErr) throw new Error(`proposed rule lookup failed: ${proposedErr.message}`);
    if (!proposedRow?.content_text) throw new Error('proposed COMAR 14.17.15.05 draft is not stored');
    if (
      proposedRow.authority_label !== PROPOSED_LABEL ||
      !String(proposedRow.section_title).startsWith(PROPOSED_LABEL) ||
      !String(proposedRow.content_text).startsWith(PROPOSED_LABEL) ||
      proposedRow.effective_date != null
    ) {
      throw new Error('proposed COMAR draft is missing its not-final-law label');
    }
    const proposedText = String(proposedRow.content_text);

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

      let comarText = '';
      const comarRef = mod.comar_section_ref || mod.comar_reference;
      if (comarRef) {
        const { data: reg, error: regErr } = await supabase
          .from('regulatory_content')
          .select('content_text')
          .eq('section_number', comarRef)
          .eq('authority_status', 'current')
          .order('last_modified_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (regErr) throw new Error(`current COMAR lookup failed: ${regErr.message}`);
        comarText = reg?.content_text ?? '';
      }

      const moduleContent = String(mod.content).slice(0, 8000);
      const comarSlice = comarText.slice(0, 4000);
      const regenReason = asset.regeneration_reason ?? '(none)';
      let proposed = '';
      try {
        proposed = proposedBlock(modNum, proposedText);
      } catch (tieErr) {
        const reason = tieErr instanceof Error ? tieErr.message : String(tieErr);
        results.push({ asset_id: asset.id, module_number: modNum, status: 'error', reason });
        continue;
      }

      try {
        let script = '';
        let scriptError = '';
        for (let attempt = 1; attempt <= 2; attempt++) {
          const correction = scriptError
            ? `\n\nCORRECTION REQUIRED ON THIS ATTEMPT:\n${scriptError}\nRewrite the script so the problem is gone.`
            : '';
          const draft = await callAnthropic(
            anthropicApiKey,
            SYSTEM_PROMPT,
            scriptPrompt({
              moduleNumber: mod.module_number,
              title: mod.title,
              regenReason,
              moduleContent,
              comarSlice,
              proposed,
            }) + correction,
            3000,
          );
          script = modNum === 29 ? withM29Closer(draft) : draft.trim();
          if (mentionsPce(script)) {
            scriptError = 'Remove every mention of PCE-744.';
            script = '';
            continue;
          }
          const unlabeled = unlabeledProposedSentences(script);
          if (unlabeled.length > 0) {
            scriptError = `These sentences state a proposed deadline as if it were current law. Repeat each one with the exact label "${PROPOSED_LABEL}" in the same sentence, or delete the deadline: ${unlabeled[0]}`;
            script = '';
            continue;
          }
          if (modNum === 29 && !script.endsWith(M29_CLOSER)) {
            scriptError = `End with this exact sentence: ${M29_CLOSER}`;
            script = '';
            continue;
          }
          break;
        }
        if (!script) throw new Error(scriptError || 'script draft failed the proposed-rule check');

        let spec: SlideSpec | null = null;
        let slideError = '';
        for (let attempt = 1; attempt <= 2; attempt++) {
          const correction = slideError ? `\n\nCORRECTION REQUIRED:\n${slideError}` : '';
          const raw = await callAnthropic(
            anthropicApiKey,
            `You convert a finished narration into on-screen slides. You do not change the spoken words. You never present proposed text as current law. The only status label you may use for that text is: ${PROPOSED_LABEL}.`,
            slidePrompt(script, modNum, mod.title) + correction,
            4000,
          );
          try {
            const candidate = parseSlideSpec(raw);
            validateSlideSpec(candidate, script, modNum);
            spec = candidate;
            break;
          } catch (err) {
            slideError = err instanceof Error ? err.message : String(err);
            spec = null;
          }
        }
        if (!spec) throw new Error(slideError || 'draft-to-slide failed');

        const { error: updErr } = await supabase
          .from('video_assets')
          .update({
            draft_script: script,
            draft_generated_at: new Date().toISOString(),
            slide_spec: spec,
            review_status: 'script_pending_review',
            pipeline_stage: 'script_pending_review',
            reviewed_by: null,
            reviewed_at: null,
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
          slide_count: spec.slides.length,
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
