import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DiagnosticResults {
  health: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  diagnostics: {
    timestamp: string;
    secrets: Record<string, boolean | string>;
    circuitBreaker: any;
    providerHealth: any[];
    recentEmails: any;
    resendTest: { success: boolean; error?: string; responseTime?: number };
    smtpTest: { success: boolean; error?: string; responseTime?: number };
    recommendations: string[];
  };
  summary: {
    resend_working: boolean;
    smtp_working: boolean;
    circuit_breaker_state: string;
    recent_failure_rate: string;
    last_email_sent: string;
  };
}

export const EmailSystemDiagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('diagnose-email-system', {
        body: {},
      });

      if (error) throw error;

      setResults(data);
      
      toast({
        title: 'Diagnostics Complete',
        description: `System health: ${data.health}`,
        variant: data.health === 'CRITICAL' ? 'destructive' : 'default',
      });
    } catch (error: any) {
      console.error('Diagnostic error:', error);
      toast({
        title: 'Diagnostic Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'HEALTHY':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'DEGRADED':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'CRITICAL':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'HEALTHY':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'DEGRADED':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              📧 Email System Diagnostics
              {results && getHealthIcon(results.health)}
            </CardTitle>
            <CardDescription>
              Comprehensive health check of email delivery infrastructure
            </CardDescription>
          </div>
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </div>
      </CardHeader>

      {results && (
        <CardContent className="space-y-4">
          {/* Overall Health */}
          <Alert className={getHealthColor(results.health)}>
            <AlertDescription className="font-semibold text-lg">
              System Health: {results.health}
            </AlertDescription>
          </Alert>

          {/* Quick Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Resend Status</p>
              <Badge variant={results.summary.resend_working ? 'default' : 'destructive'}>
                {results.summary.resend_working ? '✅ Online' : '❌ Offline'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">SMTP Status</p>
              <Badge variant={results.summary.smtp_working ? 'default' : 'destructive'}>
                {results.summary.smtp_working ? '✅ Online' : '❌ Offline'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Circuit Breaker</p>
              <Badge variant={results.summary.circuit_breaker_state === 'closed' ? 'default' : 'destructive'}>
                {results.summary.circuit_breaker_state}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Failure Rate (7d)</p>
              <Badge variant={parseFloat(results.summary.recent_failure_rate) > 50 ? 'destructive' : 'default'}>
                {results.summary.recent_failure_rate}
              </Badge>
            </div>
          </div>

          {/* Recommendations */}
          {results.diagnostics.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">⚡ Action Items</h3>
              <div className="space-y-2">
                {results.diagnostics.recommendations.map((rec, idx) => (
                  <Alert key={idx} variant={rec.includes('🚨 CRITICAL') ? 'destructive' : 'default'}>
                    <AlertDescription>{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Domain Verification Help */}
          {results.diagnostics.recommendations.some(r => r.includes('domain verification')) && (
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-semibold">🔧 How to Fix Domain Verification:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Resend Domains <ExternalLink className="h-3 w-3" />
                  </a></li>
                  <li>Add <code className="bg-muted px-1 py-0.5 rounded">procannedu.com</code> domain</li>
                  <li>Follow DNS verification steps (add TXT, MX records)</li>
                  <li>Wait for verification (usually 5-10 minutes)</li>
                  <li>Re-run diagnostics to confirm</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {/* Provider Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resend Test Results</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={results.diagnostics.resendTest.success ? 'default' : 'destructive'}>
                    {results.diagnostics.resendTest.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
                {results.diagnostics.resendTest.responseTime && (
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span className="font-mono">{results.diagnostics.resendTest.responseTime}ms</span>
                  </div>
                )}
                {results.diagnostics.resendTest.error && (
                  <div className="text-destructive text-xs mt-2">
                    Error: {results.diagnostics.resendTest.error}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SMTP Test Results</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={results.diagnostics.smtpTest.success ? 'default' : 'destructive'}>
                    {results.diagnostics.smtpTest.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
                {results.diagnostics.smtpTest.responseTime && (
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span className="font-mono">{results.diagnostics.smtpTest.responseTime}ms</span>
                  </div>
                )}
                {results.diagnostics.smtpTest.error && (
                  <div className="text-destructive text-xs mt-2">
                    Error: {results.diagnostics.smtpTest.error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Technical Details */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer font-semibold">🔍 Technical Details</summary>
            <pre className="mt-4 text-xs bg-muted p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(results.diagnostics, null, 2)}
            </pre>
          </details>
        </CardContent>
      )}
    </Card>
  );
};
