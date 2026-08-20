import { useEffect, useMemo, useState } from 'react';
import { useComprehensiveHealth } from '@/hooks/useComprehensiveHealth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Download, AlertCircle, CheckCircle2, AlertTriangle, HelpCircle, MinusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Conservative health reporting.
 *
 * A check only counts toward the score when it actually ran AND proved healthy.
 * Missing, zero-sample, stale, hardcoded/unsupported and errored inputs are
 * surfaced as "Not instrumented", "Unknown" or "Needs attention" and are
 * EXCLUDED from the score rather than inflating it to 100.
 */
type Verdict = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'not_instrumented';

interface ComponentAssessment {
  key: string;
  verdict: Verdict;
  /** null when the check produced no verifiable measurement */
  health: number | null;
  reason: string;
  raw: Record<string, unknown>;
}

const STALE_MS = 24 * 60 * 60 * 1000;

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

function assess(key: string, raw: Record<string, unknown>): ComponentAssessment {
  const status = typeof raw?.status === 'string' ? raw.status : undefined;
  const health = num(raw?.health);

  const notInstrumented = (reason: string): ComponentAssessment => ({
    key, verdict: 'not_instrumented', health: null, reason, raw,
  });
  const unknown = (reason: string): ComponentAssessment => ({
    key, verdict: 'unknown', health: null, reason, raw,
  });

  if (!raw || typeof raw !== 'object') return unknown('No data returned for this check.');
  if (status === 'unknown' || health === null) return unknown('The check did not return a usable measurement.');
  if (status === 'error' || typeof raw.error === 'string') return { key, verdict: 'unhealthy', health, reason: 'The check reported an error.', raw };

  // Zero-sample checks: nothing was observed, so nothing was proven.
  const sampleFields: Record<string, string> = {
    email: 'total_24h',
    certificates: 'generated_24h',
    payments: 'processed_24h',
    functions: 'total',
  };
  const sampleField = sampleFields[key];
  if (sampleField) {
    const sample = num(raw[sampleField]);
    if (sample === null) return notInstrumented('No sample count reported, so the result cannot be verified.');
    if (sample === 0) {
      return notInstrumented(
        key === 'functions'
          ? 'No deployed functions were reported by the status table — coverage is missing, not healthy.'
          : 'No activity was observed in the sample window, so nothing was verified.',
      );
    }
  }

  // The payments check reports a hardcoded 100 with no success/failure signal.
  if (key === 'payments' && raw.success_rate === undefined && raw.failed === undefined) {
    return notInstrumented('This check counts activity only; it does not verify payment success or failure.');
  }

  // Stale measurement.
  const checkedAt = typeof raw.last_check === 'string' ? Date.parse(raw.last_check) : NaN;
  if (Number.isFinite(checkedAt) && Date.now() - checkedAt > STALE_MS) {
    return unknown('The underlying data is more than 24 hours old.');
  }

  if (health >= 95 && (status === 'healthy' || status === undefined)) {
    return { key, verdict: 'healthy', health, reason: 'Check ran and passed.', raw };
  }
  if (health >= 70) {
    return { key, verdict: 'degraded', health, reason: 'Check ran and reported degradation.', raw };
  }
  return { key, verdict: 'unhealthy', health, reason: 'Check ran and reported failures.', raw };
}

const VERDICT_LABEL: Record<Verdict, string> = {
  healthy: 'Healthy',
  degraded: 'Needs attention',
  unhealthy: 'Needs attention',
  unknown: 'Unknown',
  not_instrumented: 'Not instrumented',
};

function verdictIcon(v: Verdict) {
  if (v === 'healthy') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (v === 'degraded') return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  if (v === 'unhealthy') return <AlertCircle className="h-5 w-5 text-red-600" />;
  if (v === 'unknown') return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
  return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
}

function verdictBadge(v: Verdict) {
  if (v === 'healthy') return <Badge className="bg-green-600">Healthy</Badge>;
  if (v === 'degraded') return <Badge className="bg-yellow-600">Needs attention</Badge>;
  if (v === 'unhealthy') return <Badge variant="destructive">Needs attention</Badge>;
  return <Badge variant="outline">{VERDICT_LABEL[v]}</Badge>;
}

export default function UnifiedHealthReport() {
  const { healthReport, loading, fetchHealthReport } = useComprehensiveHealth(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchHealthReport();
  }, [fetchHealthReport]);

  const assessments = useMemo<ComponentAssessment[]>(() => {
    const components = healthReport?.components;
    if (!components || typeof components !== 'object') return [];
    return Object.entries(components).map(([key, value]) =>
      assess(key, (value ?? {}) as Record<string, unknown>),
    );
  }, [healthReport]);

  const scored = assessments.filter((a) => a.health !== null && a.verdict !== 'unknown' && a.verdict !== 'not_instrumented');
  const uncovered = assessments.filter((a) => a.verdict === 'unknown' || a.verdict === 'not_instrumented');
  const attention = assessments.filter((a) => a.verdict === 'degraded' || a.verdict === 'unhealthy');

  const verifiedScore = scored.length
    ? Math.round(scored.reduce((sum, a) => sum + (a.health ?? 0), 0) / scored.length)
    : null;

  const coverage = assessments.length
    ? Math.round((scored.length / assessments.length) * 100)
    : 0;

  const overallLabel = (() => {
    if (!assessments.length) return 'Unknown';
    if (attention.length > 0) return 'Needs attention';
    if (uncovered.length > 0) return 'Partially verified';
    return verifiedScore !== null && verifiedScore >= 95 ? 'Healthy' : 'Needs attention';
  })();

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-health-report');
      if (error) throw error;
      const csv = typeof data?.csv === 'string' ? data.csv : null;
      if (!csv) throw new Error('No CSV returned');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: 'Report Exported', description: 'Health report has been downloaded successfully' });
    } catch {
      toast({
        title: 'Export Failed',
        description: 'Unable to export health report',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading && !healthReport) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!healthReport) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <CardTitle>Health data unavailable</CardTitle>
            <CardDescription>
              The health check did not return a report, so system health is Unknown — not
              healthy. This usually means the comprehensive-health-check function failed or
              timed out.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={fetchHealthReport} disabled={loading}>
              <RefreshCw className={`h-4 w-4 me-2 ${loading ? 'animate-spin' : ''}`} />
              Retry health check
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Report</h1>
          <p className="text-muted-foreground">
            Only checks that ran and proved healthy count toward the score.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchHealthReport} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 me-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verified Health</CardTitle>
          <CardDescription>
            Last checked:{' '}
            {healthReport.timestamp ? new Date(healthReport.timestamp).toLocaleString() : 'Unknown'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-6xl font-bold">
                {verifiedScore !== null ? verifiedScore : '—'}
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold">{overallLabel}</div>
                <p className="text-sm text-muted-foreground">
                  {scored.length} of {assessments.length || 0} checks verified ({coverage}% coverage)
                </p>
              </div>
            </div>
            <div className="text-end">
              <div className="text-sm text-muted-foreground">Response Time</div>
              <div className="text-2xl font-semibold">
                {num(healthReport.response_time_ms) !== null ? `${healthReport.response_time_ms}ms` : 'Unknown'}
              </div>
            </div>
          </div>

          <Progress value={coverage} className="h-3" />

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{scored.filter((a) => a.verdict === 'healthy').length} verified healthy</span>
            <span>{attention.length} need attention</span>
            <span>{uncovered.filter((a) => a.verdict === 'unknown').length} unknown</span>
            <span>{uncovered.filter((a) => a.verdict === 'not_instrumented').length} not instrumented</span>
          </div>

          {uncovered.length > 0 && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              This score covers only the checks listed as verified. Unknown and
              not-instrumented checks are excluded — they are not evidence of good health.
            </p>
          )}
        </CardContent>
      </Card>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            The health check returned no component results. Nothing can be reported as healthy.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {assessments.map((a) => (
            <Card key={a.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium capitalize">{a.key}</CardTitle>
                  {verdictIcon(a.verdict)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold">
                  {a.health !== null && a.verdict !== 'not_instrumented' && a.verdict !== 'unknown'
                    ? `${a.health}%`
                    : '—'}
                </div>
                {verdictBadge(a.verdict)}
                <p className="text-xs text-muted-foreground">{a.reason}</p>
                {num(a.raw.latency_ms) !== null && (
                  <div className="text-xs text-muted-foreground">Latency: {String(a.raw.latency_ms)}ms</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(attention.length > 0 || uncovered.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Items requiring follow-up ({attention.length + uncovered.length})</CardTitle>
            <CardDescription>Failing checks and gaps in monitoring coverage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...attention, ...uncovered].map((a) => (
              <div key={a.key} className="flex items-start gap-4 rounded-lg border p-4">
                {verdictIcon(a.verdict)}
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-semibold capitalize">{a.key}</h4>
                    {verdictBadge(a.verdict)}
                  </div>
                  <p className="text-sm text-muted-foreground">{a.reason}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
