import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface FixResult {
  success: boolean;
  message: string;
  details?: any;
}

export function GapFixesExecutor() {
  const [isExecutingGap2, setIsExecutingGap2] = useState(false);
  const [isExecutingGap4, setIsExecutingGap4] = useState(false);
  const [gap2Result, setGap2Result] = useState<FixResult | null>(null);
  const [gap4Result, setGap4Result] = useState<FixResult | null>(null);
  const { toast } = useToast();

  const executeGap2Fix = async () => {
    setIsExecutingGap2(true);
    setGap2Result(null);

    try {
      console.log('🔄 Invoking batch-regenerate-tokens edge function...');
      
      const { data, error } = await supabase.functions.invoke('batch-regenerate-tokens', {
        body: {}
      });

      if (error) throw error;

      console.log('✅ batch-regenerate-tokens result:', data);

      setGap2Result({
        success: true,
        message: `Successfully regenerated ${data.regenerated} tokens and sent approval emails`,
        details: data
      });

      toast({
        title: "Gap #2 Fixed",
        description: `Regenerated ${data.regenerated} expired tokens. Check email_logs for sent emails.`,
      });

    } catch (error: any) {
      console.error('❌ Error executing Gap #2 fix:', error);
      
      setGap2Result({
        success: false,
        message: error.message || 'Failed to regenerate tokens'
      });

      toast({
        title: "Gap #2 Fix Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExecutingGap2(false);
    }
  };

  const executeGap4Fix = async () => {
    setIsExecutingGap4(true);
    setGap4Result(null);

    try {
      console.log('🔄 Invoking reconcile-seats edge function...');
      
      const { data, error } = await supabase.functions.invoke('reconcile-seats', {
        body: {}
      });

      if (error) throw error;

      console.log('✅ reconcile-seats result:', data);

      setGap4Result({
        success: true,
        message: `Reconciled seats for ${data.organizations_checked} organizations`,
        details: data
      });

      toast({
        title: "Gap #4 Fixed",
        description: `Reconciled ${data.seats_created} seats across ${data.organizations_reconciled} organizations.`,
      });

    } catch (error: any) {
      console.error('❌ Error executing Gap #4 fix:', error);
      
      setGap4Result({
        success: false,
        message: error.message || 'Failed to reconcile seats'
      });

      toast({
        title: "Gap #4 Fix Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExecutingGap4(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Week 1 Core Flow Validation</h2>
        <p className="text-muted-foreground">
          Execute fixes for Gap #2 (Expired Tokens) and Gap #4 (Seat Mismatches)
        </p>
      </div>

      {/* Gap #2: Regenerate Tokens */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Gap #2: Regenerate Registration Tokens</h3>
            <p className="text-sm text-muted-foreground">
              Regenerates expired registration tokens and resends approval emails to all approved applications
            </p>
          </div>
          <Button 
            onClick={executeGap2Fix}
            disabled={isExecutingGap2}
            size="lg"
          >
            {isExecutingGap2 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Execute Gap #2 Fix
              </>
            )}
          </Button>
        </div>

        {gap2Result && (
          <div className={`mt-4 p-4 rounded-lg border ${
            gap2Result.success 
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-2">
              {gap2Result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  gap2Result.success 
                    ? 'text-green-900 dark:text-green-100' 
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {gap2Result.message}
                </p>
                {gap2Result.details && (
                  <pre className="mt-2 text-xs overflow-auto p-2 bg-background/50 rounded">
                    {JSON.stringify(gap2Result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p><strong>What this does:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Finds all approved applications with expired registration tokens</li>
            <li>Generates new tokens with 30-day expiry</li>
            <li>Sends new approval emails with updated registration URLs</li>
            <li>Logs all email activities to email_logs table</li>
          </ul>
        </div>
      </Card>

      {/* Gap #4: Reconcile Seats */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Gap #4: Fix Seat Mismatches</h3>
            <p className="text-sm text-muted-foreground">
              Reconciles seat allocations to match course credits for all organizations
            </p>
          </div>
          <Button 
            onClick={executeGap4Fix}
            disabled={isExecutingGap4}
            size="lg"
          >
            {isExecutingGap4 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Execute Gap #4 Fix
              </>
            )}
          </Button>
        </div>

        {gap4Result && (
          <div className={`mt-4 p-4 rounded-lg border ${
            gap4Result.success 
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-2">
              {gap4Result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  gap4Result.success 
                    ? 'text-green-900 dark:text-green-100' 
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {gap4Result.message}
                </p>
                {gap4Result.details && (
                  <pre className="mt-2 text-xs overflow-auto p-2 bg-background/50 rounded">
                    {JSON.stringify(gap4Result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p><strong>What this does:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Compares course_credits vs actual rvt_seats count for each organization</li>
            <li>Creates missing seats to match credit allocation</li>
            <li>Specifically fixes Demo Dispensary LLC (50 credits → 50 seats)</li>
            <li>Logs discrepancies to system_integrity_checks table</li>
          </ul>
        </div>
      </Card>

      <Card className="p-6 bg-muted/30">
        <h4 className="font-semibold mb-3">📋 Next Steps After Execution</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Verify tokens regenerated: Check verification queries in SQL file</li>
          <li>Check email_logs table: Confirm approval emails sent successfully</li>
          <li>Verify Demo Dispensary: Should now have 50 available seats</li>
          <li>Test manager registration: Use a registration link from email</li>
          <li>Proceed to Gap #3: Complete end-to-end manager registration flow</li>
        </ol>
      </Card>
    </div>
  );
}
