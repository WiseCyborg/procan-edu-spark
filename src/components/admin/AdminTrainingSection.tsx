import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, GraduationCap, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  const { data: recentCerts } = useQuery({
    queryKey: ['recent-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Training Progress Overview
            </CardTitle>
            <CardDescription>Monitor employee training completion across all organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Detailed progress tracking interface coming soon
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="certificates">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certificate Management
            </CardTitle>
            <CardDescription>View, verify, and manage issued certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Recently Issued Certificates</p>
              {recentCerts && recentCerts.length > 0 ? (
                <div className="space-y-1">
                  {recentCerts.slice(0, 5).map((cert) => (
                    <div key={cert.id} className="text-sm text-muted-foreground">
                      {cert.certificate_number} - {new Date(cert.issue_date).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No certificates issued yet</p>
              )}
            </div>
          </CardContent>
        </Card>
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
