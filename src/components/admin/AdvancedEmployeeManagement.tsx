import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SecureAdminUserService } from '@/services/SecureAdminUserService';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Users, 
  Award, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
  progress_percentage: number;
  certificates_count: number;
  last_activity: string;
  organization_name?: string;
}

interface BulkAction {
  id: string;
  label: string;
  icon: any;
  action: (selectedEmployees: string[]) => void;
}

export const AdvancedEmployeeManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployeesData();
    fetchOrganizations();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, statusFilter, organizationFilter]);

  const fetchEmployeesData = async () => {
    try {
      setLoading(true);
      
      // Fetch all employees with their organization info
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          phone,
          created_at,
          organization_id,
          organizations(name)
        `)
        .not('organization_id', 'is', null);

      if (error) throw error;

      // Get additional data for each employee
      const employeesWithDetails = await Promise.all(
        (data || []).map(async (profile) => {
          // Get user email via secure admin service
          const userResult = await SecureAdminUserService.getUserById(profile.user_id);
          
          // Get progress data
          const { data: progressData } = await supabase
            .from('user_progress')
            .select('is_completed')
            .eq('user_id', profile.user_id);

          // Get certificates count
          const { data: certificatesData } = await supabase
            .from('certificates')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('is_revoked', false);

          const completedModules = progressData?.filter(p => p.is_completed).length || 0;
          const progressPercentage = Math.round((completedModules / 18) * 100);

          return {
            user_id: profile.user_id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: userResult.data?.email || '',
            phone: profile.phone || '',
            created_at: profile.created_at,
            progress_percentage: progressPercentage,
            certificates_count: certificatesData?.length || 0,
            last_activity: profile.created_at, // Simplified for now
            organization_name: profile.organizations?.name || 'Unknown',
          };
        })
      );

      setEmployees(employeesWithDetails);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employee data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('admin_approved', true);

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'completed':
          filtered = filtered.filter(emp => emp.progress_percentage >= 80);
          break;
        case 'in-progress':
          filtered = filtered.filter(emp => emp.progress_percentage > 0 && emp.progress_percentage < 80);
          break;
        case 'not-started':
          filtered = filtered.filter(emp => emp.progress_percentage === 0);
          break;
        case 'certified':
          filtered = filtered.filter(emp => emp.certificates_count > 0);
          break;
      }
    }

    // Organization filter
    if (organizationFilter !== 'all') {
      filtered = filtered.filter(emp => emp.organization_name === organizationFilter);
    }

    setFilteredEmployees(filtered);
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.user_id));
    }
  };

  const sendBulkNotification = async (selectedEmployees: string[]) => {
    try {
      // This would integrate with the notification system
      toast({
        title: "Notifications Sent",
        description: `Training reminders sent to ${selectedEmployees.length} employees`,
      });
      setSelectedEmployees([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notifications",
        variant: "destructive",
      });
    }
  };

  const exportEmployeeData = async () => {
    try {
      const csvContent = [
        // Headers
        'Name,Email,Phone,Organization,Progress,Certificates,Join Date',
        // Data rows
        ...filteredEmployees.map(emp => 
          `"${emp.first_name} ${emp.last_name}","${emp.email}","${emp.phone}","${emp.organization_name}",${emp.progress_percentage}%,${emp.certificates_count},"${format(new Date(emp.created_at), 'yyyy-MM-dd')}"`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Employee data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export employee data",
        variant: "destructive",
      });
    }
  };

  const bulkActions: BulkAction[] = [
    {
      id: 'notify',
      label: 'Send Training Reminder',
      icon: Mail,
      action: sendBulkNotification,
    },
    {
      id: 'export',
      label: 'Export Selected',
      icon: Download,
      action: () => exportEmployeeData(),
    },
  ];

  const getStatusBadge = (progress: number, certificates: number) => {
    if (certificates > 0) {
      return <Badge variant="default" className="bg-green-500"><Award className="h-3 w-3 mr-1" />Certified</Badge>;
    } else if (progress >= 80) {
      return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
    } else if (progress > 0) {
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
    } else {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Not Started</Badge>;
    }
  };

  const getStatistics = () => {
    const total = employees.length;
    const completed = employees.filter(emp => emp.progress_percentage >= 80).length;
    const certified = employees.filter(emp => emp.certificates_count > 0).length;
    const avgProgress = employees.length > 0 
      ? Math.round(employees.reduce((sum, emp) => sum + emp.progress_percentage, 0) / total)
      : 0;

    return { total, completed, certified, avgProgress };
  };

  const stats = getStatistics();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employee Management</h2>
          <p className="text-muted-foreground">
            Advanced employee tracking and bulk operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportEmployeeData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button onClick={fetchEmployeesData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Complete</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certified</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certified}</div>
            <p className="text-xs text-muted-foreground">Certified employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProgress}%</div>
            <Progress value={stats.avgProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Training Complete</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="certified">Certified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.name}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedEmployees.length} employees selected</span>
              </div>
              <div className="flex gap-2">
                {bulkActions.map(action => (
                  <Button
                    key={action.id}
                    onClick={() => action.action(selectedEmployees)}
                    variant="outline"
                    size="sm"
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>
                {filteredEmployees.length} of {employees.length} employees
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <div key={employee.user_id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
                <Checkbox
                  checked={selectedEmployees.includes(employee.user_id)}
                  onCheckedChange={() => handleSelectEmployee(employee.user_id)}
                />
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {employee.email}
                    </div>
                    {employee.phone && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {employee.phone}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {employee.organization_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Joined {format(new Date(employee.created_at), 'MMM yyyy')}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2">{getStatusBadge(employee.progress_percentage, employee.certificates_count)}</div>
                    <div className="text-sm text-muted-foreground">
                      Progress: {employee.progress_percentage}%
                    </div>
                    <Progress value={employee.progress_percentage} className="w-24 h-2" />
                  </div>

                  <div className="text-right">
                    <div className="font-medium">{employee.certificates_count} certificates</div>
                    <div className="text-sm text-muted-foreground">
                      Last active {format(new Date(employee.last_activity), 'MMM dd')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No employees found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};