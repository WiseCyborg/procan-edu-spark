import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Activity,
  CreditCard,
  CheckCircle,
  Clock,
  Download,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationOverview {
  id: string;
  name: string;
  contact_email: string;
  course_credits: number;
  payment_status: string;
  admin_approved: boolean;
  total_employees: number;
  completed_training: number;
  in_progress: number;
  last_activity: string;
  completion_rate: number;
}

interface EmployeeActivity {
  user_id: string;
  employee_name: string;
  organization_name: string;
  action: string;
  timestamp: string;
  details: any;
}

interface CreditUsage {
  organization_id: string;
  organization_name: string;
  initial_credits: number;
  used_credits: number;
  remaining_credits: number;
  last_purchase_date: string;
}

export const ComprehensiveAdminOversight = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [organizations, setOrganizations] = useState<OrganizationOverview[]>([]);
  const [employeeActivities, setEmployeeActivities] = useState<EmployeeActivity[]>([]);
  const [creditUsage, setCreditUsage] = useState<CreditUsage[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOrganizationOverviews(),
        fetchEmployeeActivities(),
        fetchCreditUsage()
      ]);
    } catch (error) {
      console.error('Error fetching oversight data:', error);
      toast({
        title: "Error",
        description: "Failed to load oversight data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationOverviews = async () => {
    try {
      // Fetch organizations with employee counts
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          contact_email,
          course_credits,
          payment_status,
          admin_approved,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // For each organization, get employee statistics
      const orgOverviews = await Promise.all(
        (orgsData || []).map(async (org) => {
          const { data: employees, error: empError } = await supabase
            .rpc('get_organization_employees', { org_id: org.id });

          if (empError) {
            console.error('Error fetching employees for org:', org.id, empError);
            return {
              ...org,
              total_employees: 0,
              completed_training: 0,
              in_progress: 0,
              completion_rate: 0,
              last_activity: org.updated_at
            };
          }

          const totalEmployees = employees?.length || 0;
          const completedTraining = employees?.filter(emp => emp.progress_percentage >= 100).length || 0;
          const inProgress = employees?.filter(emp => emp.progress_percentage > 0 && emp.progress_percentage < 100).length || 0;
          const lastActivity = employees?.reduce((latest, emp) => 
            emp.last_activity > latest ? emp.last_activity : latest, 
            org.updated_at
          ) || org.updated_at;

          return {
            ...org,
            total_employees: totalEmployees,
            completed_training: completedTraining,
            in_progress: inProgress,
            completion_rate: totalEmployees > 0 ? Math.round((completedTraining / totalEmployees) * 100) : 0,
            last_activity: lastActivity
          };
        })
      );

      setOrganizations(orgOverviews);
    } catch (error) {
      console.error('Error fetching organization overviews:', error);
    }
  };

  const fetchEmployeeActivities = async () => {
    try {
      // Fetch recent employee registrations and progress updates
      const { data: recentProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          created_at,
          updated_at,
          organization_id,
          organizations!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (profilesError) throw profilesError;

      // Transform to activity format
      const activities = recentProfiles?.map(profile => ({
        user_id: profile.user_id,
        employee_name: `${profile.first_name || 'Unknown'} ${profile.last_name || 'User'}`,
        organization_name: (profile.organizations as any)?.name || 'Unknown Organization',
        action: 'Employee Registration',
        timestamp: profile.created_at,
        details: { type: 'registration' }
      })) || [];

      setEmployeeActivities(activities);
    } catch (error) {
      console.error('Error fetching employee activities:', error);
    }
  };

  const fetchCreditUsage = async () => {
    try {
      const { data: orgsData, error } = await supabase
        .from('organizations')
        .select('id, name, course_credits, created_at')
        .eq('admin_approved', true);

      if (error) throw error;

      // Calculate credit usage (simplified - would need payment history for accurate data)
      const creditUsageData = orgsData?.map(org => {
        const initialCredits = 10; // Default initial credits
        const usedCredits = initialCredits - org.course_credits;
        
        return {
          organization_id: org.id,
          organization_name: org.name,
          initial_credits: initialCredits,
          used_credits: Math.max(0, usedCredits),
          remaining_credits: org.course_credits,
          last_purchase_date: org.created_at
        };
      }) || [];

      setCreditUsage(creditUsageData);
    } catch (error) {
      console.error('Error fetching credit usage:', error);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && org.admin_approved && org.payment_status === 'paid') ||
      (statusFilter === 'pending' && (!org.admin_approved || org.payment_status !== 'paid')) ||
      (statusFilter === 'inactive' && !org.admin_approved);
    
    return matchesSearch && matchesStatus;
  });

  const getTotalStats = () => {
    return {
      totalOrganizations: organizations.length,
      activeOrganizations: organizations.filter(org => org.admin_approved && org.payment_status === 'paid').length,
      totalEmployees: organizations.reduce((sum, org) => sum + org.total_employees, 0),
      totalCompletedTraining: organizations.reduce((sum, org) => sum + org.completed_training, 0),
      averageCompletionRate: organizations.length > 0 ? 
        Math.round(organizations.reduce((sum, org) => sum + org.completion_rate, 0) / organizations.length) : 0,
      totalCreditsRemaining: organizations.reduce((sum, org) => sum + org.course_credits, 0)
    };
  };

  const stats = getTotalStats();

  const exportOrganizationReport = () => {
    const csvData = filteredOrganizations.map(org => ({
      'Organization': org.name,
      'Contact Email': org.contact_email,
      'Status': org.admin_approved ? 'Approved' : 'Pending',
      'Payment Status': org.payment_status,
      'Credits Remaining': org.course_credits,
      'Total Employees': org.total_employees,
      'Completed Training': org.completed_training,
      'In Progress': org.in_progress,
      'Completion Rate': `${org.completion_rate}%`,
      'Last Activity': new Date(org.last_activity).toLocaleDateString()
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organization-oversight-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading oversight data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Administrative Oversight</h2>
          <p className="text-muted-foreground">Monitor all organization activities and performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAllData} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportOrganizationReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Organizations</p>
                <p className="text-2xl font-bold">{stats.totalOrganizations}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeOrganizations}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trained</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalCompletedTraining}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-bold">{stats.averageCompletionRate}%</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits Left</p>
                <p className="text-2xl font-bold">{stats.totalCreditsRemaining}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Organization Overview</TabsTrigger>
          <TabsTrigger value="activities">Employee Activities</TabsTrigger>
          <TabsTrigger value="credits">Credit Management</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Organization Performance</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search organizations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredOrganizations.map((org) => (
                  <div key={org.id} className="border rounded-lg p-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{org.name}</h3>
                            <p className="text-sm text-muted-foreground">{org.contact_email}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={org.admin_approved ? "default" : "secondary"}>
                              {org.admin_approved ? 'Approved' : 'Pending'}
                            </Badge>
                            <Badge variant={org.payment_status === 'paid' ? "default" : "outline"}>
                              {org.payment_status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Employees</p>
                          <p className="font-semibold">{org.total_employees}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Trained</p>
                          <p className="font-semibold text-green-600">{org.completed_training}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Completion</p>
                          <p className="font-semibold">{org.completion_rate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Credits</p>
                          <p className="font-semibold">{org.course_credits}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Employee Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employeeActivities.slice(0, 20).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">{activity.employee_name}</p>
                        <p className="text-sm text-muted-foreground">{activity.organization_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit Usage Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {creditUsage.map((usage) => (
                  <div key={usage.organization_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{usage.organization_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Last purchase: {new Date(usage.last_purchase_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Initial</p>
                          <p className="font-semibold">{usage.initial_credits}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Used</p>
                          <p className="font-semibold text-orange-600">{usage.used_credits}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Remaining</p>
                          <p className="font-semibold text-green-600">{usage.remaining_credits}</p>
                        </div>
                        <div className="w-24">
                          <Progress 
                            value={(usage.remaining_credits / usage.initial_credits) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Data Integrity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Organizations with employees</span>
                      <Badge variant="default">
                        {organizations.filter(org => org.total_employees > 0).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Organizations without employees</span>
                      <Badge variant="outline">
                        {organizations.filter(org => org.total_employees === 0).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Approved organizations</span>
                      <Badge variant="default">
                        {organizations.filter(org => org.admin_approved).length}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Average completion rate</span>
                      <Badge variant="default">{stats.averageCompletionRate}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Organizations with 100% completion</span>
                      <Badge variant="default">
                        {organizations.filter(org => org.completion_rate === 100).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Organizations with no progress</span>
                      <Badge variant="outline">
                        {organizations.filter(org => org.completion_rate === 0).length}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveAdminOversight;