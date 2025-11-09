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
import { Users, Mail, AlertTriangle, TrendingUp, Bell, Calendar, ShoppingCart, BarChart, CheckCircle, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CertificateVerificationWidget } from '@/components/team/CertificateVerificationWidget';
import { DeadlineManager } from '@/components/team/DeadlineManager';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { useOrganization } from '@/hooks/useOrganization';
import { AiLeanCoach } from '@/components/ailean/AiLeanCoach';

const TrainingCoordinatorDashboard = () => {
  const { user } = useAuth();
  const { isTrainingCoordinator, isLoading: roleLoading } = useUserRole();
  const { organization, organizationId, isLoading: orgLoading } = useOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!roleLoading && !isTrainingCoordinator) {
      toast.error('Access denied: Training Coordinator role required');
      navigate('/');
      return;
    }

    if (user && isTrainingCoordinator && organizationId) {
      fetchCoordinatorData();
    }
  }, [user, isTrainingCoordinator, roleLoading, organizationId]);

  // Phase 6: Add real-time subscriptions
  useEffect(() => {
    if (!organizationId) return;

    const channels: any[] = [];

    const progressChannel = supabase
      .channel('coordinator-progress-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_progress' },
        () => fetchCoordinatorData()
      )
      .subscribe();

    const employeesChannel = supabase
      .channel('coordinator-employees-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `organization_id=eq.${organizationId}` },
        () => fetchCoordinatorData()
      )
      .subscribe();

    channels.push(progressChannel, employeesChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [organizationId]);

  const fetchCoordinatorData = async () => {
    if (!organizationId) return;
    
    try {
      // Get employees with real data using RPC
      const { data: empData, error: empError } = await supabase
        .rpc('get_organization_employees', { org_id: organizationId });

      if (empError) throw empError;
      setEmployees(empData || []);

      // Get at-risk students
      const { data: atRisk } = await supabase
        .rpc('get_at_risk_students' as any, { org_id: organizationId });

      setAtRiskStudents(atRisk || []);

      // Get certificates
      const { data: certs } = await supabase
        .rpc('get_organization_certificates' as any, { org_id: organizationId });
      setCertificates((certs as any) || []);
    } catch (error: any) {
      console.error('Error fetching coordinator data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulkReminders = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select employees first');
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('send_bulk_reminders' as any, {
        user_ids: selectedUsers,
        message_template: 'Please complete your training by the deadline',
        coordinator_id: user!.id
      });
      
      if (error) throw error;
      toast.success(`Sent ${data} reminder emails`);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast.error('Failed to send reminders');
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

  if (loading || roleLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Training Coordinator Portal</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage employee training and progress</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-sm md:text-base font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="text-2xl md:text-3xl font-bold">{employees.length}</div>
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
          <TabsTrigger value="seats">Seat Management</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedUsers.length === employees.length}
                        onCheckedChange={(checked) => {
                          setSelectedUsers(checked ? employees.map(e => e.user_id) : []);
                        }}
                      />
                      <Label>Select All</Label>
                    </div>
                    {selectedUsers.length > 0 && (
                      <Button size="sm" onClick={handleSendBulkReminders}>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Reminder ({selectedUsers.length})
                      </Button>
                    )}
                  </div>
                  
                  {employees.map((emp) => (
                    <div
                      key={emp.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={selectedUsers.includes(emp.user_id)}
                          onCheckedChange={(checked) => {
                            setSelectedUsers(prev =>
                              checked
                                ? [...prev, emp.user_id]
                                : prev.filter(id => id !== emp.user_id)
                            );
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{emp.email}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Progress: {emp.progress_percentage}%
                            </span>
                            <Badge variant={emp.current_tier === 'red' ? 'destructive' : 'default'}>
                              {emp.current_tier} tier
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Calendar className="h-4 w-4 mr-1" />
                              Set Deadline
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Set Training Deadline</DialogTitle>
                            </DialogHeader>
                            <DeadlineManager userId={emp.user_id} currentDeadline={emp.deadline} />
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/profile/${emp.user_id}`)}>
                          View Details
                        </Button>
                      </div>
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

        <TabsContent value="seats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Seat Management</CardTitle>
              <CardDescription>
                Monitor and manage training seat allocations for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizationId && <SeatManagementWidget organizationId={organizationId} />}
              
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold">Available Actions</h3>
                <div className="grid gap-2">
                  <Button variant="outline" onClick={() => {
                    toast.info('Contact your manager to purchase additional training seats');
                  }}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Request More Seats
                  </Button>
                  
                  <Button variant="outline" onClick={() => {
                    navigate('/team-management');
                  }}>
                    <BarChart className="w-4 h-4 mr-2" />
                    View Utilization Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Certificates</CardTitle>
              <CardDescription>
                View and verify employee training certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizationId && <CertificateVerificationWidget organizationId={organizationId} />}
            </CardContent>
          </Card>
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

      {/* AiLean Coach */}
      <AiLeanCoach />
    </div>
  );
};

export default TrainingCoordinatorDashboard;
