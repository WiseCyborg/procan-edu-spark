import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, GraduationCap, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedEmployeeManagement } from '@/components/admin/AdvancedEmployeeManagement';
import { CertificateManagementView } from '@/components/admin/CertificateManagementView';

export const AdminTrainingSection = () => {
  const { data: atRiskUsers } = useQuery({
    queryKey: ['at-risk-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_learning_journey')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email_cache
          )
        `)
        .eq('at_risk_flag', true);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <Tabs defaultValue="progress" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
        <TabsTrigger value="certificates">Certificates</TabsTrigger>
        <TabsTrigger value="at-risk">At-Risk Users</TabsTrigger>
      </TabsList>

      <TabsContent value="progress">
        <AdvancedEmployeeManagement />
      </TabsContent>

      <TabsContent value="certificates">
        <CertificateManagementView />
      </TabsContent>

      <TabsContent value="at-risk">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              At-Risk Employees
            </CardTitle>
            <CardDescription>Employees who may need additional support to complete training</CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskUsers && atRiskUsers.length > 0 ? (
              <div className="space-y-2">
                {atRiskUsers.map((user: any) => (
                  <div key={user.id} className="p-3 border rounded-lg">
                    <p className="font-medium">
                      {user.profiles?.first_name} {user.profiles?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.profiles?.email_cache}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span>Progress: {user.completion_percentage}%</span>
                      <span>Modules: {user.modules_completed}/23</span>
                      <span>Stage: {user.current_stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No at-risk employees at this time</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
