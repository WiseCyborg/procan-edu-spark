import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, XCircle, Play, Download, Shield, ShieldAlert, Rocket, Ban, Copy, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface ErrorMeta {
  code?: string;
  message?: string;
  table?: string;
  rpc?: string;
  hint?: string;
  details?: any;
}

interface TestResult {
  journey: string;
  step: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes: string;
  timestamp: string;
  error_meta?: ErrorMeta;
  is_blocker: boolean;
}

interface JourneySummary {
  name: string;
  required_steps: string[];
  completed_steps: string[];
  all_passed: boolean;
  is_blocker: boolean;
}

interface E2EReport {
  test_run_id: string;
  started_at: string;
  completed_at: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  blocker_count: number;
  release_gate_status: 'SHIPPABLE' | 'NOT_SHIPPABLE';
  results: TestResult[];
  journey_summaries: JourneySummary[];
  cleanup_performed: boolean;
  test_data_created: {
    test_user_email?: string;
    test_user_id?: string;
    test_application_id?: string;
    test_progress_id?: string;
    test_certificate_id?: string;
  };
}

export const E2EValidationReport: React.FC = () => {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [showBlockersOnly, setShowBlockersOnly] = useState(false);

  // Fetch latest test results
  const { data: latestReport, isLoading } = useQuery({
    queryKey: ['e2e-validation-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automated_test_results')
        .select('*')
        .ilike('test_name', 'E2E Validation Suite%')
        .order('test_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.metadata as unknown as E2EReport | null;
    }
  });

  // Run E2E validation
  const runValidation = useMutation({
    mutationFn: async () => {
      setIsRunning(true);
      const { data, error } = await supabase.functions.invoke('run-e2e-validation');
      if (error) throw error;
      return data as E2EReport;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['e2e-validation-report'] });
      if (data.release_gate_status === 'SHIPPABLE') {
        toast.success(`E2E Validation Complete: SHIPPABLE - ${data.passed_tests}/${data.total_tests} passed`);
      } else {
        toast.error(`E2E Validation Complete: NOT SHIPPABLE - ${data.blocker_count} blockers found`);
      }
      setIsRunning(false);
    },
    onError: (error: any) => {
      toast.error(`Validation failed: ${error.message}`);
      setIsRunning(false);
    }
  });

  // Export report as JSON
  const exportReport = () => {
    if (!latestReport) return;
    const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `e2e-validation-${latestReport.test_run_id}.json`;
    a.click();
  };

  // Copy blocker details to clipboard
  const copyBlockerText = () => {
    if (!latestReport) return;
    const blockers = latestReport.results.filter(r => !r.passed && r.is_blocker);
    const text = blockers.map(b => 
      `❌ [${b.journey}] ${b.step}\n   Expected: ${b.expected}\n   Actual: ${b.actual}${b.error_meta?.code ? `\n   Error Code: ${b.error_meta.code}` : ''}${b.error_meta?.table ? `\n   Table: ${b.error_meta.table}` : ''}${b.notes ? `\n   Notes: ${b.notes}` : ''}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Blocker details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const getStatusIcon = (passed: boolean, isBlocker: boolean) => {
    if (passed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (isBlocker) {
      return <ShieldAlert className="h-4 w-4 text-red-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const filteredResults = latestReport?.results 
    ? showBlockersOnly 
      ? latestReport.results.filter(r => r.is_blocker && !r.passed)
      : latestReport.results
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">End-to-End Validation Report</h2>
          <p className="text-muted-foreground">Real journey transaction tests with release gate status</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runValidation.mutate()}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Journey Tests...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run E2E Validation
              </>
            )}
          </Button>
          {latestReport && (
            <>
              <Button variant="outline" onClick={exportReport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              {latestReport.blocker_count > 0 && (
                <Button variant="outline" onClick={copyBlockerText}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Blockers
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : latestReport ? (
        <>
          {/* Release Gate Status Banner */}
          <Card className={latestReport.release_gate_status === 'SHIPPABLE' 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : 'border-red-500 bg-red-50 dark:bg-red-950/20'
          }>
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                {latestReport.release_gate_status === 'SHIPPABLE' ? (
                  <Rocket className="h-12 w-12 text-green-600" />
                ) : (
                  <Ban className="h-12 w-12 text-red-600" />
                )}
                <div>
                  <h3 className={`text-2xl font-bold ${latestReport.release_gate_status === 'SHIPPABLE' ? 'text-green-700' : 'text-red-700'}`}>
                    Release Gate: {latestReport.release_gate_status}
                  </h3>
                  <p className="text-muted-foreground">
                    {latestReport.release_gate_status === 'SHIPPABLE' 
                      ? 'All critical journey tests passed. System is ready for production.'
                      : `${latestReport.blocker_count} blocker(s) must be resolved before release.`
                    }
                  </p>
                </div>
              </div>
              <Badge 
                className={`text-lg px-4 py-2 ${latestReport.release_gate_status === 'SHIPPABLE' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {latestReport.passed_tests}/{latestReport.total_tests} Tests Passed
              </Badge>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Blockers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${latestReport.blocker_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {latestReport.blocker_count}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tests Passed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {latestReport.passed_tests}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tests Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {latestReport.failed_tests}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Run</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {new Date(latestReport.completed_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Journey Summaries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Journey Status
              </CardTitle>
              <CardDescription>Critical user journeys and their completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {latestReport.journey_summaries?.map((journey) => (
                  <div 
                    key={journey.name} 
                    className={`p-4 rounded-lg border ${
                      journey.all_passed 
                        ? 'border-green-200 bg-green-50 dark:bg-green-950/20' 
                        : 'border-red-200 bg-red-50 dark:bg-red-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{journey.name}</span>
                      {journey.all_passed ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          PASSED
                        </Badge>
                      ) : journey.is_blocker ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          BLOCKER
                        </Badge>
                      ) : (
                        <Badge variant="secondary">FAILED</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {journey.completed_steps.length}/{journey.required_steps.length} required steps
                    </div>
                    {!journey.all_passed && journey.required_steps.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="text-red-600">Missing:</span>{' '}
                        {journey.required_steps
                          .filter(s => !journey.completed_steps.includes(s))
                          .join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Blockers Alert */}
          {latestReport.blocker_count > 0 && (
            <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <ShieldAlert className="h-5 w-5" />
                    Release Blockers ({latestReport.blocker_count})
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={copyBlockerText}>
                    <Copy className="mr-2 h-3 w-3" />
                    Copy All
                  </Button>
                </div>
                <CardDescription className="text-red-600">
                  These issues must be resolved before the system can be shipped
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {latestReport.results
                    .filter(r => r.is_blocker && !r.passed)
                    .map((r, idx) => (
                      <li key={idx} className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-200">
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-red-700">
                              {r.journey} → {r.step}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Expected:</span> {r.expected}
                            </div>
                            <div className="text-sm text-red-600 mt-1">
                              <span className="font-medium">Actual:</span> {r.actual}
                            </div>
                            {r.error_meta && (
                              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono">
                                {r.error_meta.code && <div>Code: {r.error_meta.code}</div>}
                                {r.error_meta.table && <div>Table: {r.error_meta.table}</div>}
                                {r.error_meta.hint && <div>Hint: {r.error_meta.hint}</div>}
                              </div>
                            )}
                            {r.notes && (
                              <div className="text-sm text-muted-foreground mt-1 italic">
                                {r.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Detailed Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detailed Test Matrix</CardTitle>
                  <CardDescription>All test results with expected vs actual outcomes</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Switch 
                    id="blockers-only"
                    checked={showBlockersOnly} 
                    onCheckedChange={setShowBlockersOnly} 
                  />
                  <Label htmlFor="blockers-only" className="text-sm">Blockers only</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Type</TableHead>
                    <TableHead>Journey</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result, idx) => (
                    <TableRow 
                      key={idx} 
                      className={
                        !result.passed && result.is_blocker 
                          ? 'bg-red-100 dark:bg-red-950/30' 
                          : !result.passed 
                            ? 'bg-red-50 dark:bg-red-950/20' 
                            : ''
                      }
                    >
                      <TableCell>
                        {result.is_blocker ? (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                            GATE
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">check</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{result.journey}</TableCell>
                      <TableCell>{result.step}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-32 truncate">
                        {result.expected}
                      </TableCell>
                      <TableCell className="text-sm max-w-40 truncate">
                        {result.actual}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(result.passed, result.is_blocker)}
                          {result.passed ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Pass
                            </Badge>
                          ) : result.is_blocker ? (
                            <Badge variant="destructive">BLOCKER</Badge>
                          ) : (
                            <Badge variant="secondary">Fail</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {result.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Test Data Created */}
          {latestReport.test_data_created && Object.keys(latestReport.test_data_created).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Test Data Created (This Run)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  {latestReport.test_data_created.test_user_email && (
                    <div><span className="text-muted-foreground">Test User:</span> {latestReport.test_data_created.test_user_email}</div>
                  )}
                  {latestReport.test_data_created.test_user_id && (
                    <div><span className="text-muted-foreground">User ID:</span> {latestReport.test_data_created.test_user_id}</div>
                  )}
                  {latestReport.test_data_created.test_application_id && (
                    <div><span className="text-muted-foreground">Application ID:</span> {latestReport.test_data_created.test_application_id}</div>
                  )}
                  {latestReport.test_data_created.test_progress_id && (
                    <div><span className="text-muted-foreground">Progress ID:</span> {latestReport.test_data_created.test_progress_id}</div>
                  )}
                  {latestReport.test_data_created.test_certificate_id && (
                    <div><span className="text-muted-foreground">Certificate ID:</span> {latestReport.test_data_created.test_certificate_id}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Validation Report Found</h3>
            <p className="text-muted-foreground mb-4">Run the E2E validation suite to generate a report</p>
            <Button onClick={() => runValidation.mutate()} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run E2E Validation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
