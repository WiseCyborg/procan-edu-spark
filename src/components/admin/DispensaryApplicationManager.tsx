import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
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
  MapPin
} from 'lucide-react';

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
    try {
      const { data, error } = await supabase.rpc('approve_dispensary_application', {
        application_id: applicationId,
        credits: credits
      });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        toast({
          title: "Application Approved",
          description: `Organization created with access key: ${result.access_key}`,
        });
        fetchApplications(); // Refresh the list
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
      console.error('Error approving application:', error);
      toast({
        title: "Error",
        description: "Failed to approve application",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
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
        toast({
          title: "Application Rejected",
          description: "Application rejected successfully",
        });
        fetchApplications(); // Refresh the list
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
        <Badge variant="outline" className="text-sm">
          {applications.length} Total Applications
        </Badge>
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
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            Create Test Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testOrgName">Organization Name</Label>
              <Input
                id="testOrgName"
                placeholder="Test Dispensary Inc."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="testOrgEmail">Contact Email</Label>
              <Input
                id="testOrgEmail"
                type="email"
                placeholder="test@dispensary.com"
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={() => {
              const nameInput = document.getElementById('testOrgName') as HTMLInputElement;
              const emailInput = document.getElementById('testOrgEmail') as HTMLInputElement;
              if (nameInput.value && emailInput.value) {
                createTestOrganization(nameInput.value, emailInput.value);
                nameInput.value = '';
                emailInput.value = '';
              } else {
                toast({
                  title: "Missing Information",
                  description: "Please fill in both name and email",
                  variant: "destructive"
                });
              }
            }}
            disabled={isProcessing}
            className="w-full"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Create Test Organization
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispensaryApplicationManager;