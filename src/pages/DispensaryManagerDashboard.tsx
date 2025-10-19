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
import { Building2, CreditCard, Users, FileText, Settings, ShieldCheck } from 'lucide-react';
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

const DispensaryManagerDashboard = () => {
  const { user } = useAuth();
  const { isDispensaryManager, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [coordinators, setCoordinators] = useState<any[]>([]);

  useEffect(() => {
    if (!roleLoading && !isDispensaryManager) {
      toast.error('Access denied: Dispensary Manager role required');
      navigate('/');
      return;
    }

    if (user && isDispensaryManager) {
      fetchOrganizationData();
    }
  }, [user, isDispensaryManager, roleLoading]);

  const fetchOrganizationData = async () => {
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

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;
      setOrganization(org as any);

      // Get employees using the RPC function
      const { data: empData, error: empError } = await supabase
        .rpc('get_organization_employees', { org_id: profile.organization_id });

      if (empError) {
        console.error('Error fetching employees:', empError);
      }

      // Get training coordinators
      const { data: coords } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(first_name, last_name, email, organization_id)
        `)
        .eq('role', 'training_coordinator')
        .eq('profiles.organization_id', profile.organization_id);

      setCoordinators(coords || []);
    } catch (error: any) {
      console.error('Error fetching organization data:', error);
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || roleLoading) {
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seats">Seat Management</TabsTrigger>
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
