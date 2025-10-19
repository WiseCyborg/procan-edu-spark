import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeatManagementWidget } from '@/components/team/SeatManagementWidget';
import { CompletionAnalyticsWidget } from '@/components/team/CompletionAnalyticsWidget';
import { Users, Mail, AlertTriangle, TrendingUp, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const TrainingCoordinatorDashboard = () => {
  const { user } = useAuth();
  const { isTrainingCoordinator, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isTrainingCoordinator) {
      toast.error('Access denied: Training Coordinator role required');
      navigate('/');
      return;
    }

    if (user && isTrainingCoordinator) {
      fetchCoordinatorData();
    }
  }, [user, isTrainingCoordinator, roleLoading]);

  const fetchCoordinatorData = async () => {
    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user!.id)
        .single();

      if (!profile?.organization_id) {
        toast.error('No organization found');
        return;
      }

      setOrganizationId(profile.organization_id);

      // Get employees with real data using RPC
      const { data: empData, error: empError } = await supabase
        .rpc('get_organization_employees', { org_id: profile.organization_id });

      if (empError) throw empError;
      setEmployees(empData || []);

      // Get at-risk students
      const { data: atRisk } = await supabase
        .rpc('get_at_risk_students' as any, { org_id: profile.organization_id });

      setAtRiskStudents(atRisk || []);
    } catch (error: any) {
      console.error('Error fetching coordinator data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail || !organizationId) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-employee-invitation', {
        body: {
          email: inviteEmail,
          organization_id: organizationId,
          invited_by: user!.id,
        },
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchCoordinatorData();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Training Coordinator Portal</h1>
        <p className="text-muted-foreground">Manage employee training and progress</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{atRiskStudents.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.length > 0 
                ? Math.round(employees.reduce((sum, emp) => sum + (emp.progress_percentage || 0), 0) / employees.length) + '%'
                : '0%'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Pending alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Employee Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
          <TabsTrigger value="invite">Invite Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          {atRiskStudents.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  At-Risk Employees
                </CardTitle>
                <CardDescription>
                  These employees need immediate attention due to approaching deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {atRiskStudents.map((student: any) => (
                    <div
                      key={student.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5"
                    >
                      <div>
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {student.days_until_deadline} days until deadline
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Send Reminder
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Employees</CardTitle>
              <CardDescription>View and manage employee training progress</CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No employees enrolled yet. Use the Invite tab to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <div
                      key={emp.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{emp.email}</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        View Progress
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {organizationId && (
              <>
                <SeatManagementWidget organizationId={organizationId} />
                <CompletionAnalyticsWidget organizationId={organizationId} />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invite Employees</CardTitle>
              <CardDescription>
                Send training invitations to your employees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="employee@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Button onClick={handleSendInvitation} disabled={sending || !inviteEmail}>
                  <Mail className="w-4 h-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Employees will receive an email with instructions to register and begin training.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingCoordinatorDashboard;
