import { supabase } from "@/integrations/supabase/client";

export interface Gap {
  id: string;
  type: 'communication' | 'process' | 'data' | 'automation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedRecords: number;
  recommendation: string;
  detectedAt: Date;
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
          title: 'Applications Missing Confirmation Emails',
          description: `${unconfirmedApps.length} applications submitted without confirmation emails sent`,
          affectedRecords: unconfirmedApps.length,
          recommendation: 'Trigger send-application-submitted edge function for these applications',
          detectedAt: new Date(),
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
          title: 'Payments Without Receipt Emails',
          description: `${unconfirmedPayments.length} completed payments missing receipt emails`,
          affectedRecords: unconfirmedPayments.length,
          recommendation: 'Send payment receipt emails via send-payment-receipt edge function',
          detectedAt: new Date(),
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
        title: 'Certificates Expiring Without Warnings',
        description: `${expiringCerts.length} certificates expiring within 90 days`,
        affectedRecords: expiringCerts.length,
        recommendation: 'Schedule certificate expiry warning emails',
        detectedAt: new Date(),
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
        title: 'Failed Emails Without Retry Attempts',
        description: `${failedEmails.length} emails failed in last 24 hours`,
        affectedRecords: failedEmails.length,
        recommendation: 'Implement automatic retry logic for failed emails',
        detectedAt: new Date(),
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
        title: 'Applications Stuck in Review',
        description: `${stuckApps.length} applications pending for over 48 hours`,
        affectedRecords: stuckApps.length,
        recommendation: 'Escalate to admin for immediate review',
        detectedAt: new Date(),
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
        title: 'Expired Payment Links Without Follow-Up',
        description: `${expiredPayments.length} applications with expired payment deadlines`,
        affectedRecords: expiredPayments.length,
        recommendation: 'Regenerate payment links and contact applicants',
        detectedAt: new Date(),
      });
    }

  } catch (error) {
    console.error('Error detecting process gaps:', error);
  }

  return gaps;
};

export const detectAllGaps = async (): Promise<Gap[]> => {
  const [communicationGaps, processGaps] = await Promise.all([
    detectCommunicationGaps(),
    detectProcessGaps(),
  ]);

  return [...communicationGaps, ...processGaps].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};
