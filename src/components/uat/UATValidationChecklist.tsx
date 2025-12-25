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

// Define all checklist sections - comprehensive E2E UAT
const CHECKLIST_SECTIONS: Array<{
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: ChecklistSectionItem[];
}> = [
  // Section 0: Pre-flight
  {
    id: 'preflight_section',
    title: '0. Pre-flight (Environment + Baseline)',
    description: 'Environment verification before testing',
    icon: <Shield className="h-5 w-5" />,
    items: [
      { id: 'uat_mode_on', label: 'UAT mode is ON (no production emails/payments)' },
      { id: 'base_url_correct', label: 'Base URL (UAT) + email template domain correct' },
      { id: 'redirect_urls_correct', label: 'Redirect URLs point to correct environment' },
      { id: 'rls_roles_active', label: 'RLS + roles are active (no admin-only behavior)' },
      { id: 'seed_data_exists', label: 'Seed data exists OR clean test path available' },
      { id: 'pages_load_no_errors', label: 'All pages load, no console errors, no 401/403 surprises' }
    ]
  },
  // Section 1: Identity + Access
  {
    id: 'auth_section',
    title: '1. Identity + Access (Auth, Roles, Profile)',
    description: 'Authentication & Role Verification',
    icon: <Lock className="h-5 w-5" />,
    items: [
      { id: 'signup_uat_email', label: 'Sign up using shared UAT email works' },
      { id: 'verification_link_opens', label: 'Email verification link opens correctly' },
      { id: 'token_valid', label: 'Token is valid (not expired/used)' },
      { id: 'redirect_lands_correct', label: 'Redirect lands on correct page' },
      { id: 'login_logout_works', label: 'Login/logout works correctly' },
      { id: 'password_reset_flow', label: 'Password reset flow works end-to-end' },
      { id: 'role_switching_consistent', label: 'Role switching is consistent' },
      { id: 'permissions_match', label: 'Permissions match role expectations' }
    ]
  },
  // Section 2: Company Onboarding
  {
    id: 'company_onboarding_section',
    title: '2. Company Onboarding (Org Setup + Users)',
    description: 'Organization and employee setup',
    icon: <Users className="h-5 w-5" />,
    items: [
      { id: 'create_test_company', label: 'Create new test company (legal name, location, license)' },
      { id: 'company_profile_created', label: 'Company profile created correctly' },
      { id: 'add_employees_manual', label: 'Add employees manually works' },
      { id: 'bulk_import_available', label: 'Bulk import (if available) works' },
      { id: 'invite_employee_email', label: 'Invite employee via email works' },
      { id: 'invite_link_valid', label: 'Invite link opens correctly' },
      { id: 'employee_accepts_invite', label: 'Employee accepts invite successfully' },
      { id: 'employee_lands_correct_company', label: 'Employee lands in correct company' }
    ]
  },
  // Section 3: Course Catalog + Learning Flow
  {
    id: 'learning_section',
    title: '3. Course Catalog + Enrollment + Learning',
    description: 'Course enrollment and completion flow',
    icon: <Award className="h-5 w-5" />,
    items: [
      { id: 'admin_enrolls_employee', label: 'Company Admin enrolls employee into course' },
      { id: 'employee_opens_course', label: 'Employee opens course successfully' },
      { id: 'lessons_complete', label: 'Employee completes lessons' },
      { id: 'quiz_works', label: 'Employee completes quiz' },
      { id: 'completion_submitted', label: 'Completion submitted successfully' },
      { id: 'completion_date_recorded', label: 'Completion date recorded correctly' },
      { id: 'expiration_date_set', label: 'Expiration date set (if applicable)' },
      { id: 'certificate_eligibility', label: 'Certificate eligibility triggered' }
    ]
  },
  // Section 4: Certificates
  {
    id: 'certificates_section',
    title: '4. Certificate Generation + Storage + Retrieval',
    description: 'Certificate lifecycle verification',
    icon: <Award className="h-5 w-5" />,
    items: [
      { id: 'cert_generated_on_completion', label: 'Certificate generated on completion' },
      { id: 'cert_stored_correctly', label: 'Certificate stored (bucket/path)' },
      { id: 'employee_view_cert', label: 'Employee can view certificate' },
      { id: 'employee_download_cert', label: 'Employee can download certificate' },
      { id: 'admin_view_cert_list', label: 'Admin can view employee certificate list' },
      { id: 'export_packet_works', label: 'Export packet works (if available)' },
      { id: 'expired_auto_shows', label: 'Expired certificate auto-shows expired' },
      { id: 'revoked_shows_revoked', label: 'Revoked certificate shows revoked' }
    ]
  },
  // Section 5: Compliance Incidents → Retraining
  {
    id: 'incident_retraining_section',
    title: '5. Compliance Incidents → Retraining Triggers',
    description: 'Critical incident-driven retraining workflow',
    icon: <AlertCircle className="h-5 w-5" />,
    items: [
      { id: 'log_incident', label: 'Log compliance incident against employee' },
      { id: 'incident_trigger_runs', label: 'incident-retraining-trigger runs' },
      { id: 'retraining_event_created', label: 'Retraining event created' },
      { id: 'employee_notified', label: 'Employee notified of retraining' },
      { id: 'admin_sees_task', label: 'Admin sees retraining task' },
      { id: 'employee_completes_retraining', label: 'Employee completes retraining course' },
      { id: 'compliance_status_updated', label: 'System updates compliance status' },
      { id: 'retraining_closed', label: 'Retraining requirement closed correctly' }
    ]
  },
  // Section 6: Payments
  {
    id: 'payment_section',
    title: '6. Payments (PayPal) + Invoices + Receipts',
    description: 'Payment flow verification',
    icon: <CreditCard className="h-5 w-5" />,
    items: [
      { id: 'select_paid_action', label: 'Company Admin selects paid action' },
      { id: 'paypal_checkout_works', label: 'PayPal checkout success path works' },
      { id: 'returns_to_app', label: 'Payment returns to app correctly' },
      { id: 'payment_recorded', label: 'App records payment in DB' },
      { id: 'invoice_status_updated', label: 'Invoice status: pending → paid' },
      { id: 'receipt_email_sent', label: 'Receipt email sent (if enabled)' },
      { id: 'sandbox_mode_confirmed', label: 'PayPal sandbox mode confirmed' },
      { id: 'no_real_charges', label: 'No real charges occurred' }
    ]
  },
  // Section 7: Email + Link Integrity
  {
    id: 'email_links_section',
    title: '7. Email + Link Integrity',
    description: 'All email links work correctly',
    icon: <Bell className="h-5 w-5" />,
    items: [
      { id: 'verification_email_link', label: 'Verification email link works' },
      { id: 'invite_link_works', label: 'Invite link works' },
      { id: 'password_reset_link', label: 'Password reset link works' },
      { id: 'certificate_link', label: 'Certificate link works' },
      { id: 'payment_receipt_link', label: 'Payment receipt link works (if any)' },
      { id: 'token_expiry_correct', label: 'Token expiry behavior is correct' },
      { id: 'redirect_domain_matches', label: 'Redirect domain matches environment' },
      { id: 'deep_links_land_correctly', label: 'Deep links land on intended screen' }
    ]
  },
  // Section 8: Admin Console + Reporting
  {
    id: 'admin_section',
    title: '8. Admin Console + Reporting + Exports',
    description: 'Admin functionality verification',
    icon: <BarChart3 className="h-5 w-5" />,
    items: [
      { id: 'admin_views_company_list', label: 'Admin views company list' },
      { id: 'admin_views_compliance_status', label: 'Admin views employee compliance status' },
      { id: 'admin_views_incidents', label: 'Admin views incidents + retraining queue' },
      { id: 'export_compliance_packet', label: 'Export employee compliance packet works' },
      { id: 'export_company_roster', label: 'Export company roster works' },
      { id: 'export_certificate_list', label: 'Export certificate list works' },
      { id: 'audit_trail_visible', label: 'Audit trail / activity log visible' },
      { id: 'no_rls_issues', label: 'No RLS issues blocking exports' }
    ]
  },
  // Section 9: Data Integrity + Security (RLS / Tenant Isolation)
  {
    id: 'security_section',
    title: '9. Data Integrity + Security (RLS / Tenant Isolation)',
    description: 'Security and tenant isolation verification',
    icon: <Shield className="h-5 w-5" />,
    items: [
      { id: 'create_two_test_companies', label: 'Create 2 test companies' },
      { id: 'company_a_no_see_b', label: 'Company A employees cannot view Company B' },
      { id: 'api_enforces_rls', label: 'API calls enforce RLS (not UI-only security)' },
      { id: 'tenant_isolation_airtight', label: 'Tenant isolation is airtight' },
      { id: 'no_cross_org_data_leak', label: 'No cross-org data leakage' }
    ]
  },
  // Section 10: Failure / Edge Cases
  {
    id: 'edge_cases_section',
    title: '10. Failure / Edge Cases (Must-test)',
    description: 'System fails safely and recovers',
    icon: <AlertCircle className="h-5 w-5" />,
    items: [
      { id: 'unassigned_course_blocked', label: 'Employee cannot take course not assigned' },
      { id: 'no_duplicate_certs', label: 'Complete course twice → no duplicate certs' },
      { id: 'incident_no_enrollment', label: 'Incident logged for employee with no enrollment handled' },
      { id: 'payment_db_fail_recovery', label: 'Payment success + DB write fail → graceful recovery' },
      { id: 'expired_token_clean_error', label: 'Expired token shows clean error + new link option' },
      { id: 'invalid_link_recovery', label: 'Invalid link shows recovery path' }
    ]
  },
  // Section 11: Supervisor Signoffs (existing)
  {
    id: 'signoffs_section',
    title: '11. Supervisor Signoffs',
    description: 'Training & Signoff Control',
    icon: <Users className="h-5 w-5" />,
    items: [
      { id: 'signoff_saved', label: 'Signoff saved with module + version' },
      { id: 'signoff_initially_valid', label: 'Signoff initially marked valid' },
      { id: 'version_bump_invalidates', label: 'Version bump invalidates old signoffs' }
    ]
  },
  // Section 12: Dashboard Metrics
  {
    id: 'dashboard_section',
    title: '12. Dashboard Metrics',
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
  // Section 13: Mock MCA Audit
  {
    id: 'audit_section',
    title: '13. Mock MCA Audit Walkthrough',
    description: 'Audit readiness verification',
    icon: <ClipboardCheck className="h-5 w-5" />,
    items: [
      { id: 'demonstrate_training_proof', label: 'Able to demonstrate training proof' },
      { id: 'show_incident_response', label: 'Able to show incident response' },
      { id: 'export_records_on_demand', label: 'Able to export records on demand' },
      { id: 'records_complete_consistent', label: 'Records appear complete & consistent' }
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
  // Dynamic section data - keyed by section id
  [sectionId: string]: ChecklistSectionData | string | string[] | boolean | null | undefined;
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

const getDefaultChecklistData = (email: string): ChecklistData => {
  const defaults: ChecklistData = {
    company_name: '',
    test_organization_name: '',
    primary_test_email: email,
    testing_dates: [new Date().toISOString().split('T')[0]],
    testers: [],
    what_worked_well: '',
    what_was_confusing: '',
    blocker_concerns: '',
    overall_status: '',
    confident_for_auditor: null,
    confident_explanation: '',
    signature_name: '',
    roles_tested: []
  };
  
  // Add all section defaults
  CHECKLIST_SECTIONS.forEach(section => {
    defaults[section.id] = defaultSectionData();
  });
  
  return defaults;
};

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
