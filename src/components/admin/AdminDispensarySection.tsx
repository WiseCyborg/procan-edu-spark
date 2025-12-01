import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DispensaryApplicationManager from './DispensaryApplicationManager';
import { OrganizationsManagementView } from './OrganizationsManagementView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AdminOrganizationSelector } from './AdminOrganizationSelector';
import { AdvancedSeatManagement } from '@/components/team/AdvancedSeatManagement';

export const AdminDispensarySection = () => {
  const { toast } = useToast();
  const [reconciling, setReconciling] = React.useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

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
        <OrganizationsManagementView />
      </TabsContent>

      <TabsContent value="seats" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Batch Seat Operations</CardTitle>
            <CardDescription>System-wide seat reconciliation and maintenance</CardDescription>
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

        <AdminOrganizationSelector 
          onSelect={setSelectedOrgId}
          selectedOrgId={selectedOrgId}
        />

        {selectedOrgId && (
          <AdvancedSeatManagement organizationId={selectedOrgId} />
        )}

        {!selectedOrgId && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an organization above to manage its training seats</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};
