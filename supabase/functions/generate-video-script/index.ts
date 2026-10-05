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

const DRAFT_MODEL = 'claude-haiku-4-5';
// 850 spoken words is about 1,150 tokens. 1,300 finishes that script without the old 3,000-token ceiling.
const SCRIPT_MAX_TOKENS = 1300;
const SLIDE_MAX_TOKENS = 800;
const SECTION_CHAR_CAP = 4500;
const ASSET_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  [key: string]: number;
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
  model?: string;
  usage?: TokenUsage;
  usage_calls?: unknown[];
  cost?: number | null;
  estimated_cost_usd?: number | null;
}

class AnthropicRequestError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(`Anthropic ${status}: ${detail}`);
    this.name = 'AnthropicRequestError';
    this.status = status;
  }
}

function emptyUsage(): TokenUsage {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };
}

function absorbUsage(total: TokenUsage, raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
}

function usageCost(rawCalls: unknown[]): number | null {
  let found = false;
  let sum = 0;
  for (const raw of rawCalls) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const value = typeof record.cost === 'number'
      ? record.cost
      : typeof record.cost_usd === 'number'
        ? record.cost_usd
        : null;
    if (value != null) {
      found = true;
      sum += value;
    }
  }
  return found ? sum : null;
}

// Published Haiku 4.5 rates. Used only when the usage object has no dollar field.
function estimateHaikuCost(usage: TokenUsage): number {
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  return (input * 1 + cacheWrite * 1.25 + cacheRead * 0.1 + output * 5) / 1_000_000;
}

function normalizeSection(value: unknown): string | null {
  const match = String(value ?? '').match(/14\.17\.\d+\.\d+/);
  if (!match || match[0] === PROPOSED_SECTION) return null;
  return match[0];
}

function citedSectionNumbers(moduleContent: string, primary: unknown, reference: unknown): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (section: string | null) => {
    if (!section || seen.has(section)) return;
    seen.add(section);
    ordered.push(section);
  };
  add(normalizeSection(primary));
  add(normalizeSection(reference));
  for (const match of moduleContent.matchAll(/14\.17\.\d+\.\d+/g)) add(match[0]);
  return ordered;
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

function trimToWordLimit(script: string, limit: number): string {
  let sentences = sentencesOf(script);
  if (sentences.length > 0 && !/[.!?]"?$/.test(sentences[sentences.length - 1])) {
    sentences = sentences.slice(0, -1);
  }
  const kept: string[] = [];
  let count = 0;
  for (const sentence of sentences) {
    const n = sentence.split(/\s+/).filter(Boolean).length;
    if (count + n > limit && kept.length > 0) break;
    kept.push(sentence);
    count += n;
  }
  for (const sentence of sentences) {
    if (!sentence.includes(PROPOSED_LABEL) || kept.includes(sentence)) continue;
    const n = sentence.split(/\s+/).filter(Boolean).length;
    if (count + n > 850) continue;
    kept.push(sentence);
    count += n;
  }
  return kept.join(' ').trim();
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
): Promise<{ text: string; usage: unknown; stop_reason: string | null }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: DRAFT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new AnthropicRequestError(response.status, errText.slice(0, 300));
  }
  const data = await response.json();
  const text = String(data?.content?.[0]?.text ?? '').trim();
  if (!text) throw new Error('Anthropic returned an empty response');
  return {
    text,
    usage: data?.usage ?? {},
    stop_reason: typeof data?.stop_reason === 'string' ? data.stop_reason : null,
  };
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
- Write 720 to 780 words. Never exceed 800 words.
- Stop when you reach 780 words, even if more module points remain.
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

function partitionNarration(script: string): string[] {
  const collapsed = collapse(script);
  let sentences = sentencesOf(collapsed);
  if (collapse(sentences.join(' ')) !== collapsed) {
    const words = collapsed.split(' ');
    const size = Math.ceil(words.length / 12);
    sentences = [];
    for (let i = 0; i < words.length; i += size) sentences.push(words.slice(i, i + size).join(' '));
  }
  while (sentences.length < 6) {
    let longestAt = 0;
    sentences.forEach((sentence, index) => {
      if (sentence.split(' ').length > sentences[longestAt].split(' ').length) longestAt = index;
    });
    const words = sentences[longestAt].split(' ');
    if (words.length < 8) break;
    const mid = Math.ceil(words.length / 2);
    sentences.splice(longestAt, 1, words.slice(0, mid).join(' '), words.slice(mid).join(' '));
  }
  const title = sentences[0];
  const closing = sentences[sentences.length - 1];
  const middle = sentences.slice(1, -1);
  const slideCount = Math.min(8, Math.max(4, Math.min(6, middle.length)));
  const buckets: string[][] = Array.from({ length: slideCount }, () => []);
  middle.forEach((sentence, index) => {
    const bucket = Math.min(slideCount - 1, Math.floor((index * slideCount) / middle.length));
    buckets[bucket].push(sentence);
  });
  const narration = [title, ...buckets.map((bucket) => bucket.join(' ')).filter(Boolean), closing];
  if (collapse(narration.join(' ')) !== collapsed) {
    throw new Error('could not partition the draft script into slides');
  }
  return narration;
}

function displayLine(chunk: string, words: number): string {
  const short = chunk.split(' ').slice(0, words).join(' ');
  if (unlabeledProposedSentences(short).length > 0 || (DEADLINE_RE.test(chunk) && !short.includes(PROPOSED_LABEL))) {
    return `${short} — ${PROPOSED_LABEL}`;
  }
  return short;
}

function chipFor(chunk: string): string {
  return chunk.includes(PROPOSED_LABEL) || DEADLINE_RE.test(chunk) ? PROPOSED_LABEL : '';
}

function fallbackSlideSpec(script: string, moduleNumber: number | null, title: string, narration: string[]): SlideSpec {
  const slideNarration = narration.slice(1, -1);
  const moduleLabel = `Module ${moduleNumber ?? ''}`.trim();
  return {
    title: {
      module: moduleLabel,
      lines: [displayLine(title, 6), displayLine(narration[0], 8)].filter((line, index, all) => all.indexOf(line) === index),
      subtitle: displayLine(narration[0], 12),
      chip: chipFor(narration[0]) || moduleLabel,
    },
    slides: slideNarration.map((chunk, index) => ({
      heading: displayLine(chunk, 6),
      bullets: [displayLine(chunk, 14)],
      ...(chipFor(chunk) ? { chip: chipFor(chunk) } : {}),
      key: index === 0,
    })),
    narration,
    closing: {
      lines: [displayLine(narration[narration.length - 1], 10)],
      sub: displayLine(narration[narration.length - 1], 12),
      chip: chipFor(narration[narration.length - 1]) || 'Close',
    },
  };
}

function slidePrompt(moduleNumber: number | null, title: string, narration: string[]): string {
  const slides = narration.slice(1, -1).map((chunk, index) => `SLIDE ${index + 1} SPOKEN TEXT:\n${chunk}`).join('\n\n');
  return `Write on-screen text for this narration. Do not rewrite the spoken text.

MODULE ${moduleNumber ?? ''}: ${title}
There are exactly ${narration.length - 2} slides. Return one object per slide, in order.

TITLE SPOKEN TEXT:
${narration[0]}

${slides}

CLOSING SPOKEN TEXT:
${narration[narration.length - 1]}

Return ONLY JSON:
{
  "title_lines": ["short line", "short line"],
  "subtitle": "short subtitle",
  "slides": [{ "heading": "short heading", "bullets": ["short bullet"], "key": false }],
  "closing_lines": ["short line"],
  "closing_sub": "short line"
}

If any spoken text states a proposed-draft rule, copy the exact label "${PROPOSED_LABEL}" into the matching heading or bullet. Do not mention PCE-744. Do not add deadlines that are not in the spoken text.`;
}

function applySlideCopy(base: SlideSpec, raw: string): SlideSpec {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return base;
  const parsed = JSON.parse(raw.slice(start, end + 1));
  const titleLines = asStringArray(parsed?.title_lines);
  const closingLines = asStringArray(parsed?.closing_lines);
  if (!titleLines || !closingLines || !Array.isArray(parsed?.slides) || parsed.slides.length !== base.slides.length) {
    return base;
  }
  const slides = base.slides.map((slide, index) => {
    const incoming = parsed.slides[index] ?? {};
    const bullets = asStringArray(incoming.bullets) ?? slide.bullets;
    const heading = typeof incoming.heading === 'string' && incoming.heading.trim() ? incoming.heading.trim() : slide.heading;
    return {
      heading,
      bullets,
      ...(slide.chip ? { chip: slide.chip } : {}),
      key: typeof incoming.key === 'boolean' ? incoming.key : slide.key,
    };
  });
  return {
    ...base,
    title: {
      ...base.title,
      lines: titleLines,
      subtitle: typeof parsed.subtitle === 'string' && parsed.subtitle.trim() ? parsed.subtitle.trim() : base.title.subtitle,
    },
    slides,
    closing: {
      ...base.closing,
      lines: closingLines,
      sub: typeof parsed.closing_sub === 'string' && parsed.closing_sub.trim() ? parsed.closing_sub.trim() : base.closing.sub,
    },
  };
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
          model: DRAFT_MODEL,
          script_max_tokens: SCRIPT_MAX_TOKENS,
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

    let body: { asset_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const assetId = typeof body.asset_id === 'string' ? body.asset_id.trim() : '';
    if (!ASSET_ID_RE.test(assetId)) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'asset_id is required. This function drafts one asset and will not scan the flagged catalog.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { data: assetRows, error: assetErr } = await supabase
      .from('video_assets')
      .select('id, asset_key, module_id, course_id, title, regeneration_reason, needs_regeneration')
      .eq('id', assetId)
      .limit(1);
    if (assetErr) throw new Error(`asset lookup failed: ${assetErr.message}`);
    const assets: any[] = assetRows ?? [];
    if (assets.length !== 1) {
      return new Response(JSON.stringify({ ok: false, error: 'asset not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const workset = assets.slice(0, 1);
    const runUsage = emptyUsage();
    const runCalls: unknown[] = [];

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

      const moduleContent = String(mod.content).slice(0, 16000);
      const sectionNumbers = citedSectionNumbers(moduleContent, mod.comar_section_ref, mod.comar_reference);
      let comarSlice = '(none available)';
      if (sectionNumbers.length > 0) {
        const { data: regs, error: regErr } = await supabase
          .from('regulatory_content')
          .select('section_number, content_text, last_modified_at')
          .in('section_number', sectionNumbers)
          .eq('authority_status', 'current');
        if (regErr) throw new Error(`current COMAR lookup failed: ${regErr.message}`);
        const latest = new Map<string, { text: string; at: string }>();
        for (const row of regs ?? []) {
          const section = String(row.section_number ?? '');
          const at = String(row.last_modified_at ?? '');
          const prev = latest.get(section);
          if (!prev || at > prev.at) {
            latest.set(section, { text: String(row.content_text ?? ''), at });
          }
        }
        const blocks = sectionNumbers.flatMap((section) => {
          const text = latest.get(section)?.text?.trim() ?? '';
          if (!text) return [];
          return [`COMAR ${section}\n${text.slice(0, SECTION_CHAR_CAP)}`];
        });
        if (blocks.length > 0) comarSlice = blocks.join('\n\n');
      }
      const regenReason = asset.regeneration_reason ?? '(none)';
      let proposed = '';
      try {
        proposed = proposedBlock(modNum, proposedText);
      } catch (tieErr) {
        const reason = tieErr instanceof Error ? tieErr.message : String(tieErr);
        results.push({ asset_id: asset.id, module_number: modNum, status: 'error', reason });
        continue;
      }

      const usage = emptyUsage();
      const usageCalls: unknown[] = [];
      let usageCounted = false;
      try {
        let script = '';
        let scriptError = '';
        for (let attempt = 1; attempt <= 2; attempt++) {
          const userPrompt = scriptPrompt({
            moduleNumber: mod.module_number,
            title: mod.title,
            regenReason,
            moduleContent,
            comarSlice,
            proposed,
          }) + (scriptError
            ? `\n\nCORRECTION REQUIRED ON THIS ATTEMPT:\n${scriptError}\nRewrite the script so the problem is gone.`
            : '');
          let draft: { text: string; usage: unknown; stop_reason: string | null };
          try {
            draft = await callAnthropic(
              anthropicApiKey,
              SYSTEM_PROMPT,
              userPrompt,
              SCRIPT_MAX_TOKENS,
            );
          } catch (callErr) {
            if (callErr instanceof AnthropicRequestError && callErr.status === 400) throw callErr;
            throw callErr;
          }
          usageCalls.push(draft.usage);
          absorbUsage(usage, draft.usage);
          const drafted = modNum === 29 ? withM29Closer(draft.text) : draft.text.trim();
          script = trimToWordLimit(drafted, 780);
          const words = (script.match(/\S+/g) ?? []).length;
          if (words < 600 || words > 850) {
            scriptError = `The draft is ${words} words after trimming to complete sentences. Write 720 to 780 words.`;
            script = '';
            continue;
          }
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
        if (modNum != null && modNum in NOPA_TIES && !script.includes(PROPOSED_LABEL)) {
          throw new Error('draft omitted the labeled proposed-rule tie');
        }

        const narration = partitionNarration(script);
        const baseSpec = fallbackSlideSpec(script, modNum, mod.title, narration);
        let spec = baseSpec;
        try {
          const raw = await callAnthropic(
            anthropicApiKey,
            `You write short on-screen training slides. You do not change spoken words. You never present proposed text as current law. The only status label for that text is: ${PROPOSED_LABEL}.`,
            slidePrompt(modNum, mod.title, narration),
            SLIDE_MAX_TOKENS,
          );
          usageCalls.push(raw.usage);
          absorbUsage(usage, raw.usage);
          spec = applySlideCopy(baseSpec, raw.text);
          validateSlideSpec(spec, script, modNum);
        } catch (slideErr) {
          if (slideErr instanceof AnthropicRequestError && slideErr.status === 400) {
            console.error('[generate-video-script] slide request returned 400; not retrying');
          }
          spec = baseSpec;
          validateSlideSpec(spec, script, modNum);
          console.error('[generate-video-script] using exact narration slides:', slideErr instanceof Error ? slideErr.message : slideErr);
        }
        absorbUsage(runUsage, usage);
        runCalls.push(...usageCalls);
        usageCounted = true;

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
        const reportedCost = usageCost(usageCalls);
        results.push({
          asset_id: asset.id,
          module_number: modNum,
          status: 'succeeded',
          script_length: script.length,
          script_words: scriptWords,
          estimated_minutes: estimatedMinutes,
          slide_count: spec.slides.length,
          model: DRAFT_MODEL,
          usage,
          usage_calls: usageCalls,
          cost: reportedCost,
          estimated_cost_usd: reportedCost == null ? estimateHaikuCost(usage) : null,
        });
      } catch (perAssetErr) {
        const reason = perAssetErr instanceof Error ? perAssetErr.message : String(perAssetErr);
        console.error(`[generate-video-script] asset ${asset.id} failed:`, reason);
        if (!usageCounted) {
          absorbUsage(runUsage, usage);
          runCalls.push(...usageCalls);
        }
        const reportedCost = usageCost(usageCalls);
        results.push({
          asset_id: asset.id,
          module_number: modNum,
          status: 'error',
          reason,
          model: DRAFT_MODEL,
          usage,
          usage_calls: usageCalls,
          cost: reportedCost,
          estimated_cost_usd: reportedCost == null ? estimateHaikuCost(usage) : null,
        });
      }
    }

    await logRun('success');

    const reportedCost = usageCost(runCalls);
    return new Response(
      JSON.stringify({
        ok: true,
        processed,
        succeeded,
        skipped,
        model: DRAFT_MODEL,
        script_max_tokens: SCRIPT_MAX_TOKENS,
        slide_max_tokens: SLIDE_MAX_TOKENS,
        usage: runUsage,
        cost: reportedCost,
        estimated_cost_usd: reportedCost == null ? estimateHaikuCost(runUsage) : null,
        results,
      }),
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
