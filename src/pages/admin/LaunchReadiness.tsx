import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Info,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import {
  useReadinessSnapshot,
  useAuditRuns,
  useRunAudit,
  CHECK_DESCRIPTIONS,
  NOT_CHECKED,
  type AuditRunRow,
} from "@/hooks/useLaunchReadiness";
import { E2EReadinessChecklist } from "@/components/admin/E2EReadinessChecklist";

const lightFor = (ok: boolean) =>
  ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;

const RollupPill: React.FC<{ rollup: AuditRunRow["rollup_status"] }> = ({ rollup }) => {
  if (rollup === "pass") return <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px]">PASS</Badge>;
  if (rollup === "warn") return <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px]">WARN</Badge>;
  if (rollup === "fail") return <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px]">FAIL</Badge>;
  return <Badge variant="outline" className="text-[10px]">—</Badge>;
};

const FindingsCell: React.FC<{ row: AuditRunRow }> = ({ row }) => {
  const f = row.findings ?? {};
  const items: Array<[string, unknown]> = Object.entries(f);
  const failedNames = new Set((row.failed_checks ?? []).map((fc) => fc.check));
  if (!items.length) return <span className="text-xs text-muted-foreground">no findings</span>;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap gap-1">
        {items.map(([k, v]) => {
          const desc = CHECK_DESCRIPTIONS[k];
          const isFailed = failedNames.has(k);
          const badge = (
            <Badge
              variant="outline"
              className={`text-[10px] cursor-help ${isFailed ? "border-red-500 text-red-700 dark:text-red-300" : ""}`}
            >
              {k}: {String(v)}
            </Badge>
          );
          if (!desc) return <span key={k}>{badge}</span>;
          return (
            <Tooltip key={k}>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{desc}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

const LaunchReadiness: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const snapshot = useReadinessSnapshot(!!isAdmin);
  const runs = useAuditRuns(!!isAdmin);
  const runAudit = useRunAudit();

  if (roleLoading) return <div className="p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card><CardContent className="p-6">Admin access required.</CardContent></Card>
      </div>
    );
  }

  const s = snapshot.data;
  const probe = s?.welcome_intro_probe;
  const lastBatch = s?.last_batch;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
          </Link>
          <h1 className="text-2xl font-semibold">Launch Readiness</h1>
          <p className="text-sm text-muted-foreground">
            Firecrawl-driven preview audits + Supabase data integrity checks.{" "}
            <a
              href="https://github.com/"
              onClick={(e) => { e.preventDefault(); window.open("/docs/audit/2026-07/evidence/e2e_readiness_run_2026-06-18.md", "_blank"); }}
              className="text-primary hover:underline inline-flex items-center"
            >
              Latest evidence report <ExternalLink className="h-3 w-3 ml-0.5" />
            </a>
          </p>

        </div>
        <Button
          onClick={() =>
            runAudit.mutate(undefined, {
              onSuccess: (d: any) => toast({ title: "Audit complete", description: `${d.results?.length ?? 0} entries written.` }),
              onError: (e: any) => toast({ title: "Audit failed", description: e?.message ?? String(e), variant: "destructive" }),
            })
          }
          disabled={runAudit.isPending}
        >
          {runAudit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run Firecrawl Audit
        </Button>
      </div>

      <E2EReadinessChecklist snapshot={s} refetchSnapshot={() => snapshot.refetch()} />

      {/* Blind-spot disclosures */}

      <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600" /> What this dashboard does NOT check
          </CardTitle>
          <CardDescription className="text-xs">
            Green here means "the checks below passed", not "the app is ready to ship". Read this list before treating
            any pass as a go/no-go signal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
            {NOT_CHECKED.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Integrity Snapshot</CardTitle>
          <CardDescription>
            From <code>get_launch_readiness()</code>. Last audit run:{" "}
            {s?.last_audit_run_at ? new Date(s.last_audit_run_at).toLocaleString() : "never"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : snapshot.error ? (
            <div className="text-sm text-destructive">
              <AlertTriangle className="inline h-4 w-4 mr-1" /> {(snapshot.error as Error).message}
            </div>
          ) : s ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Active Courses" value={s.total_active_courses} />
                <Stat label="Active Modules" value={s.total_active_modules} />
                <Stat label="Active Videos" value={s.total_active_videos} />
                <WelcomeIntroStat
                  dbPresent={s.welcome_intro_db_row_present}
                  probe={probe ?? null}
                />
                <Stat
                  label={`Unmapped Modules${s.unmapped_modules_hardened ? " (real)" : ""}`}
                  value={s.unmapped_modules}
                  warn={s.unmapped_modules > 0}
                  hint={s.unmapped_breakdown
                    ? `Real unresolved — null/empty: ${s.unmapped_breakdown.null_or_empty}, placeholder: ${s.unmapped_breakdown.placeholder}, bad format: ${s.unmapped_breakdown.bad_format}. Accepted exclusions: ${s.accepted_exclusions ?? 0} (null/empty ${s.exclusions_breakdown?.null_or_empty ?? 0}, placeholder ${s.exclusions_breakdown?.placeholder ?? 0}, bad format ${s.exclusions_breakdown?.bad_format ?? 0}).`
                    : "Counts NULL/empty video_url only."}
                />
                <Stat
                  label="Accepted Exclusions"
                  value={s.accepted_exclusions ?? 0}
                  hint="Modules with a documented unmapped_reason — intentional gaps not counted as failures."
                />
                <Stat label="Duplicate Video URLs" value={s.duplicate_videos} warn={s.duplicate_videos > 0} />
                <Stat label="Orphan Video Assets" value={s.orphan_video_assets} warn={s.orphan_video_assets > 4} />
                <BatchRollupStat batch={lastBatch ?? null} />
              </div>

              {s.trust_check && s.trust_check !== "ok" && (
                <div className={`mt-4 rounded-md border p-3 text-xs ${
                  s.trust_check === "suspicious_zero"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200"
                    : "border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
                }`}>
                  <strong>Trust check: {s.trust_check.replace("_", " ")}.</strong>{" "}
                  {s.trust_check === "suspicious_zero"
                    ? "RPC returned 0 real-unmapped AND 0 accepted exclusions — the query is probably wrong."
                    : `Real unmapped (${s.unmapped_modules}) is outside the documented baseline of ${s.trust_baseline?.min}–${s.trust_baseline?.max}. ${s.trust_baseline?.note ?? ""}`}

                </div>
              )}

            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Runs</CardTitle>
          <CardDescription>
            Most recent 50 entries. Rollup is computed from per-route required checks; HTTP 2xx alone is not a pass.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : !runs.data || runs.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit runs yet. Click "Run Firecrawl Audit" to start.</p>
          ) : (
            <div className="space-y-2">
              {runs.data.map((row) => (
                <div key={row.id} className="border rounded-md p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <RollupPill rollup={row.rollup_status} />
                      <code className="font-mono truncate">{row.route}</code>
                      <Badge variant="secondary" className="text-[10px]">HTTP {row.http_status ?? "—"}</Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleTimeString()}</span>
                      {row.screenshot_path && (
                        <a href={row.screenshot_path} target="_blank" rel="noreferrer"
                          className="text-xs inline-flex items-center text-primary hover:underline">
                          screenshot <ExternalLink className="h-3 w-3 ml-0.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  {row.failed_checks && row.failed_checks.length > 0 && (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                      <strong>Failures:</strong>{" "}
                      {row.failed_checks.map((fc, i) => (
                        <span key={i} className="mr-2">
                          <code>{fc.check}</code> — {fc.reason}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2"><FindingsCell row={row} /></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  warn?: boolean;
  icon?: React.ReactNode;
  hint?: string;
}> = ({ label, value, warn, icon, hint }) => (
  <div className={`rounded-md border p-3 ${warn ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : ""}`}>
    <div className="text-xs text-muted-foreground flex items-center gap-1">
      {icon}{label}
      {hint && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <div className="text-lg font-semibold mt-1">{value}</div>
  </div>
);

const WelcomeIntroStat: React.FC<{
  dbPresent: boolean;
  probe: import("@/hooks/useLaunchReadiness").WelcomeIntroProbe | null;
}> = ({ dbPresent, probe }) => {
  let state: "green" | "amber" | "red" = "red";
  let label = "Missing";
  if (!dbPresent) {
    state = "red"; label = "DB row missing";
  } else if (!probe) {
    state = "amber"; label = "Row OK, never probed";
  } else if (probe.ok) {
    state = "green"; label = `Probe ${probe.http_status} (${probe.latency_ms}ms)`;
  } else {
    state = "red"; label = `Probe ${probe.http_status ?? probe.error_code ?? "failed"}`;
  }
  const icon =
    state === "green" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
    state === "amber" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> :
    <XCircle className="h-4 w-4 text-red-600" />;
  const hint = probe?.resolved_url
    ? `${probe.method ?? "HEAD"} ${probe.resolved_url} → ${probe.http_status ?? "?"} (${probe.content_type ?? "no type"})`
    : "No probe has been run yet. Click 'Run Firecrawl Audit' to probe the welcome-intro asset.";
  return (
    <Stat label="Welcome Intro" icon={icon} value={label} hint={hint} warn={state !== "green"} />
  );
};

const BatchRollupStat: React.FC<{ batch: import("@/hooks/useLaunchReadiness").LastBatchRollup | null }> = ({ batch }) => {
  if (!batch) return <Stat label="Last Audit Rollup" value="No runs yet" warn />;
  const warn = batch.rollup_status !== "pass";
  return (
    <Stat
      label="Last Audit Rollup"
      value={
        <span>
          <span className="uppercase">{batch.rollup_status}</span>{" "}
          <span className="text-xs text-muted-foreground">
            {batch.pass_count}/{batch.total_routes} pass · {batch.warn_count} warn · {batch.fail_count} fail
          </span>
        </span>
      }
      warn={warn}
      hint={`Batch ${batch.run_batch.slice(0, 8)} — started ${new Date(batch.started_at).toLocaleString()}`}
    />
  );
};

export default LaunchReadiness;
