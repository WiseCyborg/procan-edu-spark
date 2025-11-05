import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Wrench } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface IntegrityIssue {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  count: number;
  details?: any;
}

interface IntegrityCheckResult {
  success: boolean;
  timestamp: string;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    healthScore: number;
  };
  issues: IntegrityIssue[];
}

export function DatabaseIntegrityTab() {
  const queryClient = useQueryClient();

  const { data: integrityData, isLoading, refetch } = useQuery<IntegrityCheckResult>({
    queryKey: ['database-integrity'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('database-integrity-check');
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const runFixesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('database-integrity-fix');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const successful = data.results?.filter((r: any) => r.status === 'success').length || 0;
      const failed = data.results?.filter((r: any) => r.status === 'error').length || 0;
      
      if (failed === 0) {
        toast.success(`All ${successful} fixes applied successfully`);
      } else {
        toast.warning(`${successful} fixes applied, ${failed} failed`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['database-integrity'] });
    },
    onError: (error: Error) => {
      toast.error(`Fix failed: ${error.message}`);
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 py-6">
      {/* Health Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Database Health Score
              </CardTitle>
              <CardDescription>
                Overall integrity status based on automated checks
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Running integrity checks...
            </div>
          ) : integrityData ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className={`text-6xl font-bold ${getHealthColor(integrityData.summary.healthScore)}`}>
                  {integrityData.summary.healthScore}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Last checked: {new Date(integrityData.timestamp).toLocaleString()}
                </p>
              </div>

              <Progress value={integrityData.summary.healthScore} className="h-3" />

              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {integrityData.summary.critical}
                      </div>
                      <div className="text-xs text-muted-foreground">Critical</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {integrityData.summary.high}
                      </div>
                      <div className="text-xs text-muted-foreground">High</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {integrityData.summary.medium}
                      </div>
                      <div className="text-xs text-muted-foreground">Medium</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {integrityData.summary.low}
                      </div>
                      <div className="text-xs text-muted-foreground">Low</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Auto-Fix Card */}
      {integrityData && integrityData.summary.totalIssues > 0 && (
        <Alert>
          <Wrench className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {integrityData.summary.totalIssues} issue(s) detected. Some can be automatically fixed.
            </span>
            <Button
              size="sm"
              onClick={() => runFixesMutation.mutate()}
              disabled={runFixesMutation.isPending}
            >
              {runFixesMutation.isPending ? 'Fixing...' : 'Run Auto-Fixes'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Issues</CardTitle>
          <CardDescription>
            Issues found during the last integrity check
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : !integrityData || integrityData.summary.totalIssues === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-lg font-semibold">All Clear!</p>
              <p className="text-sm text-muted-foreground">No integrity issues detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrityData.issues.map((issue, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {issue.severity === 'critical' || issue.severity === 'high' ? (
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(issue.severity)}>
                            {issue.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {issue.category}
                          </span>
                        </div>
                        <p className="font-medium">{issue.issue}</p>
                        <p className="text-sm text-muted-foreground">
                          {issue.count} record{issue.count !== 1 ? 's' : ''} affected
                        </p>
                        {issue.details && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                              View details
                            </summary>
                            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(issue.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Domain Verification Alert */}
      {integrityData?.issues.some(i => i.category === 'email_delivery') && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong> Email delivery is failing. Please verify the "procannedu.com" domain in your{' '}
            <a 
              href="https://resend.com/domains" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-semibold"
            >
              Resend dashboard
            </a>
            {' '}and add the required DNS records.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
