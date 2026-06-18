import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Download, Play, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRunAudit, type ReadinessSnapshot } from "@/hooks/useLaunchReadiness";
import {
  generateReadinessMarkdown,
  downloadReadinessReport,
  type PipelineHarnessSummary,
} from "@/lib/launchReadinessReport";
import { PipelineTestHarness } from "@/components/admin/PipelineTestHarness";

interface Props {
  snapshot: ReadinessSnapshot | undefined;
  refetchSnapshot: () => void;
}

type StepStatus = "idle" | "running" | "success" | "failure";

interface StepState {
  status: StepStatus;
  ranAt: string | null;
  detail: string;
}

const initial: StepState = { status: "idle", ranAt: null, detail: "" };

export const E2EReadinessChecklist: React.FC<Props> = ({ snapshot, refetchSnapshot }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const runAudit = useRunAudit();
  const [pipeline, setPipeline] = useState<StepState>(initial);
  const [showHarness, setShowHarness] = useState(false);
  const [crawler, setCrawler] = useState<StepState>(initial);
  const [refreshState, setRefresh] = useState<StepState>(initial);

  const trustOk = snapshot?.trust_check === "ok";
  const lastBatchPass = snapshot?.last_batch?.rollup_status === "pass";
  const pipelineOk = pipeline.status === "success";
  const overallGo = trustOk && lastBatchPass && pipelineOk && (snapshot?.duplicate_videos ?? 0) === 0;

  const handleRunCrawler = () => {
    setCrawler({ status: "running", ranAt: null, detail: "Invoking launch-audit-crawler…" });
    runAudit.mutate(undefined, {
      onSuccess: (d: { results?: unknown[] }) => {
        setCrawler({
          status: "success",
          ranAt: new Date().toISOString(),
          detail: `${d.results?.length ?? 0} routes audited`,
        });
        toast({ title: "Firecrawl audit complete" });
      },
      onError: (e: Error) => {
        setCrawler({ status: "failure", ranAt: new Date().toISOString(), detail: e?.message ?? String(e) });
        toast({ title: "Firecrawl audit failed", description: e?.message, variant: "destructive" });
      },
    });
  };

  const handleRefresh = async () => {
    setRefresh({ status: "running", ranAt: null, detail: "Re-running readiness query…" });
    try {
      await qc.invalidateQueries({ queryKey: ["launch-readiness"] });
      refetchSnapshot();
      setRefresh({ status: "success", ranAt: new Date().toISOString(), detail: "Snapshot refreshed" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRefresh({ status: "failure", ranAt: new Date().toISOString(), detail: msg });
    }
  };

  const handleDownload = () => {
    if (!snapshot) {
      toast({ title: "No snapshot loaded yet", variant: "destructive" });
      return;
    }
    const summary: PipelineHarnessSummary = {
      ran_at: pipeline.ranAt,
      status: pipeline.status === "success" ? "success" : pipeline.status === "failure" ? "failure" : "not_run",
      step_count: 0,
      failures: pipeline.status === "failure" ? [{ step: "harness", message: pipeline.detail }] : [],
    };
    const md = generateReadinessMarkdown(snapshot, summary);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadReadinessReport(md, `e2e_readiness_run_${stamp}.md`);
    toast({ title: "Evidence file downloaded" });
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Run E2E Readiness</CardTitle>
            <CardDescription className="text-xs">
              Six admin-gated steps. Service-role callers are intentionally rejected by the crawler and harness — they
              must be triggered here.
            </CardDescription>
          </div>
          <Badge
            className={
              overallGo
                ? "bg-green-600 hover:bg-green-600 text-white"
                : "bg-amber-500 hover:bg-amber-500 text-white"
            }
          >
            Overall: {overallGo ? "GO" : "NO-GO"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Step
          n={1}
          label="Run Firecrawl crawler"
          state={crawler}
          action={
            <Button size="sm" onClick={handleRunCrawler} disabled={runAudit.isPending}>
              {runAudit.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
              Run
            </Button>
          }
        />
        <Step
          n={2}
          label="Run pipeline harness"
          state={pipeline}
          action={
            <Button size="sm" variant="outline" onClick={() => setShowHarness((v) => !v)}>
              {showHarness ? "Hide" : "Open"} harness
            </Button>
          }
        />
        {showHarness && (
          <div className="ml-8 border-l-2 pl-3 my-2">
            <PipelineTestHarness />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setPipeline({ status: "success", ranAt: new Date().toISOString(), detail: "Marked passing" })
                }
              >
                Mark as passing
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  setPipeline({ status: "failure", ranAt: new Date().toISOString(), detail: "Marked failing" })
                }
              >
                Mark as failing
              </Button>
            </div>
          </div>
        )}
        <Step
          n={3}
          label={`Refresh module/video mapping (real ${snapshot?.unmapped_modules ?? "?"}, exclusions ${
            snapshot?.accepted_exclusions ?? "?"
          }, orphans ${snapshot?.orphan_video_assets ?? "?"})`}
          state={refreshState}
          action={
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          }
        />
        <Step
          n={4}
          label="Re-run E2E readiness query"
          state={refreshState}
          action={
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3 mr-1" /> Re-run
            </Button>
          }
        />
        <Step
          n={5}
          label="Save evidence file"
          state={{ status: "idle", ranAt: null, detail: "Generates markdown from current snapshot" }}
          action={
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-3 w-3 mr-1" /> Download
            </Button>
          }
        />
        <Step
          n={6}
          label="GO / NO-GO"
          state={{
            status: overallGo ? "success" : "failure",
            ranAt: snapshot?.generated_at ?? null,
            detail: overallGo
              ? "All checks green"
              : `Pending: ${!trustOk ? "data trust" : ""} ${!lastBatchPass ? "crawler" : ""} ${!pipelineOk ? "pipeline" : ""}`.trim(),
          }}
          action={null}
        />
      </CardContent>
    </Card>
  );
};

const Step: React.FC<{ n: number; label: string; state: StepState; action: React.ReactNode }> = ({
  n,
  label,
  state,
  action,
}) => {
  const icon =
    state.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> :
    state.status === "success" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
    state.status === "failure" ? <XCircle className="h-4 w-4 text-red-600" /> :
    <span className="h-4 w-4 rounded-full border border-muted-foreground/40 inline-block" />;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-muted-foreground w-4">{n}.</span>
        {icon}
        <div className="min-w-0">
          <div className="text-sm truncate">{label}</div>
          {state.detail && <div className="text-xs text-muted-foreground truncate">{state.detail}</div>}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
};
