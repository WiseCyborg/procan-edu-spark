import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Database, Zap, AlertTriangle, CheckCircle, RefreshCw, Users, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EmailFlowDiagram } from '@/components/admin/EmailFlowDiagram';

const SystemHealthDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [orphanedManagers, setOrphanedManagers] = useState<any[]>([]);
  const [emailFlowSteps, setEmailFlowSteps] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      // System health
      const { data: healthData, error: healthError } = await supabase
        .rpc('test_system_health');

      if (healthError) throw healthError;
      setHealthData(healthData);

      // Orphaned managers
      const { data: orphaned } = await supabase
        .from('dispensary_applications')
        .select('id, contact_person, contact_email, organization_name, created_at')
        .eq('registration_completed', true)
        .eq('application_status', 'approved');

      if (orphaned) {
        const managersWithoutInvites = [];
        for (const app of orphaned) {
          const { count } = await supabase
            .from('staff_invitations')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', app.id);
          
          if (count === 0) {
            managersWithoutInvites.push(app);
          }
        }
        setOrphanedManagers(managersWithoutInvites);
      }

      // Email flow
      const { data: recentApp } = await supabase
        .from('dispensary_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentApp) {
        setEmailFlowSteps([
          { id: 'application', label: 'Application Submitted', status: 'completed' as const, timestamp: recentApp.created_at },
          { id: 'approval', label: 'Admin Approval', status: recentApp.application_status === 'approved' ? 'completed' as const : 'pending' as const, timestamp: recentApp.reviewed_at },
          { id: 'registration', label: 'Manager Registration', status: recentApp.registration_completed ? 'completed' as const : 'pending' as const },
          { id: 'invitations', label: 'Staff Invitations', status: orphaned?.some(a => a.id === recentApp.id) ? 'pending' as const : 'completed' as const }
        ]);
      }
    } catch (error: any) {
      toast({ title: "Health Check Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container p-6"><div className="animate-spin h-8 w-8 border-4 border-primary rounded-full mx-auto" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform performance</p>
        </div>
        <Button onClick={fetchHealthData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge>{healthData?.status || 'unknown'}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Profiles:</span>
                <span>{healthData?.profiles_count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={orphanedManagers.length > 0 ? 'border-yellow-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {orphanedManagers.length > 0 ? <UserX className="h-5 w-5 text-yellow-600" /> : <Users className="h-5 w-5 text-green-600" />}
              Orphaned Managers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orphanedManagers.length}</div>
            <p className="text-sm text-muted-foreground">Managers without invitations</p>
            {orphanedManagers.length > 0 && (
              <div className="mt-4 space-y-2">
                {orphanedManagers.slice(0, 3).map((m) => (
                  <div key={m.id} className="p-2 bg-muted rounded text-sm">
                    <div className="font-medium">{m.contact_person}</div>
                    <div className="text-xs text-muted-foreground">{m.contact_email}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {emailFlowSteps.length > 0 && <EmailFlowDiagram steps={emailFlowSteps} />}
    </div>
  );
};

export default SystemHealthDashboard;