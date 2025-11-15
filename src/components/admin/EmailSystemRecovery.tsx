import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Zap, CheckCircle, Settings } from "lucide-react";

export const EmailSystemRecovery = () => {
  const queryClient = useQueryClient();

  // Query circuit breaker status
  const { data: circuitBreaker, isLoading } = useQuery({
    queryKey: ["email-circuit-breaker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_circuit_breaker")
        .select("*")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Reset circuit breaker mutation
  const resetCircuitBreaker = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("reset-email-circuit-breaker");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Circuit breaker reset successfully");
      queryClient.invalidateQueries({ queryKey: ["email-circuit-breaker"] });
      queryClient.invalidateQueries({ queryKey: ["email-diagnostics"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset circuit breaker: ${error.message}`);
    },
  });

  // Regenerate expired tokens mutation
  const regenerateTokens = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("batch-regenerate-tokens");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Regenerated ${data.regenerated} expired tokens`);
      if (data.failed > 0) {
        toast.warning(`${data.failed} tokens failed to regenerate`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to regenerate tokens: ${error.message}`);
    },
  });

  // Reconcile seats mutation
  const reconcileSeats = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("reconcile-seats");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Created ${data.seats_created} missing seats for ${data.organizations_reconciled} organizations`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reconcile seats: ${error.message}`);
    },
  });

  const isCircuitBreakerOpen = circuitBreaker?.circuit_state === 'open';
  const hasFailures = (circuitBreaker?.failure_count || 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Automated Recovery Actions
        </CardTitle>
        <CardDescription>
          One-click fixes for common email and pipeline issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Circuit Breaker Status & Reset */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold flex items-center gap-2">
                Email Circuit Breaker
                {isLoading ? (
                  <Badge variant="outline">Loading...</Badge>
                ) : isCircuitBreakerOpen ? (
                  <Badge variant="destructive">OPEN - Emails Blocked</Badge>
                ) : hasFailures ? (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    Closed ({circuitBreaker?.failure_count} failures)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Healthy
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {isCircuitBreakerOpen 
                  ? "Circuit breaker is open - all email sending is blocked"
                  : hasFailures
                  ? "Circuit breaker has recorded failures but is still allowing emails"
                  : "Circuit breaker is functioning normally"
                }
              </div>
            </div>
            {(isCircuitBreakerOpen || hasFailures) && (
              <Button
                onClick={() => resetCircuitBreaker.mutate()}
                disabled={resetCircuitBreaker.isPending}
                variant={isCircuitBreakerOpen ? "destructive" : "outline"}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${resetCircuitBreaker.isPending ? 'animate-spin' : ''}`} />
                Reset
              </Button>
            )}
          </div>
          
          {isCircuitBreakerOpen && (
            <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <div className="font-semibold text-destructive">CRITICAL: Email System Down</div>
                  <div className="text-muted-foreground mt-1">
                    The circuit breaker has opened after {circuitBreaker?.failure_count} consecutive failures. 
                    No emails can be sent until you reset it.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Regenerate Expired Tokens */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Regenerate Expired Registration Tokens</div>
              <div className="text-sm text-muted-foreground mt-1">
                Find all approved applications with expired tokens and send new registration links
              </div>
            </div>
            <Button
              onClick={() => regenerateTokens.mutate()}
              disabled={regenerateTokens.isPending}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${regenerateTokens.isPending ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Reconcile Seats */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Reconcile Course Seats</div>
              <div className="text-sm text-muted-foreground mt-1">
                Find organizations where credit count doesn't match seat count and create missing seats
              </div>
            </div>
            <Button
              onClick={() => reconcileSeats.mutate()}
              disabled={reconcileSeats.isPending}
              variant="outline"
              size="sm"
            >
              <Settings className={`h-4 w-4 mr-2 ${reconcileSeats.isPending ? 'animate-spin' : ''}`} />
              Reconcile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
