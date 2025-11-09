import { supabase } from "@/integrations/supabase/client";

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';
export type GapCategory = 'compliance' | 'training' | 'system' | 'engagement' | 'data' | 'payment';

export interface Gap {
  id: string;
  type: 'communication' | 'process' | 'data' | 'automation';
  severity: GapSeverity;
  category?: GapCategory;
  title: string;
  description: string;
  affectedRecords: number;
  recommendation: string;
  detectedAt: Date;
  auto_fixable?: boolean;
  affected_entity: string;
  affected_entity_id?: string;
  suggested_action: string;
  metadata?: any;
}

export const detectCommunicationGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];

  try {
    // Gap 1: Applications without confirmation email
    const { data: applications } = await supabase
      .from('dispensary_applications')
      .select('id, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (applications) {
      const { data: emailLogs } = await supabase
        .from('email_logs')
        .select('metadata')
        .eq('email_type', 'application_submitted');

      const emailedAppIds = new Set(
        emailLogs?.map(log => {
          const meta = log.metadata as any;
          return meta?.application_id;
        }).filter(Boolean) || []
      );

      const unconfirmedApps = applications.filter(app => !emailedAppIds.has(app.id));

      if (unconfirmedApps.length > 0) {
        gaps.push({
          id: 'unconfirmed-applications',
          type: 'communication',
          severity: 'high',
          category: 'system',
          title: 'Applications Missing Confirmation Emails',
          description: `${unconfirmedApps.length} applications submitted without confirmation emails sent`,
          affectedRecords: unconfirmedApps.length,
          recommendation: 'Trigger send-application-submitted edge function for these applications',
          detectedAt: new Date(),
          affected_entity: 'Dispensary Applications',
          suggested_action: 'Resend application confirmation emails',
          auto_fixable: true,
        });
      }
    }

    // Gap 2: Paid purchases without receipt emails
    const { data: purchases } = await supabase
      .from('rvt_purchases')
      .select('id')
      .eq('status', 'paid');

    if (purchases) {
      const { data: receiptLogs } = await supabase
        .from('email_logs')
        .select('metadata')
        .eq('email_type', 'payment_receipt');

      const receiptPurchaseIds = new Set(
        receiptLogs?.map(log => {
          const meta = log.metadata as any;
          return meta?.purchase_id;
        }).filter(Boolean) || []
      );

      const unconfirmedPayments = purchases.filter(p => !receiptPurchaseIds.has(p.id));

      if (unconfirmedPayments.length > 0) {
        gaps.push({
          id: 'missing-payment-receipts',
          type: 'communication',
          severity: 'high',
          category: 'payment',
          title: 'Payments Without Receipt Emails',
          description: `${unconfirmedPayments.length} completed payments missing receipt emails`,
          affectedRecords: unconfirmedPayments.length,
          recommendation: 'Send payment receipt emails via send-payment-receipt edge function',
          detectedAt: new Date(),
          affected_entity: 'Payment Receipts',
          suggested_action: 'Send payment receipt emails',
          auto_fixable: true,
        });
      }
    }

    // Gap 3: Expiring certificates without warnings (< 90 days)
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const { data: expiringCerts } = await supabase
      .from('certificates')
      .select('id')
      .lte('expiry_date', ninetyDaysFromNow.toISOString())
      .eq('is_revoked', false);

    if (expiringCerts && expiringCerts.length > 0) {
      gaps.push({
        id: 'missing-expiry-warnings',
        type: 'communication',
        severity: 'medium',
        category: 'training',
        title: 'Certificates Expiring Without Warnings',
        description: `${expiringCerts.length} certificates expiring within 90 days`,
        affectedRecords: expiringCerts.length,
        recommendation: 'Schedule certificate expiry warning emails',
        detectedAt: new Date(),
        affected_entity: 'Certificates',
        suggested_action: 'Send expiry warning notifications',
        auto_fixable: true,
      });
    }

    // Gap 4: Failed emails without retry attempts
    const { data: failedEmails } = await supabase
      .from('email_logs')
      .select('id')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (failedEmails && failedEmails.length > 0) {
      gaps.push({
        id: 'failed-emails-no-retry',
        type: 'automation',
        severity: 'high',
        category: 'system',
        title: 'Failed Emails Without Retry Attempts',
        description: `${failedEmails.length} emails failed in last 24 hours`,
        affectedRecords: failedEmails.length,
        recommendation: 'Implement automatic retry logic for failed emails',
        detectedAt: new Date(),
        affected_entity: 'Email System',
        suggested_action: 'Review email logs and retry failed sends',
        auto_fixable: true,
      });
    }

  } catch (error) {
    console.error('Error detecting communication gaps:', error);
  }

  return gaps;
};

export const detectProcessGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];

  try {
    // Gap 1: Applications stuck in pending for > 48 hours
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: stuckApps } = await supabase
      .from('dispensary_applications')
      .select('id')
      .eq('application_status', 'pending')
      .lt('created_at', twoDaysAgo.toISOString());

    if (stuckApps && stuckApps.length > 0) {
      gaps.push({
        id: 'stuck-applications',
        type: 'process',
        severity: 'high',
        category: 'compliance',
        title: 'Applications Stuck in Review',
        description: `${stuckApps.length} applications pending for over 48 hours`,
        affectedRecords: stuckApps.length,
        recommendation: 'Escalate to admin for immediate review',
        detectedAt: new Date(),
        affected_entity: 'Pending Applications',
        suggested_action: 'Review and process pending applications',
        auto_fixable: false,
      });
    }

    // Gap 2: Payment links expired without follow-up
    const { data: expiredPayments } = await supabase
      .from('dispensary_applications')
      .select('id')
      .eq('application_status', 'approved')
      .lt('registration_token_expires_at', new Date().toISOString())
      .is('payment_completed_at', null);

    if (expiredPayments && expiredPayments.length > 0) {
      gaps.push({
        id: 'expired-payment-links',
        type: 'process',
        severity: 'critical',
        category: 'payment',
        title: 'Expired Payment Links Without Follow-Up',
        description: `${expiredPayments.length} applications with expired payment deadlines`,
        affectedRecords: expiredPayments.length,
        recommendation: 'Regenerate payment links and contact applicants',
        detectedAt: new Date(),
        affected_entity: 'Expired Payment Links',
        suggested_action: 'Regenerate payment links and send follow-up',
        auto_fixable: true,
      });
    }

  } catch (error) {
    console.error('Error detecting process gaps:', error);
  }

  return gaps;
};

export const detectTrainingGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  try {
    // Expired certificates
    const { data: expiredCerts } = await supabase
      .from('certificates')
      .select('id, user_id, profiles(full_name)')
      .lt('expiry_date', new Date().toISOString())
      .eq('is_revoked', false);

    if (expiredCerts && expiredCerts.length > 0) {
      expiredCerts.forEach((cert: any) => {
        gaps.push({
          id: `expired-cert-${cert.id}`,
          type: 'process',
          severity: 'high',
          category: 'training',
          title: 'Expired Certificate',
          description: `Certificate has expired and needs renewal`,
          affectedRecords: 1,
          recommendation: 'Send renewal notification',
          detectedAt: new Date(),
          auto_fixable: true,
          affected_entity: cert.profiles?.full_name || 'Unknown User',
          suggested_action: 'Enroll in recertification course',
        });
      });
    }
  } catch (error) {
    console.error('Error detecting training gaps:', error);
  }
  return gaps;
};

export const detectDataQualityGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  try {
    // Incomplete profiles
    const { data: incompleteProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .or('phone.is.null,bio.is.null');

    if (incompleteProfiles && incompleteProfiles.length > 0) {
      incompleteProfiles.forEach((profile: any) => {
        gaps.push({
          id: `incomplete-profile-${profile.id}`,
          type: 'data',
          severity: 'medium',
          category: 'data',
          title: 'Incomplete Profile',
          description: `User profile is missing required information`,
          affectedRecords: 1,
          recommendation: 'Prompt user to complete profile',
          detectedAt: new Date(),
          auto_fixable: false,
          affected_entity: profile.full_name || 'Unknown User',
          suggested_action: 'Complete missing profile fields',
        });
      });
    }
  } catch (error) {
    console.error('Error detecting data quality gaps:', error);
  }
  return gaps;
};

export const detectPaymentGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  try {
    // Failed payments
    const { data: failedPayments } = await supabase
      .from('rvt_purchases')
      .select('id, organization_id, organizations(name)')
      .eq('status', 'failed');

    if (failedPayments && failedPayments.length > 0) {
      failedPayments.forEach((payment: any) => {
        gaps.push({
          id: `failed-payment-${payment.id}`,
          type: 'process',
          severity: 'high',
          category: 'payment',
          title: 'Failed Payment',
          description: `Payment processing failed`,
          affectedRecords: 1,
          recommendation: 'Contact organization to retry payment',
          detectedAt: new Date(),
          auto_fixable: false,
          affected_entity: payment.organizations?.name || 'Unknown Organization',
          suggested_action: 'Retry payment with updated payment method',
        });
      });
    }
  } catch (error) {
    console.error('Error detecting payment gaps:', error);
  }
  return gaps;
};

export const detectEngagementGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  try {
    // Placeholder for engagement detection - AiLean sessions table will be created later
    // This prevents build errors while maintaining the API
  } catch (error) {
    console.error('Error detecting engagement gaps:', error);
  }
  return gaps;
};

export const detectComplianceGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  try {
    // Check for modules without COMAR references
    const { data: modules } = await supabase
      .from('course_modules')
      .select('module_number, title, comar_reference')
      .or('comar_reference.is.null,comar_reference.eq.');

    if (modules && modules.length > 0) {
      modules.forEach((module: any) => {
        gaps.push({
          id: `missing-comar-${module.module_number}`,
          type: 'data',
          severity: 'medium',
          category: 'compliance',
          title: 'Missing COMAR Reference',
          description: `Module ${module.module_number} lacks COMAR regulatory reference`,
          affectedRecords: 1,
          recommendation: 'Add COMAR reference to module',
          detectedAt: new Date(),
          auto_fixable: false,
          affected_entity: module.title,
          affected_entity_id: module.module_number.toString(),
          suggested_action: 'Review and add appropriate COMAR 14.17.05 reference',
        });
      });
    }
  } catch (error) {
    console.error('Error detecting compliance gaps:', error);
  }
  return gaps;
};

export const detectAllGaps = async (): Promise<Gap[]> => {
  const [communicationGaps, processGaps, trainingGaps, dataGaps, paymentGaps, engagementGaps, complianceGaps] = await Promise.all([
    detectCommunicationGaps(),
    detectProcessGaps(),
    detectTrainingGaps(),
    detectDataQualityGaps(),
    detectPaymentGaps(),
    detectEngagementGaps(),
    detectComplianceGaps(),
  ]);

  return [...communicationGaps, ...processGaps, ...trainingGaps, ...dataGaps, ...paymentGaps, ...engagementGaps, ...complianceGaps].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

export interface GapSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  score: number;
  byCategory: Record<GapCategory, number>;
}

export const getGapSummary = (gaps: Gap[]): GapSummary => {
  const summary: GapSummary = {
    total: gaps.length,
    critical: gaps.filter(g => g.severity === 'critical').length,
    high: gaps.filter(g => g.severity === 'high').length,
    medium: gaps.filter(g => g.severity === 'medium').length,
    low: gaps.filter(g => g.severity === 'low').length,
    score: 100,
    byCategory: {
      compliance: 0,
      training: 0,
      system: 0,
      engagement: 0,
      data: 0,
      payment: 0,
    },
  };

  // Calculate score based on severity weights
  const severityWeights = { critical: 10, high: 5, medium: 2, low: 1 };
  const totalWeight = gaps.reduce((sum, gap) => sum + severityWeights[gap.severity], 0);
  summary.score = Math.max(0, 100 - totalWeight);

  // Count by category
  gaps.forEach(gap => {
    if (gap.category) {
      summary.byCategory[gap.category]++;
    }
  });

  return summary;
};
