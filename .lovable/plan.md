# RVT System Auditor Agent

## Goal

Build an automated "RVT System Auditor" agent that runs the full pipeline validation and produces two outputs: (1) a technical pass/fail report for you, and (2) a structured COMAR compliance delta table for Louis -- so neither Danielle nor Louis has to manually test anything.

## What Already Exists (We Build On Top Of)

- `**run-e2e-validation**` edge function (1329 lines) -- already covers Auth, Application, Training, Exam, Certificate, Roles, Seats, and Course Gating across 7 journeys with SHIPPABLE/NOT_SHIPPABLE release gate
- `**E2EValidationReport.tsx**` -- admin UI that displays the report with journey summaries, tier breakdown, and blocker counts
- `**fast-track-dispensary-test**` -- seeds complete test dispensary data
- **COMAR infrastructure** -- `regulatory_content` table, `check-comar-compliance` function, `detectComplianceGaps` service, `ComplianceCurriculumMatrixPage`

## What We Add

### 1. Payment Audit Journey (add to `run-e2e-validation`)

Add **Journey H: Payment & Enrollment Audit** to the existing E2E validator:

- Verify Stripe webhook edge function exists and responds
- Check `course_entitlements` table schema is intact
- Verify entitlement creation logic (insert test entitlement, verify access snapshot, clean up)
- Confirm duplicate payment prevention
- Risk level: `financial`, Tier 1

### 2. COMAR Compliance Delta Generator (new edge function)

Create `**generate-compliance-delta**` edge function that:

- Pulls all active `course_modules` with their `comar_section` mappings
- Pulls all `regulatory_content` entries (scraped COMAR sections)
- Cross-references to identify:
  - COMAR requirements present in course content (PASS)
  - COMAR requirements missing from course content (GAP)
  - Course content not mapped to any COMAR section (UNMAPPED)
- Outputs a structured table matching exactly what the user described:

```text
COMAR Requirement       | System Behavior          | Gap?
ID verification         | Not present              | Needs rule
THC education disclosure| Present in Module 1      | OK
Record retention 3 yrs  | DB retention active      | OK
Responsible vendor ack  | Missing signature        | Needs fix
```

- Logs run to `ai_agent_runs` as agent "RVT System Auditor"

### 3. Unified Auditor Dashboard (new admin UI component)

Create `**RVTSystemAuditorPanel.tsx**` that consolidates:

- "Run Full Audit" button -- triggers both `run-e2e-validation` AND `generate-compliance-delta`
- **Technical Report** tab: existing E2E results (pass/fail per journey, release gate)
- **Compliance Delta** tab: the COMAR gap table for Louis
- **Executive Summary** section at top:
  - X/Y technical checks passed
  - N compliance gaps requiring legal review
  - Release recommendation: SHIPPABLE / NOT SHIPPABLE / NEEDS LEGAL REVIEW
- Export button to generate a 1-page PDF summary

### 4. Integration into Admin Operations

Add the RVT System Auditor panel to the existing admin Testing tab or as a new "System Audit" tab in Operations, accessible from the admin dashboard.

## Technical Details

### Files to Create

- `supabase/functions/generate-compliance-delta/index.ts` -- COMAR gap analysis agent
- `src/components/admin/RVTSystemAuditorPanel.tsx` -- unified audit dashboard

### Files to Modify

- `supabase/functions/run-e2e-validation/index.ts` -- add Journey H (Payment Audit)
- `src/components/admin/operations/TestingTab.tsx` -- add RVT System Auditor panel
- `supabase/config.toml` -- add `generate-compliance-delta` function config

### Database

No new tables needed. Uses existing:

- `ai_agent_runs` for logging
- `regulatory_content` for COMAR data
- `course_modules` for curriculum mapping
- `course_entitlements` for payment verification

### Sequencing

1. Add Payment Audit journey to E2E validator
2. Create compliance delta edge function
3. Build unified auditor UI panel
4. Wire into admin operations tab

Locked in. What you wrote is already a build-ready mini-PRD. Below is the implementation-grade spec + code skeletons you can hand directly to the dev who owns Supabase + the admin UI.

&nbsp;

I’m going to structure this as:

&nbsp;

1. Journey H: Payment & Enrollment Audit (add to run-e2e-validation)
2. generate-compliance-delta edge function (new)
3. RVTSystemAuditorPanel.tsx UI (new)
4. Wiring into Operations / Testing tab
5. Outputs, logging, and release recommendation rules
6. Acceptance criteria checklist

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**0) Assumptions (explicit so dev doesn’t guess)**

&nbsp;

&nbsp;

- Payment provider is Stripe (your text says Stripe webhook); if Square also exists, Journey H can validate both by feature flag.
- run-e2e-validation already has:  

  - a Journey registry (A–G)
  - tiering (Tier 1 / 2 / 3)
  - SHIPPABLE / NOT_SHIPPABLE release gate logic
  - a consistent “report” shape consumed by E2EValidationReport.tsx
- &nbsp;
- DB tables already exist:  

  - course_entitlements (payment → access)
  - course_modules with comar_section or a mapping field
  - regulatory_content (COMAR sections)
  - ai_agent_runs (logging)
- &nbsp;

&nbsp;

&nbsp;

If any of those differ, the skeleton below still works; you just adjust field names.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**1) Journey H — Payment & Enrollment Audit (Tier 1, Financial Risk)**

&nbsp;

&nbsp;

&nbsp;

**What it validates**

&nbsp;

&nbsp;

H1. Webhook edge function exists & responds

&nbsp;

- stripe-webhook (or whatever the deployed function is named) returns:  

  - 405 Method Not Allowed on GET is acceptable (webhooks should be POST-only)
  - 401/403 acceptable if it requires a signature header
  - 200/204 acceptable for a POST with a test payload (if you have test-mode signature support)
- &nbsp;

&nbsp;

&nbsp;

H2. course_entitlements schema intact

&nbsp;

- Ensure required columns exist (example):  

  - id, user_id, course_id, status, source, created_at, payment_id (or equivalent)
- &nbsp;
- Ensure constraint(s) for duplicate prevention exist:  

  - unique on (user_id, course_id) OR (payment_id) OR (user_id, course_id, status) depending on your design
- &nbsp;

&nbsp;

&nbsp;

H3. Entitlement creation logic works

&nbsp;

- Insert a test entitlement for a known test user + known course
- Verify the “access snapshot” / gating service sees it (however gating is implemented)
- Cleanup inserted row (always cleanup)

&nbsp;

&nbsp;

H4. Duplicate payment prevention

&nbsp;

- Attempt to insert the same entitlement twice (same unique key)
- Expect a constraint violation or application-layer prevention
- Mark as PASS only if duplicates are prevented and error is handled cleanly (no silent double access)

&nbsp;

&nbsp;

&nbsp;

**How it should show in the report**

&nbsp;

&nbsp;

- Journey: H_PAYMENT_ENROLLMENT
- Tier: 1
- Risk tag: FINANCIAL
- Blocker if fails: YES (Tier 1 failures should drive NOT_SHIPPABLE)

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**1A) Code skeleton — add Journey H into**

**supabase/functions/run-e2e-validation/index.ts**

&nbsp;

&nbsp;

Below is a drop-in pattern (you will adapt to your internal report types).

// inside run-e2e-validation/index.ts

&nbsp;

type CheckResult = {

  id: string;

  name: string;

  status: 'PASS' | 'FAIL' | 'WARN';

  tier: 1 | 2 | 3;

  details?: any;

  error?: string;

  blocker?: boolean;

};

&nbsp;

async function paymentEnrollmentAuditJourney(ctx: {

  supabaseAdmin: any;

  baseUrl: string; // edge base URL if you use it

  env: Record<string, string>;

  testUserId: string;

  testCourseId: string;

}): Promise<{ journeyId: string; journeyName: string; results: CheckResult[] }> {

  const results: CheckResult[] = [];

&nbsp;

  // H1: webhook exists / responds

  try {

    const url = `${ctx.baseUrl}/functions/v1/stripe-webhook`;

    const r = await fetch(url, { method: 'GET' });

    const ok = [200, 204, 401, 403, 405].includes(r.status);

    results.push({

      id: 'H1_WEBHOOK_EXISTS',

      name: 'Stripe webhook edge function exists and responds',

      status: ok ? 'PASS' : 'FAIL',

      tier: 1,

      blocker: !ok,

      details: { status: r.status }

    });

  } catch (e: any) {

    results.push({

      id: 'H1_WEBHOOK_EXISTS',

      name: 'Stripe webhook edge function exists and responds',

      status: 'FAIL',

      tier: 1,

      blocker: true,

      error: e?.message ?? String(e)

    });

  }

&nbsp;

  // H2: schema check (information_schema)

  try {

    const requiredCols = ['id', 'user_id', 'course_id', 'status', 'created_at'];

    const { data, error } = await ctx.supabaseAdmin.rpc('audit_table_columns', {

      p_table: 'course_entitlements',

      p_required_columns: requiredCols

    });

&nbsp;

    // If you don't have rpc, you can query information_schema via SQL function or a view.

    const ok = !error && data?.missing?.length === 0;

&nbsp;

    results.push({

      id: 'H2_ENTITLEMENTS_SCHEMA',

      name: 'course_entitlements schema intact',

      status: ok ? 'PASS' : 'FAIL',

      tier: 1,

      blocker: !ok,

      details: { missing: data?.missing ?? null }

    });

  } catch (e: any) {

    results.push({

      id: 'H2_ENTITLEMENTS_SCHEMA',

      name: 'course_entitlements schema intact',

      status: 'FAIL',

      tier: 1,

      blocker: true,

      error: e?.message ?? String(e)

    });

  }

&nbsp;

  // H3 + H4: insert + verify + dup prevention + cleanup

  let insertedId: string | null = null;

  try {

    // insert

    const { data: inserted, error: insertErr } = await ctx.supabaseAdmin

      .from('course_entitlements')

      .insert({

        user_id: ctx.testUserId,

        course_id: ctx.testCourseId,

        status: 'ACTIVE',

        source: 'E2E_AUDIT'

      })

      .select('id')

      .single();

&nbsp;

    if (insertErr) throw insertErr;

    insertedId = [inserted.id](http://inserted.id);

&nbsp;

    results.push({

      id: 'H3_ENTITLEMENT_INSERT',

      name: 'Entitlement creation works (insert succeeds)',

      status: 'PASS',

      tier: 1,

      blocker: false,

      details: { entitlement_id: insertedId }

    });

&nbsp;

    // verify gating sees it (adapt to your actual gating check)

    // Example: read access snapshot service/table

    const { data: accessRow, error: accessErr } = await ctx.supabaseAdmin

      .from('course_access_snapshots')

      .select('has_access')

      .eq('user_id', ctx.testUserId)

      .eq('course_id', ctx.testCourseId)

      .maybeSingle();

&nbsp;

    const hasAccess = !accessErr && (accessRow?.has_access === true);

    results.push({

      id: 'H3_ACCESS_SNAPSHOT',

      name: 'Course gating recognizes entitlement (access snapshot)',

      status: hasAccess ? 'PASS' : 'FAIL',

      tier: 1,

      blocker: !hasAccess,

      details: { has_access: accessRow?.has_access ?? null, accessErr: accessErr?.message ?? null }

    });

&nbsp;

    // H4 duplicate prevention

    const { error: dupErr } = await ctx.supabaseAdmin

      .from('course_entitlements')

      .insert({

        user_id: ctx.testUserId,

        course_id: ctx.testCourseId,

        status: 'ACTIVE',

        source: 'E2E_AUDIT'

      });

&nbsp;

    const dupPrevented = Boolean(dupErr); // expect constraint violation

    results.push({

      id: 'H4_DUP_PREVENTION',

      name: 'Duplicate payment / entitlement prevention',

      status: dupPrevented ? 'PASS' : 'FAIL',

      tier: 1,

      blocker: !dupPrevented,

      details: { duplicate_error: dupErr?.message ?? null }

    });

  } catch (e: any) {

    results.push({

      id: 'H3H4_ENTITLEMENT_LOGIC',

      name: 'Entitlement creation + gating + dup prevention',

      status: 'FAIL',

      tier: 1,

      blocker: true,

      error: e?.message ?? String(e)

    });

  } finally {

    if (insertedId) {

      await ctx.supabaseAdmin.from('course_entitlements').delete().eq('id', insertedId);

    }

  }

&nbsp;

  return {

    journeyId: 'H_PAYMENT_ENROLLMENT',

    journeyName: 'Payment & Enrollment Audit',

    results

  };

}

&nbsp;

**Notes**

&nbsp;

&nbsp;

- I referenced an RPC audit_table_columns for clean schema checks. If you don’t have that, create a tiny SQL function (dev can do in 5 minutes). If you’d rather not add any DB functions, do the schema check via a dedicated view or harden it with a “can we select required columns” approach.
- Replace course_access_snapshots with your actual gating verification mechanism. If none exists, verify by calling the same gating function that the app uses (best).

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**2)**

**generate-compliance-delta**

**edge function (NEW)**

&nbsp;

&nbsp;

&nbsp;

**Purpose**

&nbsp;

&nbsp;

Create a COMAR delta artifact that Louis can review without testing anything.

&nbsp;

&nbsp;

**Inputs (recommended)**

&nbsp;

&nbsp;

- Optional course_id or curriculum_id if multiple programs exist
- Optional includeUnmapped = true
- Optional dryRun = false

&nbsp;

&nbsp;

&nbsp;

**Output**

&nbsp;

&nbsp;

A single JSON object:

{

  "agent": "RVT System Auditor",

  "run_id": "uuid",

  "generated_at": "2026-02-22T...",

  "summary": {

    "pass": 21,

    "gap": 6,

    "unmapped": 4

  },

  "rows": [

    {

      "comar_requirement": "14.17.xx ... ID verification",

      "system_behavior": "Not present",

      "gap_status": "GAP",

      "recommended_fix": "Add attestation/signature step at enrollment",

      "evidence": {

        "module_ids": [],

        "content_ids": ["..."]

      }

    }

  ]

}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**2A) Edge function skeleton —**

**supabase/functions/generate-compliance-delta/index.ts**

&nbsp;

import { serve } from "[https://deno.land/std@0.224.0/http/server.ts](https://deno.land/std@0.224.0/http/server.ts)";

import { createClient } from "[https://esm.sh/@supabase/supabase-js@2](https://esm.sh/@supabase/supabase-js@2)";

&nbsp;

type GapStatus = 'PASS' | 'GAP' | 'UNMAPPED';

&nbsp;

type DeltaRow = {

  comar_requirement: string;     // display string for Louis

  system_behavior: string;       // plain english

  gap_status: GapStatus;

  recommended_fix?: string;

  evidence?: {

    module_ids?: string[];

    module_titles?: string[];

    comar_sections?: string[];

    regulatory_content_ids?: string[];

  };

};

&nbsp;

serve(async (req) => {

  try {

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

&nbsp;

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    const curriculumId = body.curriculum_id ?? null;

    const includeUnmapped = body.includeUnmapped ?? true;

&nbsp;

    // 1) Pull course modules + mappings

    // Adjust fields to your schema:

    // - comar_sections could be string[] or a join table; adapt accordingly.

    const modulesQ = supabase

      .from('course_modules')

      .select('id,title,comar_section,comar_sections,content,active,curriculum_id')

      .eq('active', true);

&nbsp;

    const { data: modules, error: modulesErr } = curriculumId

      ? await modulesQ.eq('curriculum_id', curriculumId)

      : await modulesQ;

&nbsp;

    if (modulesErr) throw modulesErr;

&nbsp;

    // Normalize module -> comar sections array

    const moduleMappings = (modules ?? []).map((m: any) => {

      const sections: string[] =

        Array.isArray(m.comar_sections) ? m.comar_sections :

        typeof m.comar_section === 'string' && m.comar_section ? [m.comar_section] : [];

      return { id: [m.id](http://m.id), title: m.title, sections };

    });

&nbsp;

    const mappedSections = new Set<string>();

    for (const mm of moduleMappings) mm.sections.forEach(s => mappedSections.add(s));

&nbsp;

    // 2) Pull regulatory content (COMAR)

    const { data: regs, error: regsErr } = await supabase

      .from('regulatory_content')

      .select('id,comar_section,title,requirement_text,active')

      .eq('active', true);

&nbsp;

    if (regsErr) throw regsErr;

&nbsp;

    // 3) Cross reference

    // Build: comar_section -> requirements[]

    const bySection = new Map<string, any[]>();

    for (const r of (regs ?? [])) {

      const key = r.comar_section;

      if (!key) continue;

      if (!bySection.has(key)) bySection.set(key, []);

      bySection.get(key)!.push(r);

    }

&nbsp;

    const rows: DeltaRow[] = [];

&nbsp;

    // PASS/GAP for each regulatory requirement

    for (const r of (regs ?? [])) {

      const section = r.comar_section;

      const hasMapping = section && mappedSections.has(section);

      const requirementLabel = section

        ? `${section} — ${r.title ?? 'Requirement'}`

        : `${r.title ?? 'Requirement'}`;

&nbsp;

      if (hasMapping) {

        // Identify which modules map to this section for evidence

        const evidenceModules = moduleMappings.filter(m => m.sections.includes(section));

        rows.push({

          comar_requirement: requirementLabel,

          system_behavior: evidenceModules.length

            ? `Covered in ${evidenceModules.map(m => m.title).slice(0, 2).join(', ')}${evidenceModules.length > 2 ? '…' : ''}`

            : 'Covered in course content',

          gap_status: 'PASS',

          evidence: {

            module_ids: [evidenceModules.map](http://evidenceModules.map)(m => [m.id](http://m.id)),

            module_titles: [evidenceModules.map](http://evidenceModules.map)(m => m.title),

            comar_sections: section ? [section] : [],

            regulatory_content_ids: [[r.id](http://r.id)]

          }

        });

      } else {

        rows.push({

          comar_requirement: requirementLabel,

          system_behavior: 'Not present / not mapped in course modules',

          gap_status: 'GAP',

          recommended_fix: 'Map an existing module or add coverage + mapping for this COMAR section',

          evidence: {

            module_ids: [],

            module_titles: [],

            comar_sections: section ? [section] : [],

            regulatory_content_ids: [[r.id](http://r.id)]

          }

        });

      }

    }

&nbsp;

    // UNMAPPED: modules with no COMAR mapping

    if (includeUnmapped) {

      const unmapped = moduleMappings.filter(m => m.sections.length === 0);

      for (const m of unmapped) {

        rows.push({

          comar_requirement: '(No COMAR mapping)',

          system_behavior: `Module exists but is not mapped: ${m.title}`,

          gap_status: 'UNMAPPED',

          recommended_fix: 'Assign COMAR section mapping or tag as “non-regulatory enrichment”',

          evidence: { module_ids: [[m.id](http://m.id)], module_titles: [m.title], comar_sections: [] }

        });

      }

    }

&nbsp;

    const summary = {

      pass: rows.filter(r => [r.gap](http://r.gap)_status === 'PASS').length,

      gap: rows.filter(r => [r.gap](http://r.gap)_status === 'GAP').length,

      unmapped: rows.filter(r => [r.gap](http://r.gap)_status === 'UNMAPPED').length

    };

&nbsp;

    // 4) Log to ai_agent_runs

    const runPayload = {

      agent_name: 'RVT System Auditor',

      run_type: 'COMAR_DELTA',

      status: [summary.gap](http://summary.gap) > 0 ? 'COMPLETED_WITH_GAPS' : 'COMPLETED',

      meta: { curriculum_id: curriculumId, includeUnmapped },

      output: { summary, rows }

    };

&nbsp;

    await supabase.from('ai_agent_runs').insert(runPayload);

&nbsp;

    return new Response(JSON.stringify({

      agent: 'RVT System Auditor',

      generated_at: new Date().toISOString(),

      summary,

      rows

    }), { status: 200, headers: { "content-type": "application/json" } });

&nbsp;

  } catch (e: any) {

    return new Response(JSON.stringify({

      error: e?.message ?? String(e),

      agent: 'RVT System Auditor'

    }), { status: 500, headers: { "content-type": "application/json" } });

  }

});

&nbsp;

**Why this works with your existing COMAR infrastructure**

&nbsp;

&nbsp;

- It reuses the same sources of truth: course_modules + regulatory_content
- It produces the exact artifact Louis wants: “Requirement | Behavior | Gap?”

&nbsp;

&nbsp;

If you already have detectComplianceGaps service logic you trust, you can call it instead of re-implementing. But the above keeps it deterministic and audit-friendly.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**3) Unified Auditor Dashboard UI —**

**RVTSystemAuditorPanel.tsx**

**(NEW)**

&nbsp;

&nbsp;

&nbsp;

**UX Requirements**

&nbsp;

&nbsp;

- One button: Run Full Audit  

  - Calls run-e2e-validation then generate-compliance-delta
  - Shows progress states + last run time
- &nbsp;
- Top Executive Summary:  

  - X/Y technical checks passed
  - N compliance gaps
  - Release recommendation:  

    - NOT_SHIPPABLE if any Tier 1 blocker fails
    - NEEDS LEGAL REVIEW if technical SHIPPABLE but compliance gaps > 0
    - SHIPPABLE if technical SHIPPABLE and compliance gaps == 0
  - &nbsp;
- &nbsp;
- Tabs:  

  - Technical Report (existing E2E report rendering)
  - Compliance Delta (table view with filters: PASS/GAP/UNMAPPED)
- &nbsp;
- Export:  

  - “Export 1-page PDF” summary  

    - Keep it simple: executive summary + top 10 gaps
    - (Use existing PDF mechanism if your repo already has one; otherwise jspdf)
  - &nbsp;
- &nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**3A) UI skeleton (React) —**

**src/components/admin/RVTSystemAuditorPanel.tsx**

&nbsp;

import React, { useMemo, useState } from "react";

import { supabase } from "@/lib/supabaseClient"; // adjust

import E2EValidationReport from "@/components/admin/E2EValidationReport"; // adjust if named differently

&nbsp;

type ComplianceRow = {

  comar_requirement: string;

  system_behavior: string;

  gap_status: "PASS" | "GAP" | "UNMAPPED";

  recommended_fix?: string;

};

&nbsp;

export default function RVTSystemAuditorPanel() {

  const [running, setRunning] = useState(false);

  const [techReport, setTechReport] = useState<any | null>(null);

  const [compliance, setCompliance] = useState<{ summary: any; rows: ComplianceRow[] } | null>(null);

  const [activeTab, setActiveTab] = useState<"TECH" | "COMPLIANCE">("TECH");

  const [error, setError] = useState<string | null>(null);

&nbsp;

  const execSummary = useMemo(() => {

    const tech = techReport;

    const gaps = compliance?.summary?.gap ?? null;

&nbsp;

    // Example extraction: adapt to your existing report shape

    const totalChecks = tech?.summary?.totalChecks ?? null;

    const passedChecks = tech?.summary?.passedChecks ?? null;

    const tier1Blockers = tech?.summary?.tier1BlockersFailed ?? 0;

    const technicalGate = tech?.releaseGate ?? tech?.summary?.releaseGate ?? null;

&nbsp;

    let recommendation: "NOT_SHIPPABLE" | "NEEDS_LEGAL_REVIEW" | "SHIPPABLE" | "UNKNOWN" = "UNKNOWN";

    if (tier1Blockers > 0 || technicalGate === "NOT_SHIPPABLE") recommendation = "NOT_SHIPPABLE";

    else if ((gaps ?? 0) > 0) recommendation = "NEEDS_LEGAL_REVIEW";

    else if (technicalGate === "SHIPPABLE" && (gaps ?? 0) === 0) recommendation = "SHIPPABLE";

&nbsp;

    return { totalChecks, passedChecks, gaps, recommendation, tier1Blockers, technicalGate };

  }, [techReport, compliance]);

&nbsp;

  async function runFullAudit() {

    setRunning(true);

    setError(null);

&nbsp;

    try {

      // 1) run E2E validator

      const { data: tech, error: techErr } = await supabase.functions.invoke("run-e2e-validation", {

        body: { mode: "FULL", includeReleaseGate: true } // adapt to your function contract

      });

      if (techErr) throw techErr;

      setTechReport(tech);

&nbsp;

      // 2) generate compliance delta

      const { data: comp, error: compErr } = await supabase.functions.invoke("generate-compliance-delta", {

        body: { includeUnmapped: true }

      });

      if (compErr) throw compErr;

      setCompliance(comp);

&nbsp;

      setActiveTab("TECH");

    } catch (e: any) {

      setError(e?.message ?? String(e));

    } finally {

      setRunning(false);

    }

  }

&nbsp;

  return (

    <div className="rounded-2xl border p-4 space-y-4">

      <div className="flex items-start justify-between gap-4">

        <div>

          <h2 className="text-xl font-semibold">RVT System Auditor</h2>

          <p className="text-sm text-muted-foreground">

            Runs full pipeline validation + generates COMAR compliance delta (Louis-ready).

          </p>

        </div>

&nbsp;

        <button

          onClick={runFullAudit}

          disabled={running}

          className="px-4 py-2 rounded-xl border shadow-sm"

          title="Runs run-e2e-validation + generate-compliance-delta"

        >

          {running ? "Running audit..." : "Run Full Audit"}

        </button>

      </div>

&nbsp;

      {/* Executive Summary */}

      <div className="rounded-2xl bg-muted/40 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">

        <div>

          <div className="text-xs text-muted-foreground">Technical Checks</div>

          <div className="text-base font-medium">

            {execSummary.passedChecks ?? "—"} / {execSummary.totalChecks ?? "—"}

          </div>

        </div>

        <div>

          <div className="text-xs text-muted-foreground">Tier 1 Blockers</div>

          <div className="text-base font-medium">{execSummary.tier1Blockers ?? "—"}</div>

        </div>

        <div>

          <div className="text-xs text-muted-foreground">Compliance Gaps</div>

          <div className="text-base font-medium">{execSummary.gaps ?? "—"}</div>

        </div>

        <div>

          <div className="text-xs text-muted-foreground">Release Recommendation</div>

          <div className="text-base font-semibold">{execSummary.recommendation}</div>

        </div>

      </div>

&nbsp;

      {error && (

        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">

          {error}

        </div>

      )}

&nbsp;

      {/* Tabs */}

      <div className="flex gap-2">

        <button

          className=`px-3 py-1 rounded-lg border ${activeTab === "TECH" ? "bg-muted" : ""}`}

          onClick={() => setActiveTab("TECH")}

        >

          Technical Report

        </button>

        <button

          className=`px-3 py-1 rounded-lg border ${activeTab === "COMPLIANCE" ? "bg-muted" : ""}`}

          onClick={() => setActiveTab("COMPLIANCE")}

        >

          Compliance Delta

        </button>

      </div>

&nbsp;

      {/* Tab Content */}

      {activeTab === "TECH" && (

        <div className="rounded-2xl border p-3">

          {techReport ? <E2EValidationReport report={techReport} /> : <div className="text-sm text-muted-foreground">No technical report yet.</div>}

        </div>

      )}

&nbsp;

      {activeTab === "COMPLIANCE" && (

        <div className="rounded-2xl border p-3 space-y-3">

          {!compliance ? (

            <div className="text-sm text-muted-foreground">No compliance delta yet.</div>

          ) : (

            <>

              <div className="text-sm text-muted-foreground">

                PASS: {compliance.summary.pass} · GAP: {[compliance.summary.gap](http://compliance.summary.gap)} · UNMAPPED: {compliance.summary.unmapped}

              </div>

&nbsp;

              <div className="overflow-auto">

                <table className="min-w-full text-sm">

                  <thead>

                    <tr className="text-left border-b">

                      <th className="py-2 pr-3">COMAR Requirement</th>

                      <th className="py-2 pr-3">System Behavior</th>

                      <th className="py-2 pr-3">Gap?</th>

                      <th className="py-2 pr-3">Recommended Fix</th>

                    </tr>

                  </thead>

                  <tbody>

                    {[compliance.rows.map](http://compliance.rows.map)((r, idx) => (

                      <tr key={idx} className="border-b align-top">

                        <td className="py-2 pr-3">{r.comar_requirement}</td>

                        <td className="py-2 pr-3">{r.system_behavior}</td>

                        <td className="py-2 pr-3 font-medium">{[r.gap](http://r.gap)_status}</td>

                        <td className="py-2 pr-3">{r.recommended_fix ?? "—"}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

&nbsp;

              {/* Export placeholder */}

              <div className="flex justify-end">

                <button className="px-3 py-2 rounded-xl border" disabled title="Add jsPDF/export hook">

                  Export 1-page PDF (summary)

                </button>

              </div>

            </>

          )}

        </div>

      )}

    </div>

  );

}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**4) Wiring into Admin Operations**

&nbsp;

&nbsp;

In src/components/admin/operations/TestingTab.tsx (or new “System Audit” tab):

&nbsp;

- Add:  

  - <RVTSystemAuditorPanel />
- &nbsp;
- Place above existing E2E report so it becomes the primary action

&nbsp;

&nbsp;

Minimal patch pattern:

import RVTSystemAuditorPanel from "@/components/admin/RVTSystemAuditorPanel";

&nbsp;

// inside TestingTab render

<RVTSystemAuditorPanel />

{/* existing content below */}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**5)**

**supabase/config.toml**

**add function config**

&nbsp;

&nbsp;

Add the new function:

[functions.generate-compliance-delta]

verify_jwt = true

&nbsp;

- If this is strictly admin-only, keep verify_jwt = true and enforce admin role inside the function (recommended).
- If you already have a pattern using RLS + service role key, keep service role but still check user_roles from the JWT subject (belt and suspenders).

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**6) Release recommendation rules (so it’s consistent)**

&nbsp;

&nbsp;

Implement the exact release logic in the panel (and optionally in a small shared helper):

&nbsp;

1. If any Tier 1 blocker fails → NOT_SHIPPABLE
2. Else if technical gate is SHIPPABLE but compliance gaps > 0 → NEEDS LEGAL REVIEW
3. Else → SHIPPABLE

&nbsp;

&nbsp;

This is what keeps Danielle out of the weeds while still honoring Louis’ compliance responsibility.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**7) Acceptance criteria (dev-ready checklist)**

&nbsp;

&nbsp;

&nbsp;

**Journey H**

&nbsp;

&nbsp;

- Journey H appears in E2E report UI with Tier 1 badge
- Webhook endpoint test returns PASS on 401/403/405 or 2xx
- Entitlements schema check fails loudly if required columns missing
- Test entitlement insertion succeeds and is cleaned up
- Gating verification proves user now has access
- Duplicate entitlement attempt is prevented and logged as PASS

&nbsp;

&nbsp;

&nbsp;

**Compliance Delta**

&nbsp;

&nbsp;

- Function returns summary + rows
- Rows include PASS / GAP / UNMAPPED
- Evidence includes module IDs/titles for PASS rows
- Logs to ai_agent_runs with agent_name "RVT System Auditor"

&nbsp;

&nbsp;

&nbsp;

**Unified Panel**

&nbsp;

&nbsp;

- “Run Full Audit” triggers both functions sequentially
- Executive summary shows checks, gaps, and recommendation
- Technical tab renders existing E2EValidationReport
- Compliance tab renders the delta table exactly in Louis-friendly format

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Optional (but high leverage): Make Louis’ table exportable**

&nbsp;

&nbsp;

If you want the lowest friction for Louis, add:

&nbsp;

- CSV export for the Compliance Delta tab (super easy)
- PDF export for exec summary (nice-to-have)

&nbsp;

&nbsp;

CSV export can be done without any new libs.

&nbsp;

&nbsp;

&nbsp;

If you want, paste the existing run-e2e-validation report schema (the top-level JSON keys) and I’ll align Journey H’s result object to match it exactly so the dev doesn’t have to guess where it plugs in.Confirm with 