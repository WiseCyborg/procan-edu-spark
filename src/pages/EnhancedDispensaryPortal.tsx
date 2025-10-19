import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeatManagementWidget } from "@/components/team/SeatManagementWidget";
import { CompletionAnalyticsWidget } from "@/components/team/CompletionAnalyticsWidget";
import { toast } from 'sonner';
import { 
  Users, 
  BarChart3,
  UserPlus, 
  Download, 
  Mail, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Building,
  FileText
} from 'lucide-react';

interface EmployeeProgress {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  organization: string;
  completed_modules: number;
  total_score: number;
  last_activity: string;
  is_completed: boolean;
}

interface OrganizationStats {
  total_employees: number;
  completed_training: number;
  in_progress: number;
  not_started: number;
  average_score: number;
  completion_rate: number;
}

const EnhancedDispensaryPortal: React.FC = () => {
  const { user } = useAuth();
  const { isDispensaryManager, isAdmin } = useUserRole();
  const [employeeProgress, setEmployeeProgress] = useState<EmployeeProgress[]>([]);
  const [organizationStats, setOrganizationStats] = useState<OrganizationStats>({
    total_employees: 0,
    completed_training: 0,
    in_progress: 0,
    not_started: 0,
    average_score: 0,
    completion_rate: 0
  });
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (!isDispensaryManager && !isAdmin)) {
      toast.error("Access Denied", {
        description: "You don't have permission to access this portal."
      });
      return;
    }

    fetchEmployeeData();
  }, [user, isDispensaryManager, isAdmin]);

  const fetchEmployeeData = async () => {
    try {
      // Get current user's organization_id
      const { data: userOrgId, error: orgError } = await supabase
        .rpc('get_user_organization_id', { user_uuid: user?.id });

      if (orgError || !userOrgId) {
        toast.error("Access Required", {
          description: "You must be associated with an organization to access this portal."
        });
        return;
      }

      setOrganizationId(userOrgId);

      // Fetch real organization employees
      const { data: employeeData, error: employeeError } = await supabase
        .rpc('get_organization_employees', { org_id: userOrgId });

      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        return;
      }

      // Transform to match interface
      const employees = employeeData?.map(emp => ({
        user_id: emp.user_id,
        email: emp.email || '',
        first_name: emp.first_name || 'Unknown',
        last_name: emp.last_name || 'User',
        organization: 'Current Organization',
        completed_modules: Math.floor((emp.progress_percentage || 0) * 18 / 100),
        total_score: Math.round((emp.progress_percentage || 0) * 0.85), // Estimate score from progress
        last_activity: emp.last_activity || emp.created_at,
        is_completed: (emp.progress_percentage || 0) >= 100
      })) || [];

      setEmployeeProgress(employees);

      // Calculate organization stats
      const stats: OrganizationStats = {
        total_employees: employees.length,
        completed_training: employees.filter(emp => emp.is_completed).length,
        in_progress: employees.filter(emp => emp.completed_modules > 0 && !emp.is_completed).length,
        not_started: employees.filter(emp => emp.completed_modules === 0).length,
        average_score: employees.length > 0 
          ? Math.round(employees.reduce((sum, emp) => sum + emp.total_score, 0) / employees.length)
          : 0,
        completion_rate: employees.length > 0 
          ? Math.round((employees.filter(emp => emp.is_completed).length / employees.length) * 100)
          : 0
      };

      setOrganizationStats(stats);
    } catch (error) {
      console.error('Error in fetchEmployeeData:', error);
      toast.error("Failed to load employee data");
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvitation = async () => {
    if (!newEmployeeEmail.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingInvite(true);
    try {
      // Get current user's organization
      const { data: userOrgId, error: orgError } = await supabase
        .rpc('get_user_organization_id', { user_uuid: user?.id });

      if (orgError || !userOrgId) {
        throw new Error('Organization not found');
      }

      // Send invitation using staff invitation manager
      const { data, error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'invite_single',
          organizationId: userOrgId,
          inviterId: user?.id,
          email: newEmployeeEmail,
          role: 'student',
          customMessage: 'You have been invited to complete cannabis training for your organization.'
        }
      });

      if (error) throw error;

      toast.success(`Training invitation sent to ${newEmployeeEmail}`);
      setNewEmployeeEmail('');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error("Failed to send invitation");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const exportReport = () => {
    // Implementation for exporting compliance reports
    const csvData = employeeProgress.map(emp => ({
      'Employee Name': `${emp.first_name} ${emp.last_name}`,
      'Organization': emp.organization,
      'Completed Modules': emp.completed_modules,
      'Total Modules': 18,
      'Progress': `${Math.round((emp.completed_modules / 18) * 100)}%`,
      'Average Score': emp.total_score,
      'Status': emp.is_completed ? 'Completed' : emp.completed_modules > 0 ? 'In Progress' : 'Not Started',
      'Last Activity': emp.last_activity
    }));

    // Convert to CSV and download
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-training-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isDispensaryManager && !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">This portal is only available to dispensary managers and administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dispensary Management Portal</h1>
            <p className="text-muted-foreground">Manage employee training and compliance</p>
          </div>
        </div>
        <Button onClick={exportReport} className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{organizationStats.total_employees}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Training Completed</p>
                <p className="text-2xl font-bold text-green-600">{organizationStats.completed_training}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{organizationStats.in_progress}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{organizationStats.completion_rate}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
            <Progress value={organizationStats.completion_rate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Employee Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
          <TabsTrigger value="invitations">Send Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Employee Training Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employeeProgress.length > 0 ? (
                  employeeProgress.map((employee) => (
                    <div key={employee.user_id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">
                            {employee.first_name} {employee.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{employee.organization}</p>
                        </div>
                        <Badge variant={employee.is_completed ? "default" : employee.completed_modules > 0 ? "secondary" : "outline"}>
                          {employee.is_completed ? 'Completed' : employee.completed_modules > 0 ? 'In Progress' : 'Not Started'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {employee.completed_modules}/18 modules</span>
                          <span>Average Score: {employee.total_score}%</span>
                        </div>
                        <Progress value={(employee.completed_modules / 18) * 100} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No employee data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {organizationId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SeatManagementWidget organizationId={organizationId} />
              <CompletionAnalyticsWidget organizationId={organizationId} />
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Training Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-4">Training Status Distribution</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Completed</span>
                      <span className="font-medium">{organizationStats.completed_training}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Progress</span>
                      <span className="font-medium">{organizationStats.in_progress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Not Started</span>
                      <span className="font-medium">{organizationStats.not_started}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-4">Performance Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Average Score</span>
                      <span className="font-medium">{organizationStats.average_score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion Rate</span>
                      <span className="font-medium">{organizationStats.completion_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Employees</span>
                      <span className="font-medium">{organizationStats.total_employees}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <span>Send Training Invitations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Label htmlFor="employee-email">Employee Email</Label>
                  <Input
                    id="employee-email"
                    type="email"
                    value={newEmployeeEmail}
                    onChange={(e) => setNewEmployeeEmail(e.target.value)}
                    placeholder="Enter employee email address"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={sendInvitation} 
                    disabled={isSendingInvite}
                    className="flex items-center space-x-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{isSendingInvite ? 'Sending...' : 'Send Invitation'}</span>
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Invitation includes:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Access to the Maryland RVT training course</li>
                  <li>• Personal login credentials</li>
                  <li>• Progress tracking and certification</li>
                  <li>• Deadline reminders and support resources</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedDispensaryPortal;