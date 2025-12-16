import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Play, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  journey: string;
  step: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes: string;
  timestamp: string;
}

interface E2EReport {
  test_run_id: string;
  started_at: string;
  completed_at: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  results: TestResult[];
  summary: {
    account_creation: boolean;
    password_reset: boolean;
    auth_guards: boolean;
    dispensary_application: boolean;
    training_flow: boolean;
    email_system: boolean;
    certificate_generation: boolean;
  };
}

export const E2EValidationReport: React.FC = () => {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  // Fetch latest test results
  const { data: latestReport, isLoading } = useQuery({
    queryKey: ['e2e-validation-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automated_test_results')
        .select('*')
        .eq('test_name', 'E2E Validation Suite')
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
      toast.success(`E2E Validation Complete: ${data.passed_tests}/${data.total_tests} passed`);
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

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getOverallStatus = (report: E2EReport) => {
    const passRate = (report.passed_tests / report.total_tests) * 100;
    if (passRate >= 90) return { label: 'READY', color: 'bg-green-500' };
    if (passRate >= 70) return { label: 'NEEDS ATTENTION', color: 'bg-yellow-500' };
    return { label: 'CRITICAL GAPS', color: 'bg-red-500' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">End-to-End Validation Report</h2>
          <p className="text-muted-foreground">Complete system validation across all critical user journeys</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runValidation.mutate()}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run E2E Validation
              </>
            )}
          </Button>
          {latestReport && (
            <Button variant="outline" onClick={exportReport}>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : latestReport ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`${getOverallStatus(latestReport).color} text-white`}>
                  {getOverallStatus(latestReport).label}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tests Passed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {latestReport.passed_tests}/{latestReport.total_tests}
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

          {/* Journey Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Journey Summary</CardTitle>
              <CardDescription>Status of each critical user journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(latestReport.summary).map(([key, passed]) => (
                  <div key={key} className="flex items-center gap-2 p-3 rounded-lg border">
                    {getStatusIcon(passed)}
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Matrix</CardTitle>
              <CardDescription>All test results with expected vs actual outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Journey</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestReport.results.map((result, idx) => (
                    <TableRow key={idx} className={!result.passed ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell className="font-medium">{result.journey}</TableCell>
                      <TableCell>{result.step}</TableCell>
                      <TableCell className="text-muted-foreground">{result.expected}</TableCell>
                      <TableCell>{result.actual}</TableCell>
                      <TableCell>
                        {result.passed ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Pass
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Fail</Badge>
                        )}
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

          {/* Critical Gaps Alert */}
          {latestReport.failed_tests > 0 && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Critical Gaps Identified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {latestReport.results
                    .filter(r => !r.passed || r.notes?.includes('CRITICAL'))
                    .map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-red-700">
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>{r.journey} - {r.step}:</strong> {r.notes || r.actual}
                        </span>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Validation Report Found</h3>
            <p className="text-muted-foreground mb-4">Run the E2E validation to generate a comprehensive system report</p>
            <Button onClick={() => runValidation.mutate()} disabled={isRunning}>
              <Play className="mr-2 h-4 w-4" />
              Run First Validation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default E2EValidationReport;
