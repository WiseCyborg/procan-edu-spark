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
import { AdvancedSeatManagement } from '@/components/team/AdvancedSeatManagement';
import { EmployeeInvitationForm } from '@/components/team/EmployeeInvitationForm';
import { SeatRequestManager } from '@/components/team/SeatRequestManager';
import { PurchaseSeatsDialog } from '@/components/team/PurchaseSeatsDialog';
import { EmployeeRosterWidget } from '@/components/team/EmployeeRosterWidget';
import { TeamManagementPanel } from '@/components/team/TeamManagementPanel';
import { ResumePrompt } from '@/components/journey/ResumePrompt';
import { Building2, CreditCard, Users, FileText, Settings, ShieldCheck, Key, Copy, ShoppingCart, PartyPopper, X, RefreshCw, Check, Circle, Mail, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';

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
import { AiLeanCoach } from '@/components/ailean/AiLeanCoach';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { InternalChatbot } from '@/components/chat/InternalChatbot';

const DispensaryManagerDashboard = () => {
  const { user } = useAuth();
  const { isDispensaryManager, isLoading: roleLoading } = useUserRole();
  const { organization, isLoading: orgLoading, refreshOrganization } = useOrganization();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showWelcome = searchParams.get('welcome') === 'true';
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [joinCodes, setJoinCodes] = useState<any[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [userFirstName, setUserFirstName] = useState<string>('');

  useEffect(() => {
    if (!roleLoading && !isDispensaryManager) {
      toast.error('Access denied: Dispensary Manager role required');
      navigate('/');
      return;
    }

    if (user && isDispensaryManager && organization?.id) {
      fetchCoordinators();
      fetchComplianceData();
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
    if (!organization?.id || !user) return;

    try {
      // Get user profile for first name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', user.id)
        .single();
        
      if (profile?.first_name) {
        setUserFirstName(profile.first_name);
      }

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

  const fetchComplianceData = async () => {
    if (!organization?.id) return;

    try {
      // Fetch certificates
      const { data: certsData } = await supabase
        .rpc('get_organization_certificates', { org_id: organization.id });
      setCertificates(certsData || []);

      // Fetch employee profiles
      const { data: empsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organization.id);
      setEmployees(empsData || []);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    }
  };

  const generateCompliancePDF = () => {
    if (!organization) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MCA Compliance Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Organization Information', 14, yPos);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${organization.name}`, 14, yPos);
    yPos += 7;
    doc.text(`License Number: ${organization.license_number}`, 14, yPos);
    yPos += 7;
    doc.text(`Dispensary Number: ${organization.dispensary_number}`, 14, yPos);
    yPos += 7;
    doc.text(`License Type: ${organization.license_type || 'N/A'}`, 14, yPos);
    
    // Compliance Score
    yPos += 15;
    const certifiedCount = certificates.filter(c => !c.is_revoked).length;
    const complianceScore = employees.length > 0 
      ? Math.round((certifiedCount / employees.length) * 100)
      : 0;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Team Compliance Score: ${complianceScore}%`, 14, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Certified Employees: ${certifiedCount} / ${employees.length}`, 14, yPos);
    
    // Certificate List
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Certified Employees', 14, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    certificates.filter(c => !c.is_revoked).forEach((cert, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(`${index + 1}. ${cert.first_name} ${cert.last_name}`, 14, yPos);
      yPos += 5;
      doc.text(`   Certificate: ${cert.certificate_number}`, 14, yPos);
      yPos += 5;
      doc.text(`   Issued: ${new Date(cert.issued_at).toLocaleDateString()}`, 14, yPos);
      yPos += 5;
      doc.text(`   Expires: ${new Date(cert.expiry_date).toLocaleDateString()}`, 14, yPos);
      yPos += 8;
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `ProCann Edu - Maryland RVT Compliance Report | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`${organization.name}_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Compliance report downloaded successfully');
  };

  const handleRestartOnboarding = () => {
    if (!user) return;

    // Clear localStorage
    localStorage.removeItem(`onboarding_complete_${user.id}`);
    
    // Close dialog
    setShowRestartDialog(false);
    
    // Show success toast
    toast.success('Setup wizard reset! Redirecting...', {
      description: 'You will be redirected to the onboarding wizard.',
    });

    // Redirect after short delay
    setTimeout(() => {
      navigate('/onboarding/setup-team?first_login=true');
    }, 1000);
  };

  // Calculate onboarding progress
  const onboardingSteps = [
    {
      title: 'Organization Setup',
      description: 'Complete your organization profile',
      completed: !!organization?.name && !!organization?.dispensary_number
    },
    {
      title: 'Training Coordinator Assignment',
      description: 'Assign at least one training coordinator',
      completed: coordinators.length > 0
    },
    {
      title: 'Employee Invitations',
      description: 'Invite your first employees',
      completed: joinCodes.length > 0 && joinCodes.some(code => code.current_uses > 0)
    },
    {
      title: 'First Seat Purchase',
      description: 'Purchase training seats for your team',
      completed: (organization?.course_credits || 0) > 0
    }
  ];

  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / onboardingSteps.length) * 100;

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
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Resume Prompt */}
      <ResumePrompt />

      {/* Header with Quick Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Manager Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your team's training and certification</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:w-auto">
          <Badge variant="outline" className="text-base md:text-lg px-3 md:px-4 py-2 justify-center">
            <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{organization.dispensary_number}</span>
          </Badge>
          <Button 
            size="lg" 
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.set('tab', 'invite');
              setSearchParams(params);
            }}
            className="w-full sm:w-auto h-11 md:h-10 bg-primary hover:bg-primary/90"
          >
            <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
            Invite Employee
            {organization && organization.course_credits > 0 && (
              <Badge variant="secondary" className="ml-2">
                {organization.course_credits} seats
              </Badge>
            )}
          </Button>
          <Button 
            size="lg" 
            onClick={() => setShowPurchaseModal(true)}
            variant="outline"
            className="w-full sm:w-auto h-11 md:h-10"
          >
            <ShoppingCart className="mr-2 h-4 w-4 flex-shrink-0" />
            Purchase Training Seats
          </Button>
        </div>
      </div>

      {/* Organization Overview */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-sm md:text-base font-medium">Organization</CardTitle>
            <Building2 className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="text-lg md:text-2xl font-bold truncate">{organization.name}</div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
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

      {/* Welcome Banner */}
      {showWelcome && !welcomeDismissed && (
        <Alert className="bg-green-50 border-green-200 relative">
          <PartyPopper className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 font-semibold">
            Welcome to ProCann Edu! 🎉
          </AlertTitle>
          <AlertDescription className="text-green-700">
            Your team management dashboard is ready. You can now invite employees, 
            track their progress, and manage training seats.
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => {
              setWelcomeDismissed(true);
              searchParams.delete('welcome');
              setSearchParams(searchParams);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 mr-2" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="seats">Seat Management</TabsTrigger>
          <TabsTrigger value="seat-requests">Seat Requests</TabsTrigger>
          <TabsTrigger value="invite">Invite Employees</TabsTrigger>
          <TabsTrigger value="coordinators">Team Management</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Onboarding Progress Indicator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Setup Progress</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {completedSteps} of {onboardingSteps.length} completed
                </span>
              </CardTitle>
              <CardDescription>
                Complete these steps to get your team started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                {onboardingSteps.map((step, index) => (
                  <div 
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      step.completed 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                      step.completed 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.completed ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Circle className="w-2 h-2" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        step.completed ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <SeatManagementWidget organizationId={organization.id} />
            <CompletionAnalyticsWidget organizationId={organization.id} />
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <EmployeeRosterWidget organizationId={organization.id} />
        </TabsContent>
        
        <TabsContent value="seats" className="space-y-4">
          <AdvancedSeatManagement organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="seat-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Seat Requests</CardTitle>
              <CardDescription>Review and approve seat requests from training coordinators</CardDescription>
            </CardHeader>
            <CardContent>
              <SeatRequestManager organizationId={organization.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invite" className="space-y-4">
          <EmployeeInvitationForm 
            organizationId={organization.id}
            organizationName={organization.name}
            onInvitationsSent={refreshOrganization}
          />
        </TabsContent>

        <TabsContent value="coordinators" className="space-y-4">
          <TeamManagementPanel 
            organizationId={organization.id} 
            organizationName={organization.name} 
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                MCA Compliance Report
              </CardTitle>
              <CardDescription>
                Download a comprehensive compliance report for MCA audits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Compliance Score */}
              <div className="p-6 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Team Compliance Score</h3>
                  <Badge variant="outline" className="text-2xl px-4 py-2">
                    {employees.length > 0
                      ? Math.round((certificates.filter(c => !c.is_revoked).length / employees.length) * 100)
                      : 0}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {certificates.filter(c => !c.is_revoked).length} out of {employees.length} employees are currently certified
                </p>
              </div>

              {/* Expiring Certificates */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Certificates Expiring Soon</h3>
                <div className="space-y-2">
                  {certificates
                    .filter(cert => {
                      const daysToExpiry = Math.ceil(
                        (new Date(cert.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return daysToExpiry <= 90 && daysToExpiry > 0 && !cert.is_revoked;
                    })
                    .map(cert => {
                      const daysToExpiry = Math.ceil(
                        (new Date(cert.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <div key={cert.certificate_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{cert.first_name} {cert.last_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Certificate #{cert.certificate_number}
                            </p>
                          </div>
                          <Badge variant={daysToExpiry <= 30 ? "destructive" : "secondary"}>
                            {daysToExpiry} days
                          </Badge>
                        </div>
                      );
                    })}
                  {certificates.filter(cert => {
                    const daysToExpiry = Math.ceil(
                      (new Date(cert.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return daysToExpiry <= 90 && daysToExpiry > 0 && !cert.is_revoked;
                  }).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No certificates expiring in the next 90 days
                    </p>
                  )}
                </div>
              </div>

              {/* Download Button */}
              <Button 
                size="lg" 
                onClick={generateCompliancePDF}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download MCA Compliance Report (PDF)
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

          <Card>
            <CardHeader>
              <CardTitle>Help & Support</CardTitle>
              <CardDescription>Access setup tools and documentation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-1">Setup Wizard</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Re-run the initial setup wizard to configure training coordinators and invite employees.
                  </p>
                  <Button variant="outline" onClick={() => setShowRestartDialog(true)} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Restart Setup Wizard
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-1">Documentation</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Access comprehensive guides and best practices for managing your team.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/training-handbook')}>
                    <FileText className="w-4 h-4 mr-2" />
                    View User Guide
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PurchaseSeatsDialog
        organizationId={organization.id}
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        onPurchaseComplete={refreshOrganization}
      />

      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Setup Wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              This will take you back to the initial setup wizard. You can reconfigure training coordinators and invite employees again. Your existing data will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartOnboarding}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AiLean Coach */}
      <AiLeanCoach />
      
      {/* Internal Chatbot */}
      <InternalChatbot 
        firstName={userFirstName}
        organizationName={organization?.name}
        experienceLevel="intermediate"
      />
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default DispensaryManagerDashboard;
