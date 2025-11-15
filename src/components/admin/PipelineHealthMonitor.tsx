import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle, RefreshCw, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HealthStatus {
  overall_status: 'healthy' | 'warning' | 'critical';
  critical_issues: number;
  warnings: number;
  checks: Record<string, {
    status: string;
    message: string;
    count?: number;
  }>;
}

export const PipelineHealthMonitor = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const { toast } = useToast();

  const checkHealth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-pipeline-health');
      
      if (error) throw error;
      setHealth(data);
      
      toast({
        title: "Health Check Complete",
        description: `Status: ${data.overall_status.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateTokens = async () => {
    setFixing('tokens');
    try {
      const { data, error } = await supabase.functions.invoke('batch-regenerate-tokens');
      
      if (error) throw error;
      
      toast({
        title: "Tokens Regenerated",
        description: `${data.regenerated} tokens regenerated successfully`,
      });
      
      checkHealth(); // Refresh status
    } catch (error: any) {
      toast({
        title: "Token Regeneration Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFixing(null);
    }
  };

  const reconcileSeats = async () => {
    setFixing('seats');
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-seats');
      
      if (error) throw error;
      
      toast({
        title: "Seats Reconciled",
        description: `${data.seats_created} seats created for ${data.organizations_reconciled} organizations`,
      });
      
      checkHealth(); // Refresh status
    } catch (error: any) {
      toast({
        title: "Seat Reconciliation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFixing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      critical: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Pipeline Health Monitor</h3>
          <p className="text-sm text-muted-foreground">
            Monitor and fix public registration pipeline issues
          </p>
        </div>
        <Button
          onClick={checkHealth}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Check Health
        </Button>
      </div>

      {health && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(health.overall_status)}
              <div>
                <p className="font-medium">Overall Status</p>
                <p className="text-sm text-muted-foreground">
                  {health.critical_issues} critical, {health.warnings} warnings
                </p>
              </div>
            </div>
            {getStatusBadge(health.overall_status)}
          </div>

          {/* Individual Checks */}
          <div className="space-y-2">
            {Object.entries(health.checks).map(([key, check]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="text-sm font-medium">
                      {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {check.count !== undefined && (
                    <Badge variant="outline">{check.count}</Badge>
                  )}
                  {getStatusBadge(check.status)}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Fix Actions */}
          {(health.checks.expired_tokens?.count || 0) > 0 && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-red-900">Critical: Expired Registration Tokens</p>
                  <p className="text-sm text-red-700">
                    {health.checks.expired_tokens.count} organizations cannot complete registration
                  </p>
                </div>
                <Button
                  onClick={regenerateTokens}
                  disabled={fixing === 'tokens'}
                  size="sm"
                  variant="destructive"
                >
                  <Wrench className={`h-4 w-4 mr-2 ${fixing === 'tokens' ? 'animate-spin' : ''}`} />
                  Fix Now
                </Button>
              </div>
            </div>
          )}

          {(health.checks.seat_mismatches?.count || 0) > 0 && (
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-yellow-900">Warning: Seat Allocation Mismatches</p>
                  <p className="text-sm text-yellow-700">
                    {health.checks.seat_mismatches.count} organizations have incorrect seat counts
                  </p>
                </div>
                <Button
                  onClick={reconcileSeats}
                  disabled={fixing === 'seats'}
                  size="sm"
                  variant="outline"
                >
                  <Wrench className={`h-4 w-4 mr-2 ${fixing === 'seats' ? 'animate-spin' : ''}`} />
                  Reconcile
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!health && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Click "Check Health" to run pipeline diagnostics</p>
        </div>
      )}
    </Card>
  );
};
