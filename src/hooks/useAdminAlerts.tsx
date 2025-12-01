import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminAlert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export const useAdminAlerts = () => {
  return useQuery<AdminAlert[]>({
    queryKey: ['admin-alerts'],
    queryFn: async (): Promise<AdminAlert[]> => {
      const alerts: AdminAlert[] = [];

      // Check for failed emails
      const { data: failedEmails } = await supabase
        .from('email_logs')
        .select('id')
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (failedEmails && failedEmails.length > 20) {
        alerts.push({
          severity: 'critical',
          message: `${failedEmails.length} emails failed in last 24 hours - Email system may be down`,
          actionLabel: 'View Diagnostics'
        });
      } else if (failedEmails && failedEmails.length > 5) {
        alerts.push({
          severity: 'warning',
          message: `${failedEmails.length} emails failed in last 24 hours`,
          actionLabel: 'View Logs'
        });
      }

      // Check for pending applications
      const { data: pendingApps } = await supabase
        .from('dispensary_applications')
        .select('id, created_at')
        .eq('application_status', 'pending')
        .lt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

      if (pendingApps && pendingApps.length > 0) {
        alerts.push({
          severity: 'warning',
          message: `${pendingApps.length} applications pending for over 48 hours`,
          actionLabel: 'Review Applications'
        });
      }

      // Check for at-risk employees
      const { data: atRiskEmployees } = await supabase
        .from('user_learning_journey')
        .select('id')
        .eq('at_risk_flag', true);

      if (atRiskEmployees && atRiskEmployees.length > 0) {
        alerts.push({
          severity: 'warning',
          message: `${atRiskEmployees.length} employees at risk of not completing training`,
          actionLabel: 'Send Reminders'
        });
      }

      // Check for expiring certificates
      const { data: expiringCerts } = await supabase
        .from('certificates')
        .select('id')
        .gte('expiry_date', new Date().toISOString())
        .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

      if (expiringCerts && expiringCerts.length > 10) {
        alerts.push({
          severity: 'info',
          message: `${expiringCerts.length} certificates expiring in next 30 days`,
          actionLabel: 'Send Renewal Reminders'
        });
      }

      return alerts;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};
