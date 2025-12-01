import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DispensaryApplicationManager from './DispensaryApplicationManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const AdminDispensarySection = () => {
  const { toast } = useToast();
  const [reconciling, setReconciling] = React.useState(false);

  const handleReconcileSeats = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.rpc('reconcile_seats');
      
      if (error) throw error;
      
      toast({
        title: 'Seats Reconciled',
        description: `Fixed seat mismatches for ${data?.length || 0} organizations`,
      });
    } catch (error: any) {
      toast({
        title: 'Reconciliation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setReconciling(false);
    }
  };

  return (
    <Tabs defaultValue="applications" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="applications">Applications</TabsTrigger>
        <TabsTrigger value="organizations">Organizations</TabsTrigger>
        <TabsTrigger value="seats">Seat Management</TabsTrigger>
      </TabsList>

      <TabsContent value="applications">
        <DispensaryApplicationManager />
      </TabsContent>

      <TabsContent value="organizations">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Management
            </CardTitle>
            <CardDescription>View and manage approved dispensaries</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Organization management interface coming soon
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="seats">
        <Card>
          <CardHeader>
            <CardTitle>Seat Allocation & Reconciliation</CardTitle>
            <CardDescription>Fix seat mismatches and manage training seat inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleReconcileSeats} 
              disabled={reconciling}
              className="w-full"
            >
              {reconciling ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Reconciling Seats...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reconcile All Seats
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              This will check all organizations for seat count mismatches between purchased credits
              and allocated training seats, then automatically create missing seats.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
