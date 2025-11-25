import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Database, RefreshCw } from 'lucide-react';

const AdminUtilities = () => {
  const [reconciling, setReconciling] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleReconcileSeats = async () => {
    setReconciling(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-seats', {
        method: 'POST'
      });

      if (error) throw error;

      setResult(data);
      toast.success(`Reconciliation complete! ${data.seats_created} seats created for ${data.organizations_reconciled} organizations`);
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      toast.error(error.message || 'Failed to reconcile seats');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Utilities</h1>
        <p className="text-muted-foreground mt-1">Database maintenance and system operations</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Reconcile Seats</CardTitle>
              <CardDescription>
                Allocate missing seats for organizations with course credits but no available seats
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This utility checks all organizations with course credits and ensures they have the correct number of seats allocated. 
            It will create seats for any organization that has a deficit.
          </p>
          
          <Button 
            onClick={handleReconcileSeats} 
            disabled={reconciling}
            className="w-full"
          >
            {reconciling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reconciling Seats...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Seat Reconciliation
              </>
            )}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Reconciliation Results</h4>
              <div className="space-y-1 text-sm">
                <p>Organizations checked: {result.organizations_checked}</p>
                <p>Organizations reconciled: {result.organizations_reconciled}</p>
                <p className="text-green-600 font-semibold">Seats created: {result.seats_created}</p>
                <p>Skipped (no deficit): {result.skipped}</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 text-red-600">
                    <p className="font-semibold">Errors:</p>
                    {result.errors.map((err: any, idx: number) => (
                      <p key={idx}>- {err.organization}: {err.error}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUtilities;
