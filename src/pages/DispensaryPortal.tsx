import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  FileText, 
  Download,
  Plus,
  Search,
  UserCheck,
  Calendar,
  Award,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  organization: string;
  created_at: string;
}

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  is_revoked: boolean;
  user_id: string;
}

interface Progress {
  user_id: string;
  course_id: string;
  is_completed: boolean;
  completed_at: string;
  score: number;
}

interface AtRiskEmployee {
  user_id: string;
  first_name: string;
  last_name: string;
  modules_completed: number;
  completion_percentage: number;
  last_activity_at: string;
  days_inactive: number;
}

const DispensaryPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [atRiskEmployees, setAtRiskEmployees] = useState<AtRiskEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchOrganizationData();
    }
  }, [user]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);

      // Get current user's organization_id
      const { data: userOrgId, error: orgError } = await supabase
        .rpc('get_user_organization_id', { user_uuid: user?.id });

      if (orgError || !userOrgId) {
        toast({
          title: "Access Required",
          description: "You must be associated with an organization to access this portal.",
          variant: "destructive"
        });
        return;
      }

      // Fetch organization employees using the new function
      const { data: employeeData, error: employeeError } = await supabase
        .rpc('get_organization_employees', { org_id: userOrgId });

      if (employeeError) throw employeeError;

      // Transform data to match expected interface
      const transformedEmployees = employeeData?.map(emp => ({
        id: emp.user_id,
        first_name: emp.first_name || 'Unknown',
        last_name: emp.last_name || 'User',
        user_id: emp.user_id,
        organization: 'Current Organization',
        created_at: emp.created_at
      })) || [];

      setEmployees(transformedEmployees);

      // Fetch certificates for organization employees
      const userIds = employeeData?.map(emp => emp.user_id) || [];
      if (userIds.length > 0) {
        const { data: certData, error: certError } = await supabase
          .from('certificates')
          .select('*')
          .in('user_id', userIds);

        if (certError) throw certError;
        setCertificates(certData || []);

        // Fetch progress for organization employees
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .in('user_id', userIds);

        if (progressError) throw progressError;
        setProgress(progressData || []);

        // Fetch at-risk employees from learning journey
        const { data: atRiskData, error: atRiskError } = await supabase
          .from('user_learning_journey')
          .select(`
            user_id,
            modules_completed,
            completion_percentage,
            last_activity_at,
            at_risk_flag
          `)
          .eq('organization_id', userOrgId)
          .eq('at_risk_flag', true);

        if (!atRiskError && atRiskData) {
          // Enrich with employee names
          const enrichedAtRisk = atRiskData
            .map(risk => {
              const emp = employeeData?.find(e => e.user_id === risk.user_id);
              if (!emp) return null;
              
              const lastActivity = new Date(risk.last_activity_at);
              const daysInactive = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
              
              return {
                user_id: risk.user_id,
                first_name: emp.first_name || 'Unknown',
                last_name: emp.last_name || 'User',
                modules_completed: risk.modules_completed,
                completion_percentage: risk.completion_percentage,
                last_activity_at: risk.last_activity_at,
                days_inactive: daysInactive
              };
            })
            .filter(Boolean) as AtRiskEmployee[];
          
          setAtRiskEmployees(enrichedAtRisk);
        }
      }

    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast({
        title: "Error",
        description: "Unable to load organization data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeeStats = () => {
    const totalEmployees = employees.length;
    const completedTraining = certificates.filter(cert => !cert.is_revoked).length;
    const expiringCertificates = certificates.filter(cert => {
      if (!cert.expiry_date || cert.is_revoked) return false;
      const expiryDate = new Date(cert.expiry_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiryDate <= thirtyDaysFromNow;
    }).length;

    return {
      totalEmployees,
      completedTraining,
      completionRate: totalEmployees > 0 ? Math.round((completedTraining / totalEmployees) * 100) : 0,
      expiringCertificates
    };
  };

  const getEmployeeCertificate = (userId: string) => {
    return certificates.find(cert => cert.user_id === userId && !cert.is_revoked);
  };

  const getEmployeeProgress = (userId: string) => {
    const userProgress = progress.filter(p => p.user_id === userId);
    const completed = userProgress.filter(p => p.is_completed).length;
    return {
      completed,
      total: 18, // Total modules
      percentage: Math.round((completed / 18) * 100)
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > new Date();
  };

  const stats = getEmployeeStats();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-green-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading dispensary portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-700 flex items-center">
              <Building2 className="mr-3 h-8 w-8" />
              Dispensary Portal
            </h1>
            <p className="text-gray-600 mt-1">Manage your organization's cannabis training compliance</p>
          </div>
          <Button className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {/* At-Risk Employees Alert */}
        {atRiskEmployees.length > 0 && (
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>At-Risk Employees Detected</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="font-medium">
                  {atRiskEmployees.length} employee{atRiskEmployees.length !== 1 ? 's' : ''} {atRiskEmployees.length !== 1 ? 'have' : 'has'} been inactive for 7+ days:
                </p>
                <div className="space-y-1">
                  {atRiskEmployees.slice(0, 3).map(emp => (
                    <div key={emp.user_id} className="flex justify-between items-center text-sm">
                      <span>
                        {emp.first_name} {emp.last_name}
                      </span>
                      <Badge variant="outline" className="bg-white">
                        {emp.completion_percentage}% complete • {emp.days_inactive} days inactive
                      </Badge>
                    </div>
                  ))}
                  {atRiskEmployees.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{atRiskEmployees.length - 3} more at-risk employees
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Send Reminder Emails
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-3xl font-bold text-green-700">{stats.totalEmployees}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Certified</p>
                  <p className="text-3xl font-bold text-blue-700">{stats.completedTraining}</p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-700">{stats.completionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-3xl font-bold text-orange-700">{stats.expiringCertificates}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employees">Employee Management</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center text-green-700">
                    <Users className="mr-2 h-5 w-5" />
                    Employee Training Status
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredEmployees.map((employee) => {
                    const certificate = getEmployeeCertificate(employee.user_id);
                    const employeeProgress = getEmployeeProgress(employee.user_id);
                    
                    return (
                      <div key={employee.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {employee.first_name} {employee.last_name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Joined: {formatDate(employee.created_at)}
                                </p>
                              </div>
                              <div className="flex-1 max-w-md">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Progress</span>
                                  <span>{employeeProgress.percentage}%</span>
                                </div>
                                <Progress value={employeeProgress.percentage} className="w-full" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {certificate ? (
                              <div className="text-right">
                                <Badge className="bg-green-100 text-green-800 mb-1">
                                  Certified
                                </Badge>
                                <p className="text-xs text-gray-600">
                                  Expires: {formatDate(certificate.expiry_date || '')}
                                </p>
                                {isExpiringSoon(certificate.expiry_date) && (
                                  <Badge className="bg-orange-100 text-orange-800 mt-1">
                                    Expiring Soon
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">
                                Not Certified
                              </Badge>
                            )}
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <FileText className="mr-2 h-5 w-5" />
                  Compliance Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Available Reports</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Employee Certification Status
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Training Completion Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Certificate Expiry Schedule
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        MCA Compliance Audit
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Compliance Overview</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700">Fully Compliant Employees</span>
                        <Badge className="bg-green-100 text-green-800">
                          {stats.completedTraining}/{stats.totalEmployees}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <span className="text-orange-700">Expiring in 30 Days</span>
                        <Badge className="bg-orange-100 text-orange-800">
                          {stats.expiringCertificates}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-blue-700">Overall Compliance Rate</span>
                        <Badge className="bg-blue-100 text-blue-800">
                          {stats.completionRate}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Award className="mr-2 h-5 w-5" />
                  Certificate Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {certificates.map((certificate) => {
                    const employee = employees.find(emp => emp.user_id === certificate.user_id);
                    
                    return (
                      <div key={certificate.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {employee?.first_name} {employee?.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Certificate: {certificate.certificate_number}
                            </p>
                            <p className="text-sm text-gray-600">
                              Issued: {formatDate(certificate.issue_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="space-y-1">
                              {certificate.is_revoked ? (
                                <Badge className="bg-red-100 text-red-800">Revoked</Badge>
                              ) : isExpiringSoon(certificate.expiry_date) ? (
                                <Badge className="bg-orange-100 text-orange-800">Expiring Soon</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800">Valid</Badge>
                              )}
                            </div>
                            {certificate.expiry_date && (
                              <p className="text-sm text-gray-600 mt-1">
                                Expires: {formatDate(certificate.expiry_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DispensaryPortal;