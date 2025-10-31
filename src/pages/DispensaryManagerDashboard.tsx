import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeatManagementWidget } from '@/components/team/SeatManagementWidget';
import { CompletionAnalyticsWidget } from '@/components/team/CompletionAnalyticsWidget';
import { SeatAssignmentManager } from '@/components/team/SeatAssignmentManager';
import { EmployeeInvitationForm } from '@/components/team/EmployeeInvitationForm';
import { Building2, CreditCard, Users, FileText, Settings, ShieldCheck, Key, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface OrganizationInfo {
  id: string;
  name: string;
  dispensary_number: string;
  license_number: string;
  license_type: string;
  compliance_status: string;
  course_credits: number;
}

import { useOrganization } from '@/hooks/useOrganization';

const DispensaryManagerDashboard = () => {
  const { user } = useAuth();
  const { isDispensaryManager, isLoading: roleLoading } = useUserRole();
  const { organization, isLoading: orgLoading, refreshOrganization } = useOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [joinCodes, setJoinCodes] = useState<any[]>([]);

  useEffect(() => {
    if (!roleLoading && !isDispensaryManager) {
      toast.error('Access denied: Dispensary Manager role required');
      navigate('/');
      return;
    }

    if (user && isDispensaryManager && organization?.id) {
      fetchCoordinators();
    }
  }, [user, isDispensaryManager, roleLoading, organization?.id]);

  // Phase 6: Add real-time subscriptions
  useEffect(() => {
    if (!organization?.id) return;

    const channels: any[] = [];

    const employeesChannel = supabase
      .channel('manager-employees-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `organization_id=eq.${organization.id}` },
        () => refreshOrganization()
      )
      .subscribe();

    const seatsChannel = supabase
      .channel('manager-seats-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'rvt_seats', filter: `organization_id=eq.${organization.id}` },
        () => refreshOrganization()
      )
      .subscribe();

    channels.push(employeesChannel, seatsChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [organization?.id]);

  const fetchCoordinators = async () => {
    if (!organization?.id) return;

    try {
      // Get training coordinators
      const { data: coords } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(first_name, last_name, email, organization_id)
        `)
        .eq('role', 'training_coordinator')
        .eq('profiles.organization_id', organization.id);

      setCoordinators(coords || []);

      // Get active join codes
      const { data: codes } = await supabase
        .from('rvt_join_codes')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setJoinCodes(codes || []);
    } catch (error: any) {
      console.error('Error fetching coordinators:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || roleLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No organization found. Please contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dispensary Manager Portal</h1>
          <p className="text-muted-foreground">Manage your organization and training programs</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Building2 className="w-4 h-4 mr-2" />
          {organization.dispensary_number}
        </Badge>
      </div>

      {/* Organization Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.name}</div>
            <p className="text-xs text-muted-foreground mt-1">
              License: {organization.license_number}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{organization.compliance_status}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Type: {organization.license_type || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.course_credits}</div>
            <Button
              variant="link"
              className="text-xs p-0 h-auto mt-1"
              onClick={() => navigate('/purchase-seats')}
            >
              Purchase more seats
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coordinators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coordinators.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active coordinators</p>
          </CardContent>
        </Card>
      </div>

      {/* Join Code Display Card */}
      {joinCodes.length > 0 && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Organization Join Code
            </CardTitle>
            <CardDescription>
              Share this code with employees to enroll in training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {joinCodes.map((code) => (
              <div key={code.id} className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="font-mono text-2xl font-bold">
                    {code.code}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(code.code);
                      toast.success("Code copied to clipboard!");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    Used: {code.current_uses} / {code.max_uses}
                  </span>
                  <span>
                    Expires: {new Date(code.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seats">Seat Management</TabsTrigger>
          <TabsTrigger value="invite">Invite Employees</TabsTrigger>
          <TabsTrigger value="coordinators">Team Management</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SeatManagementWidget organizationId={organization.id} />
            <CompletionAnalyticsWidget organizationId={organization.id} />
          </div>
        </TabsContent>
        
        <TabsContent value="seats" className="space-y-4">
          <SeatAssignmentManager organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="invite" className="space-y-4">
          <EmployeeInvitationForm 
            organizationId={organization.id}
            organizationName={organization.name}
            onInvitationsSent={refreshOrganization}
          />
        </TabsContent>

        <TabsContent value="coordinators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Coordinators</CardTitle>
              <CardDescription>
                Manage team members who coordinate employee training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coordinators.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No training coordinators assigned yet.
                  </p>
                ) : (
                  coordinators.map((coord) => (
                    <div
                      key={coord.user_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {coord.profiles.first_name} {coord.profiles.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{coord.profiles.email}</p>
                      </div>
                      <Badge>Training Coordinator</Badge>
                    </div>
                  ))
                )}
                <Button className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Add Training Coordinator
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>Download reports for regulatory compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Employee Training Status Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Certificate Compliance Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Audit Trail Export
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Manage your organization information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization Name</label>
                <p className="text-sm text-muted-foreground">{organization.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dispensary Number</label>
                <p className="text-sm text-muted-foreground">{organization.dispensary_number}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">License Number</label>
                <p className="text-sm text-muted-foreground">{organization.license_number}</p>
              </div>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Edit Organization Details
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DispensaryManagerDashboard;
