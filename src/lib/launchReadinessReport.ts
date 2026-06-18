import type { ReadinessSnapshot } from "@/hooks/useLaunchReadiness";

export interface PipelineHarnessSummary {
  ran_at: string | null;
  status: "success" | "failure" | "not_run";
  step_count: number;
  failures: Array<{ step: string; message: string }>;
}

export function generateReadinessMarkdown(
  snapshot: ReadinessSnapshot,
  pipeline: PipelineHarnessSummary,
): string {
  const now = new Date().toISOString().slice(0, 10);
  const b = snapshot.unmapped_breakdown;
  const eb = snapshot.exclusions_breakdown;
  const ex = snapshot.exclusion_rows ?? [];
  const lb = snapshot.last_batch;
  const trust = snapshot.trust_check ?? "unknown";
  const goNoGo =
    trust === "ok" &&
    lb?.rollup_status === "pass" &&
    pipeline.status === "success" &&
    snapshot.duplicate_videos === 0
      ? "GO"
      : "NO-GO";

  const exclusionsTable = ex.length
    ? ex
        .map(
          (r) =>
            `| ${r.course ?? "—"} | ${r.module_number ?? "—"} | ${r.title} | \`${r.reason}\` |`,
        )
        .join("\n")
    : "_(none)_";

  return `# End-to-End Launch Readiness Run — ${now}

**Generated:** ${snapshot.generated_at}
**Result:** **${goNoGo}**

## 1. Data Integrity Snapshot

| Metric | Value | Status |
| --- | --- | --- |
| Active courses | ${snapshot.total_active_courses} | — |
| Active modules | ${snapshot.total_active_modules} | — |
| Active videos | ${snapshot.total_active_videos} | — |
| Orphan video assets | ${snapshot.orphan_video_assets} | ${snapshot.orphan_video_assets <= 4 ? "✅" : "⚠️"} |
| Duplicate video URLs | ${snapshot.duplicate_videos} | ${snapshot.duplicate_videos === 0 ? "✅" : "🔴"} |
| Unmapped modules (real) | ${snapshot.unmapped_modules} | ${trust === "ok" ? "✅" : "🔴"} |
| Accepted exclusions | ${snapshot.accepted_exclusions ?? 0} | documented |
| Trust check | \`${trust}\` | ${trust === "ok" ? "✅" : "⚠️"} |

### Unmapped breakdown (real, unresolved)

- null/empty: ${b?.null_or_empty ?? 0}
- placeholder: ${b?.placeholder ?? 0}
- bad_format: ${b?.bad_format ?? 0}

### Accepted-exclusion breakdown

- null/empty: ${eb?.null_or_empty ?? 0}
- placeholder: ${eb?.placeholder ?? 0}
- bad_format: ${eb?.bad_format ?? 0}

### Accepted-exclusion rows

| Course | # | Module | Reason |
| --- | --- | --- | --- |
${exclusionsTable}

## 2. Firecrawl Route Audit

${
  lb
    ? `Batch \`${lb.run_batch}\` — started ${lb.started_at}, ended ${lb.ended_at}.
Rollup: **${lb.rollup_status.toUpperCase()}** (${lb.pass_count}/${lb.total_routes} pass, ${lb.warn_count} warn, ${lb.fail_count} fail).
Welcome-intro probe: ${lb.welcome_intro_probe?.ok ? `✅ ${lb.welcome_intro_probe.http_status}` : `⚠️ ${lb.welcome_intro_probe?.error_code ?? "not run"}`}.`
    : "**Status: not run in this batch.** Trigger from the admin checklist."
}

## 3. Pipeline Smoke Test

- Status: **${pipeline.status}**
- Last run: ${pipeline.ran_at ?? "never"}
- Steps: ${pipeline.step_count}
- Failures: ${pipeline.failures.length ? pipeline.failures.map((f) => `\`${f.step}\` — ${f.message}`).join("; ") : "none"}

## 4. Go / No-Go

| Area | Status | Rationale |
| --- | --- | --- |
| Data integrity | ${trust === "ok" ? "✅ GO" : "🔴 NO-GO"} | unmapped=${snapshot.unmapped_modules}, exclusions=${snapshot.accepted_exclusions ?? 0}, orphans=${snapshot.orphan_video_assets} |
| Firecrawl route audit | ${lb?.rollup_status === "pass" ? "✅ GO" : "⚠️ NO-GO"} | rollup=${lb?.rollup_status ?? "not_run"} |
| Pipeline harness | ${pipeline.status === "success" ? "✅ GO" : "⚠️ NO-GO"} | ${pipeline.status} |
| **Overall** | **${goNoGo}** | — |

## 5. Blind-spot disclosures

- Firecrawl reads the DOM only. Visual clipping is invisible.
- "Vimeo iframe present" is a substring match — playback is not verified.
- Lazy-loaded content past the 1500ms waitFor window is invisible.
- The hardened predicate flags structural shape only; deleted Vimeo asset URLs matching the regex are not caught here.
`;
}

export function downloadReadinessReport(markdown: string, filename = "e2e_readiness_run.md"): void {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
