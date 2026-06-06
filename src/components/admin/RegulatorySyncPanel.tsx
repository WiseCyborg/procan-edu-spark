import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MonitorPayload {
  success: boolean;
  lastRun: { executedAt: string; status: string; executionTimeMs: number; payload: unknown } | null;
  lastRunSuccess: boolean;
  lastSuccessfulScrape: string | null;
  lastSuccessfulScrapeStatus: string | null;
  dataAgeHours: number | null;
  staleWarning: boolean;
  staleThresholdHours: number;
  freshestSection: string | null;
  recentErrors: Array<{
    id: string;
    section_number: string;
    new_content: string;
    detected_at: string;
    review_status: string;
  }>;
}

export const RegulatorySyncPanel = () => {
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeError } = await supabase.functions.invoke("monitor-comar-updates");
      if (invokeError) throw invokeError;
      setData(res as MonitorPayload);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" /> Regulatory Sync (COMAR + Federal)
        </CardTitle>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Could not load sync status</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data?.staleWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Regulatory content stale</AlertTitle>
            <AlertDescription>
              Content has not refreshed in over {data.staleThresholdHours}h (one missed daily cycle).
              {" "}Last successful scrape: <strong>{fmt(data.lastSuccessfulScrape)}</strong>.
            </AlertDescription>
          </Alert>
        )}

        {data && !data.staleWarning && data.lastRun && !data.lastRunSuccess && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Last scrape run had errors</AlertTitle>
            <AlertDescription>
              Status: <strong>{data.lastRun.status}</strong>. Content is still fresh (within {data.staleThresholdHours}h),
              but review recent error rows below.
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Last run" value={fmt(data.lastRun?.executedAt ?? null)}
              badge={data.lastRun ? <StatusBadge status={data.lastRun.status} /> : null} />
            <Stat label="Last successful scrape" value={fmt(data.lastSuccessfulScrape)} />
            <Stat label="Content age" value={data.dataAgeHours === null ? "—" : `${data.dataAgeHours.toFixed(1)} h`}
              badge={
                data.staleWarning
                  ? <Badge variant="destructive">stale</Badge>
                  : <Badge variant="secondary" className="bg-green-500/15 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />fresh</Badge>
              } />
            <Stat label="Freshest section" value={data.freshestSection ?? "—"} />
          </div>
        )}

        {data && data.recentErrors.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Recent scraper errors ({data.recentErrors.length})
            </p>
            <ul className="space-y-1 text-xs max-h-40 overflow-auto">
              {data.recentErrors.map((e) => (
                <li key={e.id} className="border-l-2 border-destructive pl-2">
                  <div className="font-mono">{e.section_number}</div>
                  <div className="text-muted-foreground">{fmt(e.detected_at)}</div>
                  <div className="text-destructive truncate">{e.new_content.slice(0, 160)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, badge }: { label: string; value: string; badge?: React.ReactNode }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="flex items-center gap-2">
      <div className="font-medium">{value}</div>
      {badge}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "success") return <Badge className="bg-green-500/15 text-green-700">success</Badge>;
  if (status === "partial") return <Badge className="bg-amber-500/15 text-amber-700">partial</Badge>;
  return <Badge variant="destructive">{status}</Badge>;
};
