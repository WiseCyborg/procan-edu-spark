import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
  Wrench,
  XCircle,
  TrendingUp,
  Eye,
  Zap
} from 'lucide-react';

interface IntegrityCheck {
  id: string;
  check_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'investigating' | 'fixed' | 'ignored';
  affected_entity_type: string;
  affected_entity_id?: string;
  issue_description: string;
  technical_details: any;
  suggested_fix: string;
  auto_fixable: boolean;
  detected_at: string;
  resolved_at?: string;
}

export const GapAnalysisDashboard = () => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch integrity checks
  const { data: checks, isLoading, refetch } = useQuery({
    queryKey: ['integrity-checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_integrity_checks')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return data as IntegrityCheck[];
    }
  });

  // Run integrity monitor
  const runMonitor = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('system-integrity-monitor');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Integrity check complete: ${data.issues_found} issues found (${data.new_issues} new)`);
      queryClient.invalidateQueries({ queryKey: ['integrity-checks'] });
    },
    onError: (error: Error) => {
      toast.error(`Monitor failed: ${error.message}`);
    }
  });

  // Auto-fix mutation
  const autoFix = useMutation({
    mutationFn: async ({ checkId, fixType }: { checkId: string; fixType: string }) => {
      const functionMap: Record<string, string> = {
        'missing_manager_account': 'auto-fix-manager-accounts',
        'missing_join_code': 'auto-generate-join-codes'
      };

      const functionName = functionMap[fixType];
      if (!functionName) {
        throw new Error('No auto-fix available for this issue type');
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { check_id: checkId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Auto-fix completed successfully');
      queryClient.invalidateQueries({ queryKey: ['integrity-checks'] });
    },
    onError: (error: Error) => {
      toast.error(`Auto-fix failed: ${error.message}`);
    }
  });

  const filteredChecks = checks?.filter(check => {
    if (selectedSeverity === 'all') return true;
    return check.severity === selectedSeverity;
  }) || [];

  const activeIssues = checks?.filter(c => c.status === 'detected') || [];
  const criticalCount = activeIssues.filter(c => c.severity === 'critical').length;
  const highCount = activeIssues.filter(c => c.severity === 'high').length;
  const autoFixableCount = activeIssues.filter(c => c.auto_fixable).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'low': return <Eye className="h-5 w-5 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'detected': return <AlertTriangle className="h-4 w-4" />;
      case 'investigating': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'fixed': return <CheckCircle2 className="h-4 w-4" />;
      case 'ignored': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🔍 System Integrity Monitor</h2>
          <p className="text-muted-foreground">AI-powered gap analysis and automated remediation</p>
        </div>
        <Button
          onClick={() => runMonitor.mutate()}
          disabled={runMonitor.isPending}
          className="gap-2"
        >
          {runMonitor.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Run Check Now
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{highCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Address within 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Auto-Fixable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{autoFixableCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Can be resolved automatically</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeIssues.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All unresolved issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Issues</CardTitle>
          <CardDescription>
            Filter by severity to prioritize remediation efforts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedSeverity} onValueChange={setSelectedSeverity}>
            <TabsList>
              <TabsTrigger value="all">All ({checks?.length || 0})</TabsTrigger>
              <TabsTrigger value="critical">Critical ({criticalCount})</TabsTrigger>
              <TabsTrigger value="high">High ({highCount})</TabsTrigger>
              <TabsTrigger value="medium">Medium</TabsTrigger>
              <TabsTrigger value="low">Low</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedSeverity} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredChecks.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>No Issues Found</AlertTitle>
                  <AlertDescription>
                    {selectedSeverity === 'all'
                      ? 'System integrity is healthy. No gaps detected.'
                      : `No ${selectedSeverity} severity issues found.`}
                  </AlertDescription>
                </Alert>
              ) : (
                <Accordion type="single" collapsible value={expandedCheck || undefined}>
                  {filteredChecks.map((check) => (
                    <AccordionItem key={check.id} value={check.id}>
                      <AccordionTrigger
                        onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
                        className="hover:no-underline"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          {getSeverityIcon(check.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{check.issue_description}</span>
                              <Badge variant={getSeverityColor(check.severity)}>
                                {check.severity}
                              </Badge>
                              {check.auto_fixable && (
                                <Badge variant="outline" className="gap-1">
                                  <Wrench className="h-3 w-3" />
                                  Auto-fix
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Type: {check.check_type.replace(/_/g, ' ')}</span>
                              <span>Detected: {new Date(check.detected_at).toLocaleString()}</span>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(check.status)}
                                {check.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4 pl-8">
                          {/* Suggested Fix */}
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <PlayCircle className="h-4 w-4" />
                              Suggested Fix
                            </h4>
                            <p className="text-sm text-muted-foreground">{check.suggested_fix}</p>
                          </div>

                          {/* Technical Details */}
                          <div>
                            <h4 className="font-medium mb-2">Technical Details</h4>
                            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                              {JSON.stringify(check.technical_details, null, 2)}
                            </pre>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            {check.auto_fixable && check.status === 'detected' && (
                              <Button
                                onClick={() => autoFix.mutate({ checkId: check.id, fixType: check.check_type })}
                                disabled={autoFix.isPending}
                                size="sm"
                                className="gap-2"
                              >
                                {autoFix.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Wrench className="h-4 w-4" />
                                )}
                                Auto-Fix Now
                              </Button>
                            )}
                            {check.status === 'fixed' && (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Resolved {check.resolved_at ? new Date(check.resolved_at).toLocaleString() : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
