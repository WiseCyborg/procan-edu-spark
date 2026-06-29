import React, { useState } from 'react';
import { Shield, AlertTriangle, TrendingUp, Building2, Users, Award, ChevronDown, ChevronUp, TestTube2, BookOpen, ClipboardCheck, CreditCard } from 'lucide-react';
import { PaymentTransactionsPanel } from '@/components/admin/PaymentTransactionsPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { usePipelineMetrics } from '@/hooks/usePipelineMetrics';
import { useAdminAlerts } from '@/hooks/useAdminAlerts';
import { AdminDispensarySection } from '@/components/admin/AdminDispensarySection';
import { AdminTrainingSection } from '@/components/admin/AdminTrainingSection';
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth';
import { AdminCommunications } from '@/components/admin/AdminCommunications';
import { UATAccountManager } from '@/components/admin/UATAccountManager';
import { ConsumerCoursesSection } from '@/components/admin/ConsumerCoursesSection';
import { SupportRequestsPanel } from '@/components/admin/SupportRequestsPanel';
import { E2EValidationReport } from '@/components/admin/E2EValidationReport';
import { EnvironmentControls } from '@/components/admin/EnvironmentControls';
import { RegulatoryReviewPanel } from '@/components/admin/RegulatoryReviewPanel';
import { LearnerProgressPanel } from '@/components/admin/LearnerProgressPanel';
import { VideoReviewPanel } from '@/components/admin/VideoReviewPanel';
import { Loader2 } from 'lucide-react';
import { InternalChatbot } from '@/components/chat/InternalChatbot';
import { NextActionBanner } from '@/components/guidance/NextActionBanner';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const AdminMissionControl = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { data: metrics, isLoading: metricsLoading } = usePipelineMetrics();
  const { data: alerts, isLoading: alertsLoading } = useAdminAlerts();
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [userFirstName, setUserFirstName] = useState<string>('');

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.first_name) {
            setUserFirstName(data.first_name);
          }
        });
    }
  }, [user]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (roleLoading || metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-red-700">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to access the admin mission control.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criticalAlerts = alerts?.filter(a => a.severity === 'critical') || [];
  const warningAlerts = alerts?.filter(a => a.severity === 'warning') || [];

  // Calculate pipeline conversion rates
  const appToOrgRate = metrics?.funnel_dispensary_applied 
    ? Math.round((metrics.funnel_dispensary_approved / metrics.funnel_dispensary_applied) * 100) 
    : 0;
  const orgToEmployeeRate = metrics?.funnel_dispensary_approved 
    ? Math.round((metrics.funnel_employee_registered / metrics.funnel_dispensary_approved) * 100) 
    : 0;
  const employeeToCompletedRate = metrics?.funnel_employee_registered 
    ? Math.round((metrics.funnel_employee_completed / metrics.funnel_employee_registered) * 100) 
    : 0;
  const completedToCertifiedRate = metrics?.funnel_employee_completed 
    ? Math.round((metrics.funnel_cert_delivered / metrics.funnel_employee_completed) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Mission Control</h1>
            <p className="text-muted-foreground">System health, pipeline status, and operations center</p>
          </div>
          <Badge variant="destructive" className="ml-auto">Admin Only</Badge>
        </div>

        {/* Admin next action guidance */}
        <NextActionBanner variant="compact" className="mb-2" />

        {/* Environment Controls */}
        <EnvironmentControls />

        {/* Payment Transactions */}
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection('payments')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Payment Transactions</CardTitle>
                  <CardDescription>PayPal webhook events, revenue, and seat purchases</CardDescription>
                </div>
              </div>
              {expandedSection === 'payments' ? <ChevronUp /> : <ChevronDown />}
            </div>
          </CardHeader>
          {expandedSection === 'payments' && (
            <CardContent className="pt-6">
              <PaymentTransactionsPanel />
            </CardContent>
          )}
        </Card>

        {/* Regulatory Review (human approval gate) */}
        <RegulatoryReviewPanel />

        {/* Learner Progress Dashboard */}
        <LearnerProgressPanel />




        {/* Action Center - Critical Alerts */}
        {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
          <Alert variant={criticalAlerts.length > 0 ? "destructive" : "default"} className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">
              Action Required: {criticalAlerts.length} Critical {criticalAlerts.length === 1 ? 'Issue' : 'Issues'}
              {warningAlerts.length > 0 && `, ${warningAlerts.length} Warning${warningAlerts.length === 1 ? '' : 's'}`}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              {criticalAlerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>{alert.message}</span>
                  {alert.action && (
                    <Button size="sm" variant="outline" className="ml-auto">
                      {alert.actionLabel || 'Fix Now'}
                    </Button>
                  )}
                </div>
              ))}
              {criticalAlerts.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  + {criticalAlerts.length - 3} more critical issues
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Real-Time Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.applications_pending || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.applications_submitted_30d || 0} applications (30d)
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Approval Rate</span>
                  <span className="font-medium">{metrics?.approval_rate_30d?.toFixed(0) || 0}%</span>
                </div>
                <Progress value={metrics?.approval_rate_30d || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.funnel_dispensary_approved || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active dispensaries
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Seat Utilization</span>
                  <span className="font-medium">{metrics?.seat_utilization_rate?.toFixed(0) || 0}%</span>
                </div>
                <Progress value={metrics?.seat_utilization_rate || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.funnel_employee_registered || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.funnel_employee_started || 0} in training
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Completion Rate</span>
                  <span className="font-medium">{employeeToCompletedRate}%</span>
                </div>
                <Progress value={employeeToCompletedRate} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certifications</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.certificates_issued_30d || 0}</div>
              <p className="text-xs text-muted-foreground">
                Issued in last 30 days
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Expiring Soon</span>
                  <span className="font-medium text-orange-600">{metrics?.certificates_expiring_soon || 0}</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Pipeline Funnel</CardTitle>
            <CardDescription>Track conversion from application to certification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{metrics?.funnel_dispensary_applied || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">Applications</p>
                <p className="text-xs text-muted-foreground">100%</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{metrics?.funnel_dispensary_approved || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">Approved</p>
                <p className="text-xs text-muted-foreground">{appToOrgRate}% conversion</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{metrics?.funnel_employee_registered || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">Employees</p>
                <p className="text-xs text-muted-foreground">{orgToEmployeeRate}% conversion</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{metrics?.funnel_employee_completed || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">Completed</p>
                <p className="text-xs text-muted-foreground">{employeeToCompletedRate}% conversion</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{metrics?.funnel_cert_delivered || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">Certified</p>
                <p className="text-xs text-muted-foreground">{completedToCertifiedRate}% conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Four Expandable Sections */}
        <div className="space-y-4">
          {/* Dispensary Management */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('dispensary')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Dispensary Management</CardTitle>
                    <CardDescription>Applications, Organizations, Seat Allocation</CardDescription>
                  </div>
                </div>
                {expandedSection === 'dispensary' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSection === 'dispensary' && (
              <CardContent className="pt-6">
                <AdminDispensarySection />
              </CardContent>
            )}
          </Card>

          {/* Training & Certifications */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('training')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Training & Certifications</CardTitle>
                    <CardDescription>Progress tracking, Certificate management</CardDescription>
                  </div>
                </div>
                {expandedSection === 'training' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSection === 'training' && (
              <CardContent className="pt-6">
                <AdminTrainingSection />
              </CardContent>
            )}
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('health')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>System Health</CardTitle>
                    <CardDescription>Email diagnostics, Database health, Edge functions</CardDescription>
                  </div>
                </div>
                {expandedSection === 'health' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSection === 'health' && (
              <CardContent className="pt-6">
                <AdminSystemHealth />
              </CardContent>
            )}
          </Card>

          {/* Communications */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('communications')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Communications</CardTitle>
                    <CardDescription>Email console, Templates, Test emails</CardDescription>
                  </div>
                </div>
                {expandedSection === 'communications' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSection === 'communications' && (
              <CardContent className="pt-6">
                <AdminCommunications />
              </CardContent>
            )}
          </Card>

          {/* UAT Testing */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('uat')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TestTube2 className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>UAT Testing</CardTitle>
                    <CardDescription>Create & manage test accounts for Managers and Employees</CardDescription>
                  </div>
                </div>
                {expandedSection === 'uat' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSection === 'uat' && (
              <CardContent className="pt-6">
                <UATAccountManager />
              </CardContent>
            )}
          </Card>

          {/* Consumer Courses */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('consumer')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Consumer Courses</CardTitle>
                    <CardDescription>Manage free consumer education courses</CardDescription>
                  </div>
                </div>
                {expandedSection === 'consumer' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSection === 'consumer' && (
              <CardContent className="pt-6">
                <ConsumerCoursesSection />
              </CardContent>
            )}
          </Card>

          {/* E2E Validation */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('e2e')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>E2E Validation</CardTitle>
                    <CardDescription>End-to-end system validation and test reports</CardDescription>
                  </div>
                </div>
                {expandedSection === 'e2e' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>
            {expandedSection === 'e2e' && (
              <CardContent className="pt-6">
                <E2EValidationReport />
              </CardContent>
            )}
          </Card>

          {/* Support Requests */}
          <div className="mt-6">
            <SupportRequestsPanel />
          </div>
        </div>
      </div>
      
      {/* Internal Chatbot */}
      <InternalChatbot 
        firstName={userFirstName}
        experienceLevel="advanced"
      />
    </div>
  );
};

export default AdminMissionControl;
