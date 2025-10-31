import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Copy,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Hash
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmailDeliveryStatus } from './EmailDeliveryStatus';

interface DispensaryApplication {
  id: string;
  organization_name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  license_number: string;
  requested_credits: number;
  application_status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  reviewed_by: string;
  reviewed_at: string;
}

const DispensaryApplicationManager = () => {
  const [applications, setApplications] = useState<DispensaryApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<DispensaryApplication | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [approvalStep, setApprovalStep] = useState<string>('');
  const [approvalData, setApprovalData] = useState<{
    registrationLink: string;
    accessKey: string;
    joinCode: string;
    emailSent: boolean;
    emailError: string | null;
  } | null>(null);
  const { performSecurityCheck } = useSecurityMonitoring();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('dispensary_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load dispensary applications.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const approveApplication = async (applicationId: string, credits: number = 10) => {
    if (!await performSecurityCheck('dispensary_approval')) return;

    setIsProcessing(true);
    setApprovalData(null);
    
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Step 1: Creating organization
      setApprovalStep('Creating organization...');
      
      // Generate registration token
      const registrationToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

      // Update application with token
      const { error: tokenError } = await supabase
        .from('dispensary_applications')
        .update({
          registration_token: registrationToken,
          registration_token_expires_at: expiresAt.toISOString()
        })
        .eq('id', applicationId);

      if (tokenError) throw tokenError;

      // Approve application with RPC (now returns join_code)
      const { data, error } = await supabase.rpc('approve_dispensary_application', {
        application_id: applicationId,
        credits: credits
      });

      if (error) throw error;

      const result = data[0] as { success: boolean; message: string; organization_id: string; access_key: string; join_code: string; purchase_id: string };
      if (!result.success) {
        throw new Error(result.message || 'Failed to approve application');
      }

      // Step 2: Generating registration link (join_code returned from RPC)
      setApprovalStep('Generating registration link...');
      const registrationUrl = `${window.location.origin}/register/manager?token=${registrationToken}`;
      
      // Join code is now returned directly from RPC - no separate query needed
      const joinCode = result.join_code;

      // Step 3: Sending approval email
      setApprovalStep('Sending approval email...');
      
      let emailSent = false;
      let emailError = null;
      
      try {
        const emailResult = await supabase.functions.invoke('send-approval-email', {
          body: {
            contact_email: application.contact_email,
            contact_person: application.contact_person,
            organization_name: application.organization_name,
            access_key: result.access_key,
            registration_url: registrationUrl,
            credits: credits,
            join_code: joinCode
          }
        });

        if (emailResult.error) {
          emailError = emailResult.error.message || 'Failed to send email';
          console.error('Failed to send approval email:', emailResult.error);
          // Copy to clipboard as fallback
          navigator.clipboard.writeText(registrationUrl);
          
          // Log failed email attempt
          await supabase
            .from('email_logs')
            .insert({
              email_type: 'application_approved',
              recipient_email: application.contact_email,
              subject: '🎉 Your Dispensary Application Has Been Approved!',
              status: 'failed',
              error_message: emailError,
              metadata: {
                organization_id: result.organization_id,
                application_id: applicationId,
                manual_intervention_required: true
              }
            });
        } else {
          emailSent = true;
          console.log('Approval email sent successfully:', emailResult.data);
        }
      } catch (emailErr) {
        emailError = emailErr instanceof Error ? emailErr.message : 'Email sending failed';
        console.error('Error sending email:', emailErr);
        navigator.clipboard.writeText(registrationUrl);
        
        // Log exception
        await supabase
          .from('email_logs')
          .insert({
            email_type: 'application_approved',
            recipient_email: application.contact_email,
            subject: '🎉 Your Dispensary Application Has Been Approved!',
            status: 'failed',
            error_message: emailError,
            metadata: {
              organization_id: result.organization_id,
              application_id: applicationId,
              exception: true
            }
          });
      }

      // Store approval data for success card
      setApprovalData({
        registrationLink: registrationUrl,
        accessKey: result.access_key,
        joinCode: joinCode || 'N/A',
        emailSent,
        emailError
      });

      setApprovalStep('');
      
      toast({
        title: emailSent ? "Application Approved ✅" : "Application Approved ⚠️",
        description: emailSent 
          ? `Organization created with ${credits} seats. Approval email sent to ${application.contact_email}.`
          : `Organization created with ${credits} seats. Email failed - please resend manually.`,
        duration: emailSent ? 6000 : 10000,
      });
      
      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      setApprovalStep('');
      setApprovalData(null);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve application",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resendApprovalEmail = async (application: DispensaryApplication) => {
    setIsProcessing(true);
    setApprovalStep('Resending approval email...');
    
    try {
      // Get registration token from database
      const { data: appData } = await supabase
        .from('dispensary_applications')
        .select('registration_token')
        .eq('id', application.id)
        .single();
      
      if (!appData?.registration_token) {
        throw new Error('Registration token not found');
      }

      // Get organization details
      const { data: orgData } = await supabase
        .from('organizations')
        .select('unique_access_key')
        .eq('name', application.organization_name)
        .single();
      
      if (!orgData?.unique_access_key) {
        throw new Error('Organization access key not found');
      }

      const registrationUrl = `${window.location.origin}/register/manager?token=${appData.registration_token}`;
      
      const { data, error } = await supabase.functions.invoke('send-approval-email', {
        body: {
          contact_email: application.contact_email,
          contact_person: application.contact_person,
          organization_name: application.organization_name,
          access_key: orgData.unique_access_key,
          registration_url: registrationUrl,
          credits: 10
        }
      });

      if (error) {
        // Log failed resend attempt
        await supabase
          .from('email_logs')
          .insert({
            email_type: 'application_approved',
            recipient_email: application.contact_email,
            subject: '🎉 Your Dispensary Application Has Been Approved!',
            status: 'failed',
            error_message: error.message || 'Resend failed',
            metadata: {
              application_id: application.id,
              organization_name: application.organization_name,
              is_resend: true
            }
          });
        throw error;
      }

      // Update approval data state
      setApprovalData(prev => prev ? { ...prev, emailSent: true, emailError: null } : null);
      
      toast({
        title: "Email Resent ✅",
        description: `Approval email resent to ${application.contact_email}`,
      });
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: "Resend Failed",
        description: error instanceof Error ? error.message : 'Failed to resend email',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setApprovalStep('');
    }
  };

  const rejectApplication = async (applicationId: string, reason: string) => {
    if (!await performSecurityCheck('dispensary_rejection')) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_dispensary_application', {
        application_id: applicationId,
        rejection_reason: reason
      });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        // Send rejection notification
        try {
          const notifyResult = await supabase.functions.invoke('notify-application-status', {
            body: {
              application_id: applicationId,
              status: 'rejected',
              rejection_reason: reason,
              applicant_email: selectedApplication.contact_email,
              organization_name: selectedApplication.organization_name
            }
          });

          if (notifyResult.error) {
            console.error('Failed to send rejection notification:', notifyResult.error);
            // Log failed rejection email
            await supabase
              .from('email_logs')
              .insert({
                email_type: 'application_rejected',
                recipient_email: selectedApplication.contact_email,
                subject: 'Dispensary Application Status Update',
                status: 'failed',
                error_message: notifyResult.error.message || 'Failed to send rejection email',
                metadata: {
                  application_id: applicationId,
                  organization_name: selectedApplication.organization_name,
                  rejection_reason: reason
                }
              });
          }
        } catch (emailErr) {
          console.error('Error sending rejection notification:', emailErr);
          // Log exception but don't block rejection
          await supabase
            .from('email_logs')
            .insert({
              email_type: 'application_rejected',
              recipient_email: selectedApplication.contact_email,
              subject: 'Dispensary Application Status Update',
              status: 'failed',
              error_message: emailErr instanceof Error ? emailErr.message : 'Exception sending rejection email',
              metadata: {
                application_id: applicationId,
                organization_name: selectedApplication.organization_name,
                exception: true
              }
            });
        }
        
        toast({
          title: "Application Rejected",
          description: "Application rejected successfully",
        });
        fetchApplications();
        setSelectedApplication(null);
        setAdminNotes('');
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createTestOrganization = async (orgName: string, contactEmail: string, credits: number = 10) => {
    if (!await performSecurityCheck('test_org_creation')) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('create_test_organization', {
        org_name: orgName,
        contact_email: contactEmail,
        credits: credits
      });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        toast({
          title: "Test Organization Created",
          description: `"${orgName}" created with access key: ${result.access_key}`,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating test organization:', error);
      toast({
        title: "Error",
        description: "Failed to create test organization",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createOrganizationFromApplication = async (application: DispensaryApplication) => {
    if (application.application_status !== 'approved') {
      toast({
        title: "Invalid Status",
        description: "Only approved applications can be processed for payment.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Check if organization already exists for this application
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id, unique_access_key')
        .eq('name', application.organization_name)
        .maybeSingle();

      if (existingOrg) {
        toast({
          title: "Organization Exists",
          description: `Organization already created with access key: ${existingOrg.unique_access_key}`,
        });
        setIsProcessing(false);
        return;
      }

      // Create PayPal payment checkout
      const response = await supabase.functions.invoke('create-dispensary-payment-paypal', {
        body: {
          applicationId: application.id,
          credits: application.requested_credits,
          organizationName: application.organization_name,
          contactEmail: application.contact_email
        }
      });

      if (response.error) throw response.error;

      const { approvalUrl, orderId } = response.data;
      
      if (approvalUrl) {
        // Open PayPal approval URL in new tab
        window.open(approvalUrl, '_blank');
        
        toast({
          title: "Payment Link Created",
          description: "PayPal payment window opened. Organization will be created after successful payment.",
        });
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Failed to create payment link.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'completed': return <Building2 className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const resendAllConfirmations = async () => {
    const pendingApps = applications.filter(app => app.application_status === 'pending');
    
    if (pendingApps.length === 0) {
      toast({
        title: "No Pending Applications",
        description: "There are no pending applications to send confirmations for.",
      });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const app of pendingApps) {
        try {
          const { data, error } = await supabase.functions.invoke('send-application-confirmation', {
            body: {
              application_id: app.id,
              contact_person: app.contact_person,
              contact_email: app.contact_email,
              organization_name: app.organization_name,
              license_number: app.license_number
            }
          });

          if (error || !data?.success) {
            failCount++;
            console.error(`Failed to send confirmation to ${app.contact_email}:`, error);
          } else {
            successCount++;
          }
        } catch (err) {
          failCount++;
          console.error(`Error sending to ${app.contact_email}:`, err);
        }
      }

      toast({
        title: successCount > 0 ? "Emails Sent ✅" : "Emails Failed",
        description: `Successfully sent ${successCount} confirmation emails. ${failCount > 0 ? `${failCount} failed.` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-700 flex items-center">
            <FileText className="mr-3 h-6 w-6" />
            Dispensary Applications
          </h2>
          <p className="text-muted-foreground">Review and manage dispensary license applications</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resendAllConfirmations}
            disabled={isProcessing || applications.filter(a => a.application_status === 'pending').length === 0}
          >
            <Mail className="mr-2 h-4 w-4" />
            Resend All Confirmations
          </Button>
          <Badge variant="outline" className="text-sm">
            {applications.length} Total Applications
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {applications.map((application) => (
          <Card key={application.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {application.organization_name}
                    </h3>
                    <Badge className={getStatusColor(application.application_status)}>
                      {getStatusIcon(application.application_status)}
                      <span className="ml-1 capitalize">{application.application_status}</span>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{application.contact_person}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{application.contact_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{application.contact_phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>{application.requested_credits} training credits</span>
                    </div>
                    {application.address && (
                      <div className="flex items-center gap-2 md:col-span-2">
                        <MapPin className="h-4 w-4" />
                        <span>{application.address}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    Applied: {new Date(application.created_at).toLocaleDateString()}
                    {application.reviewed_at && (
                      <span className="ml-4">
                        Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application);
                          setAdminNotes(application.admin_notes || '');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Review Application - {application.organization_name}</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Progress Indicator */}
                        {isProcessing && approvalStep && (
                          <Card className="border-blue-500 bg-blue-50">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  {approvalStep}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Success Card */}
                        {approvalData && (
                          <Card className="border-green-500 bg-green-50">
                            <CardContent className="p-6 space-y-4">
                              <h4 className="font-semibold text-green-800 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                Application Approved Successfully
                              </h4>
                              
                              {/* Status Checklist */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span>Organization "{application.organization_name}" created</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span>10 training seats allocated</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  {approvalData.emailSent ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <span>Approval email sent to: {application.contact_email}</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                                      <span>Email delivery failed - see details below</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Registration Link */}
                              <div className="p-3 bg-white rounded border border-green-200">
                                <Label className="text-xs text-muted-foreground">
                                  Registration Link (expires in 7 days)
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs flex-1 truncate bg-gray-50 p-2 rounded">
                                    {approvalData.registrationLink}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      navigator.clipboard.writeText(approvalData.registrationLink);
                                      toast({ title: "Copied!", description: "Registration link copied to clipboard" });
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Access Key */}
                              <div className="p-3 bg-white rounded border border-green-200">
                                <Label className="text-xs text-muted-foreground">
                                  Organization Access Key
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs font-mono font-bold text-green-700 bg-gray-50 p-2 rounded">
                                    {approvalData.accessKey}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      navigator.clipboard.writeText(approvalData.accessKey);
                                      toast({ title: "Copied!", description: "Access key copied to clipboard" });
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Join Code */}
                              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  Employee Join Code
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs font-mono font-bold text-blue-700 bg-white p-2 rounded">
                                    {approvalData.joinCode}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      navigator.clipboard.writeText(approvalData.joinCode);
                                      toast({ title: "Copied!", description: "Join code copied to clipboard" });
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Manager will use this code to invite employees to the organization
                                </p>
                              </div>

                              {/* Email Error Alert */}
                              {approvalData.emailError && (
                                <Alert variant="destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription className="text-xs">
                                    {approvalData.emailError}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Mail className="h-3 w-3 mr-1" />
                                      View Email Status
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Email Delivery Status</DialogTitle>
                                    </DialogHeader>
                                    <EmailDeliveryStatus recipientEmail={application.contact_email} />
                                  </DialogContent>
                                </Dialog>

                                {!approvalData.emailSent && (
                                  <Button
                                    size="sm"
                                    onClick={() => resendApprovalEmail(application)}
                                    disabled={isProcessing}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Resend Email
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Application Details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Organization Name</Label>
                            <p className="text-sm text-muted-foreground">{application.organization_name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Contact Person</Label>
                            <p className="text-sm text-muted-foreground">{application.contact_person}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Email</Label>
                            <p className="text-sm text-muted-foreground">{application.contact_email}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Phone</Label>
                            <p className="text-sm text-muted-foreground">{application.contact_phone}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">License Number</Label>
                            <p className="text-sm text-muted-foreground">{application.license_number || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Requested Credits</Label>
                            <p className="text-sm text-muted-foreground">{application.requested_credits}</p>
                          </div>
                        </div>
                        
                        {application.address && (
                          <div>
                            <Label className="text-sm font-medium">Address</Label>
                            <p className="text-sm text-muted-foreground">{application.address}</p>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="admin-notes">Admin Notes</Label>
                          <Textarea
                            id="admin-notes"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add internal notes about this application..."
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          {application.application_status === 'pending' && (
                            <>
                              <Button
                                onClick={() => approveApplication(application.id, 10)}
                                disabled={isProcessing}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve (10 Credits)
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => rejectApplication(application.id, adminNotes || 'Application rejected by admin')}
                                disabled={isProcessing}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {application.application_status === 'approved' && (
                            <Button
                              onClick={() => createOrganizationFromApplication(application)}
                              disabled={isProcessing}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Create Payment Link
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {applications.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Applications Found</h3>
            <p className="text-muted-foreground">
              Dispensary applications will appear here when submitted.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Test Organization Creator */}
      <TestOrganizationCreator />
    </div>
  );
};

const TestOrganizationCreator = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [credits, setCredits] = useState(10);
  const { performSecurityCheck } = useSecurityMonitoring();

  const createTestOrganization = async () => {
    if (!orgName.trim() || !contactEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name and contact email are required.",
        variant: "destructive"
      });
      return;
    }

    if (!await performSecurityCheck('test_org_creation')) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_test_organization', {
        org_name: orgName.trim(),
        contact_email: contactEmail.trim(),
        credits: credits
      });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        toast({
          title: "Test Organization Created",
          description: `"${orgName}" created successfully with access key: ${result.access_key}`,
        });
        
        // Reset form
        setOrgName('');
        setContactEmail('');
        setCredits(10);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating test organization:', error);
      toast({
        title: "Error",
        description: "Failed to create test organization",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/20 mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center text-primary">
          <Building2 className="h-5 w-5 mr-2" />
          Create Test Organization
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create test organizations directly for system testing (bypasses payment workflow)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Test Dispensary Inc."
            />
          </div>
          <div>
            <Label htmlFor="contact-email">Contact Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div>
            <Label htmlFor="credits">Training Credits</Label>
            <Input
              id="credits"
              type="number"
              min="1"
              max="100"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 10)}
            />
          </div>
        </div>
        
        <Button
          onClick={createTestOrganization}
          disabled={isCreating || !orgName.trim() || !contactEmail.trim()}
          className="w-full md:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          {isCreating ? 'Creating...' : 'Create Test Organization'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DispensaryApplicationManager;