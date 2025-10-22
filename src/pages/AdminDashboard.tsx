import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award,
  FileText,
  AlertTriangle,
  Calendar,
  Building2,
  BarChart3,
  Settings,
  Search
} from 'lucide-react';
import { SmartNotificationSystem } from '@/components/admin/SmartNotificationSystem';
import { BulkOperationsManager } from '@/components/admin/BulkOperationsManager';
import { PredictiveAnalyticsDashboard } from '@/components/admin/PredictiveAnalyticsDashboard';
import { EnhancedSearchFilter } from '@/components/admin/EnhancedSearchFilter';
import DispensaryApplicationManager from '@/components/admin/DispensaryApplicationManager';
import DispensaryManagerSetup from '@/components/admin/DispensaryManagerSetup';
import TestAccountCreator from '@/components/admin/TestAccountCreator';
import { ComprehensiveAdminOversight } from '@/components/admin/ComprehensiveAdminOversight';
import { StaffInvitationSystem } from '@/components/admin/StaffInvitationSystem';
import { ComplianceReportingDashboard } from '@/components/admin/ComplianceReportingDashboard';
import { AdvancedEmployeeManagement } from '@/components/admin/AdvancedEmployeeManagement';
import { SecurityMonitoringDashboard } from '@/components/admin/SecurityMonitoringDashboard';
import EmailMonitoringDashboard from '@/components/admin/EmailMonitoringDashboard';
import { ProfileChangeHistoryViewer } from '@/components/admin/ProfileChangeHistoryViewer';
import { WhoIsHereWidget } from '@/components/realtime/WhoIsHereWidget';
import { AuthActivityFeed } from '@/components/realtime/AuthActivityFeed';
import { RealTimeEmailDashboard } from '@/components/admin/RealTimeEmailDashboard';
import { EnhancedEmailHealthDashboard } from '@/components/admin/EnhancedEmailHealthDashboard';
import { EmailTemplateManager } from '@/components/admin/EmailTemplateManager';
import { UserEmailHistory } from '@/components/admin/UserEmailHistory';
import { EmailAnalyticsCharts } from '@/components/admin/EmailAnalyticsCharts';
import { EmailProviderSettings } from '@/components/admin/EmailProviderSettings';
import { TestEmailSender } from '@/components/admin/TestEmailSender';
import { FormHealthMonitor } from '@/pages/OwnersIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalCertificates: number;
  totalRevenue: number;
  monthlyGrowth: number;
  completionRate: number;
  expiringCertificates: number;
}

interface UserAnalytics {
  id: string;
  first_name: string;
  last_name: string;
  organization: string;
  created_at: string;
  lastActivity: string;
  completionStatus: string;
}

interface OrganizationData {
  name: string;
  employeeCount: number;
  completionRate: number;
  totalSpent: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalOrganizations: 0,
    totalCertificates: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    completionRate: 0,
    expiringCertificates: 0
  });
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAdminData();
    }
  }, [user]);

  // Phase 2: Add real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels: any[] = [];

    // Users subscription
    const usersChannel = supabase
      .channel('admin-users-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('User change detected, refreshing...');
          fetchAdminData();
        }
      )
      .subscribe();

    // Organizations subscription
    const orgsChannel = supabase
      .channel('admin-orgs-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'organizations' },
        () => fetchAdminData()
      )
      .subscribe();

    // Certificates subscription
    const certsChannel = supabase
      .channel('admin-certs-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'certificates' },
        () => fetchAdminData()
      )
      .subscribe();

    // Payments subscription
    const paymentsChannel = supabase
      .channel('admin-payments-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => fetchAdminData()
      )
      .subscribe();

    channels.push(usersChannel, orgsChannel, certsChannel, paymentsChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user]);

  const searchUsers = async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      searchUsers(userSearchTerm);
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [userSearchTerm]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // Fetch users data
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      // Fetch certificates data
      const { data: certificatesData, error: certificatesError } = await supabase
        .from('certificates')
        .select('*');

      if (certificatesError) throw certificatesError;

      // Fetch organizations data
      const { data: organizationsData, error: organizationsError } = await supabase
        .from('organizations')
        .select('*');

      if (organizationsError) throw organizationsError;

      // Fetch payments data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*');

      if (paymentsError) throw paymentsError;

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*');

      if (progressError) throw progressError;

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const totalOrganizations = organizationsData?.length || 0;
      const totalCertificates = certificatesData?.filter(cert => !cert.is_revoked).length || 0;
      const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      
      // Calculate completion rate
      const completedUsers = certificatesData?.filter(cert => !cert.is_revoked).length || 0;
      const completionRate = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0;

      // Calculate expiring certificates (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringCertificates = certificatesData?.filter(cert => {
        if (!cert.expiry_date || cert.is_revoked) return false;
        const expiryDate = new Date(cert.expiry_date);
        return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
      }).length || 0;

      setStats({
        totalUsers,
        totalOrganizations,
        totalCertificates,
        totalRevenue,
        monthlyGrowth: 12.5, // Mock data
        completionRate,
        expiringCertificates
      });

      // Process users data for analytics
      const processedUsers = usersData?.map(user => ({
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        organization: user.organization || 'Individual',
        created_at: user.created_at,
        lastActivity: user.updated_at || user.created_at,
        completionStatus: certificatesData?.some(cert => cert.user_id === user.user_id && !cert.is_revoked) 
          ? 'Completed' : 'In Progress'
      })) || [];

      setUsers(processedUsers);

      // Process organization data
      const orgGroups = usersData?.reduce((acc: Record<string, any[]>, user) => {
        const org = user.organization || 'Individual';
        if (!acc[org]) acc[org] = [];
        acc[org].push(user);
        return acc;
      }, {}) || {};

      const processedOrgs = Object.entries(orgGroups).map(([orgName, orgUsers]) => {
        const employeeCount = orgUsers.length;
        const completedInOrg = orgUsers.filter(user => 
          certificatesData?.some(cert => cert.user_id === user.user_id && !cert.is_revoked)
        ).length;
        const completionRate = employeeCount > 0 ? Math.round((completedInOrg / employeeCount) * 100) : 0;
        
        return {
          name: orgName,
          employeeCount,
          completionRate,
          totalSpent: Math.round(Math.random() * 10000) // Mock data
        };
      });

      setOrganizations(processedOrgs);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Unable to load admin dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Settings className="h-12 w-12 text-green-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-700 flex items-center">
            <Settings className="mr-3 h-8 w-8" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Platform analytics and management overview</p>
        </div>

        {/* Phase 7: Real-Time Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <WhoIsHereWidget />
          <AuthActivityFeed />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-green-700">{stats.totalUsers}</p>
                  <p className="text-sm text-green-600">+{stats.monthlyGrowth}% this month</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Organizations</p>
                  <p className="text-3xl font-bold text-blue-700">{stats.totalOrganizations}</p>
                  <p className="text-sm text-blue-600">Active clients</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Certificates</p>
                  <p className="text-3xl font-bold text-yellow-700">{stats.totalCertificates}</p>
                  <p className="text-sm text-yellow-600">{stats.completionRate}% completion rate</p>
                </div>
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-3xl font-bold text-green-700">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-sm text-green-600">Total earnings</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Cards */}
        {stats.expiringCertificates > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <div>
                  <p className="font-medium text-orange-800">
                    {stats.expiringCertificates} certificates are expiring within 30 days
                  </p>
                  <p className="text-sm text-orange-600">
                    Consider sending renewal reminders to affected users and organizations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-13">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="form-health">🔧 Form Health</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="test-accounts">Test Accounts</TabsTrigger>
            <TabsTrigger value="oversight">Oversight</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="profile-audit">👤 Profile Audit</TabsTrigger>
            <TabsTrigger value="email-monitoring">📧 Email</TabsTrigger>
            <TabsTrigger value="email-tracking">📬 Email Tracking</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Users className="mr-2 h-5 w-5" />
                  User Analytics & Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-700">Active Users</h3>
                      <p className="text-2xl font-bold text-green-600">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-700">Completed Training</h3>
                      <p className="text-2xl font-bold text-blue-600">{stats.totalCertificates}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-purple-700">Success Rate</h3>
                      <p className="text-2xl font-bold text-purple-600">{stats.completionRate}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {users.slice(0, 10).map((user) => (
                      <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {user.first_name} {user.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">{user.organization}</p>
                            <p className="text-xs text-gray-500">
                              Joined: {formatDate(user.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              user.completionStatus === 'Completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }>
                              {user.completionStatus}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              Last active: {formatDate(user.lastActivity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form-health">
            <FormHealthMonitor />
          </TabsContent>

          <TabsContent value="organizations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Building2 className="mr-2 h-5 w-5" />
                  Organization Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {organizations.map((org, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{org.name}</h3>
                          <p className="text-sm text-gray-600">
                            {org.employeeCount} employees
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(org.totalSpent)}
                          </p>
                          <p className="text-sm text-gray-600">Total spent</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Completion Rate</span>
                        <span className="text-sm font-medium">{org.completionRate}%</span>
                      </div>
                      <Progress value={org.completionRate} className="mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <DispensaryApplicationManager />
          </TabsContent>

          <TabsContent value="setup">
            <DispensaryManagerSetup />
          </TabsContent>

          <TabsContent value="test-accounts">
            <TestAccountCreator />
          </TabsContent>

          <TabsContent value="oversight">
            <ComprehensiveAdminOversight />
          </TabsContent>

          <TabsContent value="invitations">
            <StaffInvitationSystem />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceReportingDashboard />
          </TabsContent>

          <TabsContent value="employees">
            <AdvancedEmployeeManagement />
          </TabsContent>

          <TabsContent value="security">
            <SecurityMonitoringDashboard />
          </TabsContent>

          <TabsContent value="profile-audit">
            <Card>
              <CardHeader>
                <CardTitle>Profile Change Audit Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Search User</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={userSearchTerm}
                      onChange={e => setUserSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchLoading && (
                    <p className="text-sm text-muted-foreground">Searching...</p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {searchResults.map(user => (
                        <button
                          key={user.user_id}
                          onClick={() => {
                            setSelectedUserId(user.user_id);
                            setUserSearchTerm(`${user.first_name} ${user.last_name}`);
                            setSearchResults([]);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-accent transition-colors"
                        >
                          {user.first_name} {user.last_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUserId && (
                  <ProfileChangeHistoryViewer userId={selectedUserId} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email-monitoring">
            <EmailMonitoringDashboard />
          </TabsContent>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Revenue Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Revenue Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700">Total Revenue</span>
                        <span className="font-bold text-green-800">
                          {formatCurrency(stats.totalRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-blue-700">Monthly Growth</span>
                        <span className="font-bold text-blue-800">+{stats.monthlyGrowth}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-purple-700">Avg. per User</span>
                        <span className="font-bold text-purple-800">
                          {formatCurrency(stats.totalUsers > 0 ? stats.totalRevenue / stats.totalUsers : 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Performance Metrics</h3>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Conversion Rate</span>
                          <span className="text-sm font-medium">85%</span>
                        </div>
                        <Progress value={85} />
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Customer Retention</span>
                          <span className="text-sm font-medium">92%</span>
                        </div>
                        <Progress value={92} />
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Training Completion</span>
                          <span className="text-sm font-medium">{stats.completionRate}%</span>
                        </div>
                        <Progress value={stats.completionRate} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <FileText className="mr-2 h-5 w-5" />
                  System Reports & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Quick Reports</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span>Daily User Activity</span>
                        <BarChart3 className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span>Certificate Issuance Report</span>
                        <Award className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span>Revenue Breakdown</span>
                        <DollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span>Organization Performance</span>
                        <Building2 className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">System Health</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-green-700">Platform Uptime</span>
                          <Badge className="bg-green-100 text-green-800">99.9%</Badge>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700">Database Performance</span>
                          <Badge className="bg-blue-100 text-blue-800">Optimal</Badge>
                        </div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-700">Pending Support Tickets</span>
                          <Badge className="bg-yellow-100 text-yellow-800">3</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <SmartNotificationSystem />
          </TabsContent>

          <TabsContent value="bulk">
            <BulkOperationsManager />
          </TabsContent>

          <TabsContent value="analytics">
            <PredictiveAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="email-tracking">
            <RealTimeEmailDashboard />
          </TabsContent>

          <TabsContent value="email-health">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="test">Test</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <EnhancedEmailHealthDashboard />
              </TabsContent>

                <TabsContent value="templates">
                  <EmailTemplateManager />
                </TabsContent>

                <TabsContent value="test">
                  <TestEmailSender />
                </TabsContent>

                <TabsContent value="search">
                  <UserEmailHistory />
                </TabsContent>

              <TabsContent value="analytics">
                <EmailAnalyticsCharts />
              </TabsContent>

              <TabsContent value="settings">
                <EmailProviderSettings />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Enhanced Search Filter - Always Available */}
        <EnhancedSearchFilter />
      </div>
    </div>
  );
};

export default AdminDashboard;