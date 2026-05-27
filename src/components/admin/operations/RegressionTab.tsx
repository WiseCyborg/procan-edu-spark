import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, PlayCircle, FileText, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RegressionRun {
  id: string;
  migration_version: string;
  triggered_by: string;
  status: string;
  verdict: string | null;
  deterministic: boolean | null;
  report_path: string | null;
  duration_ms: number | null;
  created_at: string;
  run1_summary: any;
  run2_summary: any;
  error: string | null;
}

export function RegressionTab() {
  const [runs, setRuns] = useState<RegressionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any).from("regression_runs").select("*").order("created_at", { ascending: false }).limit(25);
    setRuns((data as RegressionRun[]) ?? []);
    const { data: settings } = await (supabase as any).from("regression_settings").select("auto_enabled").eq("id", 1).maybeSingle();
    if (settings) setAutoEnabled(settings.auto_enabled);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("regression-runs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "regression_runs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const triggerRun = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("post-migration-regression", {
        body: { triggered_by: "manual", migration_version: `manual-${Date.now()}` },
      });
      if (error) throw error;
      toast.success(`Regression complete: ${(data as any)?.verdict ?? "ok"}`);
      load();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const toggleAuto = async (enabled: boolean) => {
    setAutoEnabled(enabled);
    const { error } = await (supabase as any).from("regression_settings").update({ auto_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) toast.error(error.message); else toast.success(`Auto-regression ${enabled ? "enabled" : "disabled"}`);
  };

  const openReport = async (path: string) => {
    const { data, error } = await (supabase as any).storage.from("regression-reports").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { toast.error("Could not generate report link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const verdictColor = (v: string | null) => v === "SHIPPABLE" ? "default" : v === "DEGRADED" ? "secondary" : v === "BLOCKED" ? "destructive" : "outline";

  return (
    <div className="space-y-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Post-Migration Regression</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="auto" checked={autoEnabled} onCheckedChange={toggleAuto} />
                <Label htmlFor="auto" className="text-sm font-normal">Auto-run after migrations</Label>
              </div>
              <Button onClick={triggerRun} disabled={triggering} size="sm">
                {triggering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                Run now
              </Button>
              <Button onClick={load} size="sm" variant="outline"><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No regression runs yet. The watcher fires automatically within a minute of a new migration, or click "Run now".</p>
          ) : (
            <div className="space-y-2">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded truncate">{r.migration_version}</code>
                      <Badge variant="outline" className="text-xs">{r.triggered_by}</Badge>
                      {r.status === "running" && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />running</Badge>}
                      {r.verdict && <Badge variant={verdictColor(r.verdict) as any}>{r.verdict}</Badge>}
                      {r.deterministic !== null && (
                        <Badge variant={r.deterministic ? "default" : "destructive"} className="text-xs">
                          {r.deterministic ? "deterministic" : "non-deterministic"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      {r.run1_summary && ` · Run1: ${r.run1_summary.passed}/${r.run1_summary.total}`}
                      {r.run2_summary && ` · Run2: ${r.run2_summary.passed}/${r.run2_summary.total}`}
                      {r.duration_ms && ` · ${(r.duration_ms / 1000).toFixed(1)}s`}
                    </div>
                    {r.error && <div className="text-xs text-destructive mt-1">{r.error}</div>}
                  </div>
                  {r.report_path && (
                    <Button size="sm" variant="ghost" onClick={() => openReport(r.report_path!)}>
                      <FileText className="h-4 w-4 mr-1" />Report
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
