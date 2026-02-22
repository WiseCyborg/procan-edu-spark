import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GapStatus = 'PASS' | 'GAP' | 'UNMAPPED';

interface DeltaRow {
  comar_requirement: string;
  system_behavior: string;
  gap_status: GapStatus;
  recommended_fix?: string;
  evidence?: {
    module_ids?: string[];
    module_titles?: string[];
    comar_sections?: string[];
    regulatory_content_ids?: string[];
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const includeUnmapped = body.includeUnmapped ?? true;

    // 1) Pull active course modules with COMAR mappings
    const { data: modules, error: modulesErr } = await supabase
      .from('course_modules')
      .select('id, title, module_number, comar_reference, comar_compliance_status, content, course_id')
      .eq('is_active', true)
      .order('module_number', { ascending: true });

    if (modulesErr) throw modulesErr;

    // Normalize module -> comar sections
    const moduleMappings = (modules ?? []).map((m: any) => {
      const sections: string[] = [];
      if (typeof m.comar_reference === 'string' && m.comar_reference.trim()) {
        // Could be comma-separated or single reference
        sections.push(...m.comar_reference.split(',').map((s: string) => s.trim()).filter(Boolean));
      }
      return { id: m.id, title: m.title, module_number: m.module_number, sections, compliance_status: m.comar_compliance_status };
    });

    const mappedSections = new Set<string>();
    for (const mm of moduleMappings) {
      mm.sections.forEach((s: string) => mappedSections.add(s));
    }

    // 2) Pull regulatory content (COMAR requirements)
    const { data: regs, error: regsErr } = await supabase
      .from('regulatory_content')
      .select('id, section_number, section_title, content_text')
      .order('section_number', { ascending: true });

    if (regsErr) throw regsErr;

    if (!regs || regs.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'No regulatory_content rows found. Compliance delta cannot be generated.',
        agent: 'RVT System Auditor'
      }), { status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    // 3) Cross-reference
    const rows: DeltaRow[] = [];

    for (const r of (regs ?? [])) {
      const section = r.section_number;
      const hasMapping = section && mappedSections.has(section);
      const requirementLabel = section
        ? `${section} — ${r.section_title ?? 'Requirement'}`
        : `${r.section_title ?? 'Requirement'}`;

      if (hasMapping) {
        const evidenceModules = moduleMappings.filter(m => m.sections.includes(section));
        rows.push({
          comar_requirement: requirementLabel,
          system_behavior: evidenceModules.length
            ? `Covered in ${evidenceModules.map(m => `Module ${m.module_number}: ${m.title}`).slice(0, 2).join(', ')}${evidenceModules.length > 2 ? '…' : ''}`
            : 'Covered in course content',
          gap_status: 'PASS',
          evidence: {
            module_ids: evidenceModules.map(m => m.id),
            module_titles: evidenceModules.map(m => m.title),
            comar_sections: [section],
            regulatory_content_ids: [r.id]
          }
        });
      } else {
        rows.push({
          comar_requirement: requirementLabel,
          system_behavior: 'Not present / not mapped in course modules',
          gap_status: 'GAP',
          recommended_fix: 'Map an existing module or add coverage for this COMAR section',
          evidence: {
            module_ids: [],
            module_titles: [],
            comar_sections: section ? [section] : [],
            regulatory_content_ids: [r.id]
          }
        });
      }
    }

    // UNMAPPED: modules with no COMAR mapping
    if (includeUnmapped) {
      const unmapped = moduleMappings.filter(m => m.sections.length === 0);
      for (const m of unmapped) {
        rows.push({
          comar_requirement: '(No COMAR mapping)',
          system_behavior: `Module ${m.module_number}: ${m.title} — not mapped to any COMAR section`,
          gap_status: 'UNMAPPED',
          recommended_fix: 'Assign COMAR section mapping or tag as "non-regulatory enrichment"',
          evidence: { module_ids: [m.id], module_titles: [m.title], comar_sections: [] }
        });
      }
    }

    const summary = {
      pass: rows.filter(r => r.gap_status === 'PASS').length,
      gap: rows.filter(r => r.gap_status === 'GAP').length,
      unmapped: rows.filter(r => r.gap_status === 'UNMAPPED').length,
      total_modules: moduleMappings.length,
      total_regulations: (regs ?? []).length
    };

    // 4) Log to ai_agent_runs
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'RVT System Auditor',
      agent_type: 'compliance_delta',
      execution_status: summary.gap > 0 ? 'completed_with_gaps' : 'completed',
      items_processed: (regs ?? []).length + moduleMappings.length,
      changes_detected: summary.gap + summary.unmapped,
      metadata: { includeUnmapped, summary }
    });

    const result = {
      agent: 'RVT System Auditor',
      generated_at: new Date().toISOString(),
      summary,
      rows
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (e: any) {
    console.error('generate-compliance-delta error:', e);
    return new Response(JSON.stringify({
      error: e?.message ?? String(e),
      agent: 'RVT System Auditor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
