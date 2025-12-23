import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ChecklistSection, ChecklistSectionData, ChecklistSectionItem } from './ChecklistSection';
import { 
  Save, 
  Download, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Shield,
  Award,
  Users,
  RefreshCw,
  FileText,
  BarChart3,
  Bell,
  Layers,
  ClipboardCheck,
  Lock,
  Package,
  CreditCard
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Json } from '@/integrations/supabase/types';
import { PaymentTestingGuide } from './PaymentTestingGuide';

// Define all checklist sections
const CHECKLIST_SECTIONS: Array<{
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: ChecklistSectionItem[];
}> = [
  {
    id: 'auth_section',
    title: '1. Login & Email Link Validation',
    description: 'Authentication & Email Delivery',
    icon: <Lock className="h-5 w-5" />,
    items: [
      { id: 'magic_link_received', label: 'Magic link / login email received' },
      { id: 'login_routes_correctly', label: 'Login link routes correctly' },
      { id: 'user_lands_correct_org', label: 'User lands in correct organization' },
      { id: 'no_profile_errors', label: 'No profile/email errors displayed' }
    ]
  },
  {
    id: 'certificates_section',
    title: '2. Certificate Status Automation',
    description: 'Certificates & Expiry Logic',
    icon: <Award className="h-5 w-5" />,
    items: [
      { id: 'expired_auto_shows', label: 'Expired certificate auto-shows expired' },
      { id: 'active_remains_active', label: 'Active certificate remains active' },
      { id: 'revoked_shows_revoked', label: 'Revoked certificate shows revoked' },
      { id: 'status_updates_auto', label: 'Status updates without manual refresh' }
    ]
  },
  {
    id: 'signoffs_section',
    title: '3. Supervisor Signoffs',
    description: 'Training & Signoff Control',
    icon: <Users className="h-5 w-5" />,
    items: [
      { id: 'signoff_saved', label: 'Signoff saved with module + version' },
      { id: 'signoff_initially_valid', label: 'Signoff initially marked valid' }
    ]
  },
  {
    id: 'retraining_section',
    title: '4. Retraining Invalidates Signoffs',
    description: 'Retraining workflow verification',
    icon: <RefreshCw className="h-5 w-5" />,
    items: [
      { id: 'retraining_event_created', label: 'Retraining event created' },
      { id: 'signoff_auto_invalidated', label: 'Previous signoff auto-invalidated' },
      { id: 'invalidation_reason_populated', label: 'Invalidation reason populated' }
    ]
  },
  {
    id: 'module_version_section',
    title: '5. Module Version Update',
    description: 'Version change handling',
    icon: <Layers className="h-5 w-5" />,
    items: [
      { id: 'version_bump_invalidates', label: 'Version bump invalidates old signoffs' },
      { id: 'new_version_in_ui', label: 'New version reflected in UI' }
    ]
  },
  {
    id: 'incident_workflow_section',
    title: '6. Incident → Retraining Workflow',
    description: 'Incident-driven compliance',
    icon: <AlertCircle className="h-5 w-5" />,
    items: [
      { id: 'incident_logged', label: 'Incident successfully logged' },
      { id: 'incident_mapped', label: 'Incident mapped to training module' },
      { id: 'retraining_auto_assigned', label: 'Retraining auto-assigned' },
      { id: 'signoffs_invalidated', label: 'Related signoffs invalidated' }
    ]
  },
  {
    id: 'packet_export_section',
    title: '7. Employee Compliance Packet',
    description: 'Compliance packet export',
    icon: <FileText className="h-5 w-5" />,
    items: [
      { id: 'export_button_available', label: 'Export button available' },
      { id: 'file_saved_securely', label: 'File saved to secure storage' },
      { id: 'signed_download_works', label: 'Signed download link works' },
      { id: 'export_logged', label: 'Export logged in system' }
    ]
  },
  {
    id: 'packet_content_section',
    title: '8. Packet Content Verification',
    description: 'Verify packet includes all required data',
    icon: <Package className="h-5 w-5" />,
    items: [
      { id: 'employee_identity', label: 'Employee identity & role included' },
      { id: 'certificates_status', label: 'Certificates + status included' },
      { id: 'training_signoffs', label: 'Training signoffs (valid/invalid) included' },
      { id: 'retraining_events', label: 'Retraining events included' },
      { id: 'incident_history', label: 'Incident history included' },
      { id: 'scheduled_reviews', label: 'Scheduled reviews included' },
      { id: 'module_titles_versions', label: 'Module titles & versions included' },
      { id: 'timestamps_generated_by', label: 'Timestamps & generated-by info included' }
    ]
  },
  {
    id: 'dashboard_metrics_section',
    title: '9. Dashboard Metrics',
    description: 'Compliance dashboard accuracy',
    icon: <BarChart3 className="h-5 w-5" />,
    items: [
      { id: 'expiry_counts_accurate', label: 'Certificate expiry counts accurate' },
      { id: 'invalid_signoffs_displayed', label: 'Invalid signoffs displayed' },
      { id: 'retraining_counts_accurate', label: 'Retraining counts accurate' },
      { id: 'incident_counts_accurate', label: 'Incident counts accurate' },
      { id: 'overdue_reviews_visible', label: 'Overdue reviews visible' }
    ]
  },
  {
    id: 'notifications_section',
    title: '10. Certificate Expiry Notifications',
    description: 'Email notification system',
    icon: <Bell className="h-5 w-5" />,
    items: [
      { id: 'expiry_email_received', label: 'Expiry email received' },
      { id: 'email_links_route', label: 'Email links route correctly' },
      { id: 'no_duplicate_notifications', label: 'No duplicate notifications' }
    ]
  },
  {
    id: 'bulk_operations_section',
    title: '11. Bulk Retraining Assignment',
    description: 'Bulk operations testing',
    icon: <Users className="h-5 w-5" />,
    items: [
      { id: 'multiple_employees_selected', label: 'Multiple employees selected' },
      { id: 'retraining_assigned_all', label: 'Retraining assigned to all' },
      { id: 'signoffs_invalidated_auto', label: 'Signoffs invalidated automatically' }
    ]
  },
  {
    id: 'audit_readiness_section',
    title: '12. Mock MCA Audit Walkthrough',
    description: 'Audit readiness verification',
    icon: <Shield className="h-5 w-5" />,
    items: [
      { id: 'demonstrate_training_proof', label: 'Able to demonstrate training proof' },
      { id: 'show_incident_response', label: 'Able to show incident response' },
      { id: 'export_records_on_demand', label: 'Able to export records on demand' },
      { id: 'records_complete_consistent', label: 'Records appear complete & consistent' }
    ]
  },
  {
    id: 'payment_testing_section',
    title: '13. Payment Testing (PayPal Sandbox)',
    description: 'Payment flow verification',
    icon: <CreditCard className="h-5 w-5" />,
    items: [
      { id: 'sandbox_mode_confirmed', label: 'PayPal sandbox mode confirmed active' },
      { id: 'course_payment_initiated', label: 'Course payment successfully initiated' },
      { id: 'paypal_redirect_works', label: 'Redirect to PayPal sandbox works' },
      { id: 'test_credentials_accepted', label: 'Test credentials accepted by PayPal' },
      { id: 'payment_completion_redirect', label: 'Payment completion redirects correctly' },
      { id: 'order_recorded_database', label: 'Order recorded in database' },
      { id: 'seat_purchase_works', label: 'Dispensary seat purchase works' },
      { id: 'seats_allocated_correctly', label: 'Seats allocated correctly after payment' },
      { id: 'no_real_charges', label: 'Confirmed no real charges occurred' }
    ]
  }
];

interface ChecklistData {
  id?: string;
  company_name: string;
  test_organization_name: string;
  primary_test_email: string;
  testing_dates: string[];
  testers: string[];
  auth_section: ChecklistSectionData;
  certificates_section: ChecklistSectionData;
  signoffs_section: ChecklistSectionData;
  retraining_section: ChecklistSectionData;
  module_version_section: ChecklistSectionData;
  incident_workflow_section: ChecklistSectionData;
  packet_export_section: ChecklistSectionData;
  packet_content_section: ChecklistSectionData;
  dashboard_metrics_section: ChecklistSectionData;
  notifications_section: ChecklistSectionData;
  bulk_operations_section: ChecklistSectionData;
  audit_readiness_section: ChecklistSectionData;
  payment_testing_section: ChecklistSectionData;
  what_worked_well: string;
  what_was_confusing: string;
  blocker_concerns: string;
  overall_status: 'pass' | 'conditional' | 'fail' | '';
  confident_for_auditor: boolean | null;
  confident_explanation: string;
  signature_name: string;
  roles_tested: string[];
  submitted_at?: string;
}

const defaultSectionData = (): ChecklistSectionData => ({});

const getDefaultChecklistData = (email: string): ChecklistData => ({
  company_name: '',
  test_organization_name: '',
  primary_test_email: email,
  testing_dates: [new Date().toISOString().split('T')[0]],
  testers: [],
  auth_section: defaultSectionData(),
  certificates_section: defaultSectionData(),
  signoffs_section: defaultSectionData(),
  retraining_section: defaultSectionData(),
  module_version_section: defaultSectionData(),
  incident_workflow_section: defaultSectionData(),
  packet_export_section: defaultSectionData(),
  packet_content_section: defaultSectionData(),
  dashboard_metrics_section: defaultSectionData(),
  notifications_section: defaultSectionData(),
  bulk_operations_section: defaultSectionData(),
  audit_readiness_section: defaultSectionData(),
  payment_testing_section: defaultSectionData(),
  what_worked_well: '',
  what_was_confusing: '',
  blocker_concerns: '',
  overall_status: '',
  confident_for_auditor: null,
  confident_explanation: '',
  signature_name: '',
  roles_tested: []
});

export const UATValidationChecklist: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ChecklistData>(getDefaultChecklistData(user?.email || ''));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing checklist
  useEffect(() => {
    const loadChecklist = async () => {
      if (!user?.id) return;

      try {
        const { data: existing, error } = await supabase
          .from('uat_validation_checklists')
          .select('*')
          .eq('tester_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (existing) {
          // Map database fields to component state
          setData({
            id: existing.id,
            company_name: existing.company_name || '',
            test_organization_name: existing.test_organization_name || '',
            primary_test_email: existing.primary_test_email || user.email || '',
            testing_dates: (existing.testing_dates as string[]) || [],
            testers: (existing.testers as string[]) || [],
            auth_section: (existing.auth_section as unknown as ChecklistSectionData) || defaultSectionData(),
            certificates_section: (existing.certificates_section as unknown as ChecklistSectionData) || defaultSectionData(),
            signoffs_section: (existing.signoffs_section as unknown as ChecklistSectionData) || defaultSectionData(),
            retraining_section: (existing.retraining_section as unknown as ChecklistSectionData) || defaultSectionData(),
            module_version_section: (existing.module_version_section as unknown as ChecklistSectionData) || defaultSectionData(),
            incident_workflow_section: (existing.incident_workflow_section as unknown as ChecklistSectionData) || defaultSectionData(),
            packet_export_section: (existing.packet_export_section as unknown as ChecklistSectionData) || defaultSectionData(),
            packet_content_section: (existing.packet_content_section as unknown as ChecklistSectionData) || defaultSectionData(),
            dashboard_metrics_section: (existing.dashboard_metrics_section as unknown as ChecklistSectionData) || defaultSectionData(),
            notifications_section: (existing.notifications_section as unknown as ChecklistSectionData) || defaultSectionData(),
            bulk_operations_section: (existing.bulk_operations_section as unknown as ChecklistSectionData) || defaultSectionData(),
            audit_readiness_section: (existing.audit_readiness_section as unknown as ChecklistSectionData) || defaultSectionData(),
            payment_testing_section: (existing.payment_testing_section as unknown as ChecklistSectionData) || defaultSectionData(),
            what_worked_well: existing.what_worked_well || '',
            what_was_confusing: existing.what_was_confusing || '',
            blocker_concerns: existing.blocker_concerns || '',
            overall_status: (existing.overall_status as ChecklistData['overall_status']) || '',
            confident_for_auditor: existing.confident_for_auditor,
            confident_explanation: existing.confident_explanation || '',
            signature_name: existing.signature_name || '',
            roles_tested: existing.roles_tested || [],
            submitted_at: existing.submitted_at || undefined
          });
        }
      } catch (error) {
        console.error('Failed to load checklist:', error);
        toast({
          title: 'Error',
          description: 'Failed to load existing checklist',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadChecklist();
  }, [user?.id, user?.email, toast]);

  // Auto-save with debounce
  const saveChecklist = useCallback(async (checklistData: ChecklistData) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const payload = {
        tester_user_id: user.id,
        tester_name: checklistData.signature_name || user.email || 'Unknown',
        company_name: checklistData.company_name,
        test_organization_name: checklistData.test_organization_name,
        primary_test_email: checklistData.primary_test_email,
        testing_dates: checklistData.testing_dates as unknown as Json,
        testers: checklistData.testers as unknown as Json,
        auth_section: checklistData.auth_section as unknown as Json,
        certificates_section: checklistData.certificates_section as unknown as Json,
        signoffs_section: checklistData.signoffs_section as unknown as Json,
        retraining_section: checklistData.retraining_section as unknown as Json,
        module_version_section: checklistData.module_version_section as unknown as Json,
        incident_workflow_section: checklistData.incident_workflow_section as unknown as Json,
        packet_export_section: checklistData.packet_export_section as unknown as Json,
        packet_content_section: checklistData.packet_content_section as unknown as Json,
        dashboard_metrics_section: checklistData.dashboard_metrics_section as unknown as Json,
        notifications_section: checklistData.notifications_section as unknown as Json,
        bulk_operations_section: checklistData.bulk_operations_section as unknown as Json,
        audit_readiness_section: checklistData.audit_readiness_section as unknown as Json,
        payment_testing_section: checklistData.payment_testing_section as unknown as Json,
        what_worked_well: checklistData.what_worked_well,
        what_was_confusing: checklistData.what_was_confusing,
        blocker_concerns: checklistData.blocker_concerns,
        overall_status: checklistData.overall_status || null,
        confident_for_auditor: checklistData.confident_for_auditor,
        confident_explanation: checklistData.confident_explanation,
        signature_name: checklistData.signature_name,
        roles_tested: checklistData.roles_tested,
        updated_at: new Date().toISOString()
      };

      if (checklistData.id) {
        const { error } = await supabase
          .from('uat_validation_checklists')
          .update(payload)
          .eq('id', checklistData.id);
        if (error) throw error;
      } else {
        const { data: newRecord, error } = await supabase
          .from('uat_validation_checklists')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setData(prev => ({ ...prev, id: newRecord.id }));
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save checklist:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save checklist progress',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [user?.id, user?.email, toast]);

  // Debounced save
  useEffect(() => {
    if (!hasUnsavedChanges || loading) return;

    const timeout = setTimeout(() => {
      saveChecklist(data);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [data, hasUnsavedChanges, loading, saveChecklist]);

  const handleSectionChange = (sectionId: string, sectionData: ChecklistSectionData) => {
    setData(prev => ({ ...prev, [sectionId]: sectionData }));
    setHasUnsavedChanges(true);
  };

  const handleFieldChange = <K extends keyof ChecklistData>(field: K, value: ChecklistData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async () => {
    if (!data.id) {
      toast({
        title: 'Save First',
        description: 'Please save the checklist before submitting',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('uat_validation_checklists')
        .update({
          submitted_at: new Date().toISOString(),
          signed_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (error) throw error;

      setData(prev => ({ ...prev, submitted_at: new Date().toISOString() }));
      toast({
        title: 'Checklist Submitted',
        description: 'Your validation checklist has been submitted successfully'
      });
    } catch (error) {
      console.error('Failed to submit:', error);
      toast({
        title: 'Submit Failed',
        description: 'Could not submit the checklist',
        variant: 'destructive'
      });
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.text('Compliance System Validation Checklist', 20, yPos);
    yPos += 15;

    // Company info
    doc.setFontSize(12);
    doc.text(`Company: ${data.company_name}`, 20, yPos);
    yPos += 8;
    doc.text(`Test Organization: ${data.test_organization_name}`, 20, yPos);
    yPos += 8;
    doc.text(`Primary Email: ${data.primary_test_email}`, 20, yPos);
    yPos += 8;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 15;

    // Sections
    doc.setFontSize(10);
    CHECKLIST_SECTIONS.forEach((section) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, 20, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const sectionData = data[section.id] as ChecklistSectionData || {};
      section.items.forEach((item) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        const itemData = sectionData[item.id] || { status: 'pending', notes: '' };
        const statusSymbol = itemData.status === 'pass' ? '✓' : itemData.status === 'fail' ? '✗' : '○';
        doc.text(`  ${statusSymbol} ${item.label}`, 20, yPos);
        yPos += 5;
        if (itemData.notes) {
          doc.text(`     Notes: ${itemData.notes}`, 20, yPos);
          yPos += 5;
        }
      });
      yPos += 5;
    });

    // Feedback section
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Feedback', 20, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (data.what_worked_well) {
      doc.text(`What worked well: ${data.what_worked_well}`, 20, yPos, { maxWidth: 170 });
      yPos += 10;
    }
    if (data.what_was_confusing) {
      doc.text(`What was confusing: ${data.what_was_confusing}`, 20, yPos, { maxWidth: 170 });
      yPos += 10;
    }
    if (data.blocker_concerns) {
      doc.text(`Blockers/Concerns: ${data.blocker_concerns}`, 20, yPos, { maxWidth: 170 });
      yPos += 10;
    }

    doc.text(`Overall Status: ${data.overall_status?.toUpperCase() || 'Not Set'}`, 20, yPos);
    yPos += 6;
    doc.text(`Confident for Auditor: ${data.confident_for_auditor ? 'Yes' : 'No'}`, 20, yPos);
    yPos += 10;

    if (data.signature_name) {
      doc.text(`Signed by: ${data.signature_name}`, 20, yPos);
      yPos += 6;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    }

    doc.save(`UAT-Validation-Checklist-${data.company_name || 'export'}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({
      title: 'PDF Exported',
      description: 'Checklist exported to PDF successfully'
    });
  };

  // Calculate overall progress
  const calculateProgress = () => {
    let total = 0;
    let completed = 0;

    CHECKLIST_SECTIONS.forEach((section) => {
      const sectionData = data[section.id] as ChecklistSectionData || {};
      section.items.forEach((item) => {
        total++;
        const status = sectionData[item.id]?.status;
        if (status === 'pass' || status === 'fail') {
          completed++;
        }
      });
    });

    return { total, completed, percentage: Math.round((completed / total) * 100) };
  };

  const progress = calculateProgress();
  const isSubmitted = !!data.submitted_at;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Compliance System Validation Checklist
          </h1>
          <p className="text-muted-foreground mt-1">
            Single Email – All Roles Test
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="animate-pulse">
              <Save className="h-3 w-3 mr-1" />
              Saving...
            </Badge>
          )}
          {isSubmitted && (
            <Badge className="bg-emerald-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Submitted
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {!isSubmitted && (
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {progress.completed} of {progress.total} items ({progress.percentage}%)
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏢 Company Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={data.company_name}
              onChange={(e) => handleFieldChange('company_name', e.target.value)}
              placeholder="Enter company name"
              disabled={isSubmitted}
            />
          </div>
          <div>
            <Label htmlFor="test_org_name">Test Organization Name (in system)</Label>
            <Input
              id="test_org_name"
              value={data.test_organization_name}
              onChange={(e) => handleFieldChange('test_organization_name', e.target.value)}
              placeholder="Organization name in ProCannEdu"
              disabled={isSubmitted}
            />
          </div>
          <div>
            <Label htmlFor="primary_email">Primary Test Email</Label>
            <Input
              id="primary_email"
              value={data.primary_test_email}
              onChange={(e) => handleFieldChange('primary_test_email', e.target.value)}
              placeholder="Email used for all role testing"
              disabled={isSubmitted}
            />
          </div>
          <div>
            <Label>Testers</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tester-louis"
                  checked={data.testers.includes('Louis')}
                  onCheckedChange={(checked) => {
                    const newTesters = checked 
                      ? [...data.testers, 'Louis']
                      : data.testers.filter(t => t !== 'Louis');
                    handleFieldChange('testers', newTesters);
                  }}
                  disabled={isSubmitted}
                />
                <Label htmlFor="tester-louis">Louis</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tester-danielle"
                  checked={data.testers.includes('Danielle')}
                  onCheckedChange={(checked) => {
                    const newTesters = checked 
                      ? [...data.testers, 'Danielle']
                      : data.testers.filter(t => t !== 'Danielle');
                    handleFieldChange('testers', newTesters);
                  }}
                  disabled={isSubmitted}
                />
                <Label htmlFor="tester-danielle">Danielle</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Sections */}
      {CHECKLIST_SECTIONS.map((section) => (
        <React.Fragment key={section.id}>
          <ChecklistSection
            id={section.id}
            title={section.title}
            description={section.description}
            icon={section.icon}
            items={section.items}
            data={(data[section.id as keyof ChecklistData] as ChecklistSectionData) || {}}
            onChange={handleSectionChange}
            disabled={isSubmitted}
          />
          {/* Insert Payment Testing Guide after the payment section */}
          {section.id === 'payment_testing_section' && (
            <PaymentTestingGuide />
          )}
        </React.Fragment>
      ))}

      {/* Overall Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Overall Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="what_worked">What worked well?</Label>
            <Textarea
              id="what_worked"
              value={data.what_worked_well}
              onChange={(e) => handleFieldChange('what_worked_well', e.target.value)}
              placeholder="Describe what worked well during testing..."
              disabled={isSubmitted}
            />
          </div>
          <div>
            <Label htmlFor="what_confusing">What was confusing or unclear?</Label>
            <Textarea
              id="what_confusing"
              value={data.what_was_confusing}
              onChange={(e) => handleFieldChange('what_was_confusing', e.target.value)}
              placeholder="Describe any confusing aspects..."
              disabled={isSubmitted}
            />
          </div>
          <div>
            <Label htmlFor="blockers">Any blockers or concerns for regulators?</Label>
            <Textarea
              id="blockers"
              value={data.blocker_concerns}
              onChange={(e) => handleFieldChange('blocker_concerns', e.target.value)}
              placeholder="List any blockers or regulatory concerns..."
              disabled={isSubmitted}
            />
          </div>
        </CardContent>
      </Card>

      {/* Final Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✅ Final Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-3 block">Overall Status</Label>
            <RadioGroup
              value={data.overall_status}
              onValueChange={(v) => handleFieldChange('overall_status', v as ChecklistData['overall_status'])}
              className="flex gap-6"
              disabled={isSubmitted}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pass" id="status-pass" />
                <Label htmlFor="status-pass" className="flex items-center gap-1 text-emerald-600 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4" />
                  PASS
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="conditional" id="status-conditional" />
                <Label htmlFor="status-conditional" className="flex items-center gap-1 text-amber-600 cursor-pointer">
                  <AlertCircle className="h-4 w-4" />
                  CONDITIONAL
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fail" id="status-fail" />
                <Label htmlFor="status-fail" className="flex items-center gap-1 text-destructive cursor-pointer">
                  <XCircle className="h-4 w-4" />
                  FAIL
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-3 block">Would you be confident showing this to an MCA auditor today?</Label>
            <RadioGroup
              value={data.confident_for_auditor === true ? 'yes' : data.confident_for_auditor === false ? 'no' : ''}
              onValueChange={(v) => handleFieldChange('confident_for_auditor', v === 'yes')}
              className="flex gap-6"
              disabled={isSubmitted}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="confident-yes" />
                <Label htmlFor="confident-yes" className="cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="confident-no" />
                <Label htmlFor="confident-no" className="cursor-pointer">No</Label>
              </div>
            </RadioGroup>
            {data.confident_for_auditor === false && (
              <Textarea
                value={data.confident_explanation}
                onChange={(e) => handleFieldChange('confident_explanation', e.target.value)}
                placeholder="Please explain why not..."
                className="mt-3"
                disabled={isSubmitted}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sign-Off */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✍️ Sign-Off</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="signature_name">Tester Name</Label>
            <Input
              id="signature_name"
              value={data.signature_name}
              onChange={(e) => handleFieldChange('signature_name', e.target.value)}
              placeholder="Your full name"
              disabled={isSubmitted}
            />
          </div>
          <div>
            <Label>Roles Tested</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {['Manager', 'Coordinator', 'Employee', 'Admin'].map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={data.roles_tested.includes(role)}
                    onCheckedChange={(checked) => {
                      const newRoles = checked 
                        ? [...data.roles_tested, role]
                        : data.roles_tested.filter(r => r !== role);
                      handleFieldChange('roles_tested', newRoles);
                    }}
                    disabled={isSubmitted}
                  />
                  <Label htmlFor={`role-${role}`}>{role}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Section */}
      {!isSubmitted && (
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => saveChecklist(data)} 
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Progress
          </Button>
          <Button onClick={handleSubmit} disabled={saving || progress.percentage < 50}>
            <Send className="h-4 w-4 mr-2" />
            Submit Checklist
          </Button>
        </div>
      )}
    </div>
  );
};
