import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import {
  useReadinessSnapshot,
  useAuditRuns,
  useRunAudit,
  type AuditRunRow,
} from "@/hooks/useLaunchReadiness";

const lightFor = (ok: boolean) =>
  ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;

const FindingsCell: React.FC<{ row: AuditRunRow }> = ({ row }) => {
  const f = row.findings ?? {};
  const items: Array<[string, unknown]> = Object.entries(f);
  if (!items.length) return <span className="text-xs text-muted-foreground">no findings</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(([k, v]) => (
        <Badge key={k} variant="outline" className="text-[10px]">
          {k}: {String(v)}
        </Badge>
      ))}
    </div>
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
          </Link>
          <h1 className="text-2xl font-semibold">Launch Readiness</h1>
          <p className="text-sm text-muted-foreground">
            Firecrawl-driven preview audits + Supabase data integrity checks.
          </p>
        </div>
        <Button
          onClick={() =>
            runAudit.mutate(undefined, {
              onSuccess: (d: any) => toast({ title: "Audit complete", description: `${d.results?.length ?? 0} routes scanned.` }),
              onError: (e: any) => toast({ title: "Audit failed", description: e?.message ?? String(e), variant: "destructive" }),
            })
          }
          disabled={runAudit.isPending}
        >
          {runAudit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run Firecrawl Audit
        </Button>
      </div>

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Active Courses" value={s.total_active_courses} />
              <Stat label="Active Modules" value={s.total_active_modules} />
              <Stat label="Active Videos" value={s.total_active_videos} />
              <Stat label="Welcome Intro" icon={lightFor(s.welcome_intro_resolved)} value={s.welcome_intro_resolved ? "Resolved" : "Missing"} />
              <Stat label="Unmapped Modules" value={s.unmapped_modules} warn={s.unmapped_modules > 0} />
              <Stat label="Duplicate Video URLs" value={s.duplicate_videos} warn={s.duplicate_videos > 0} />
              <Stat label="Orphan Video Assets" value={s.orphan_video_assets} warn={s.orphan_video_assets > 0} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Runs</CardTitle>
          <CardDescription>Most recent 50 routes scanned by Firecrawl.</CardDescription>
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
                      {lightFor(row.status === "ok")}
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

const Stat: React.FC<{ label: string; value: React.ReactNode; warn?: boolean; icon?: React.ReactNode }> = ({
  label, value, warn, icon,
}) => (
  <div className={`rounded-md border p-3 ${warn ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : ""}`}>
    <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
    <div className="text-lg font-semibold mt-1">{value}</div>
  </div>
);

export default LaunchReadiness;
