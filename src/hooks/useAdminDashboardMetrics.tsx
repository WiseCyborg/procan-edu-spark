import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardMetrics {
  activeUsers: number;
  pendingVerifications: number;
  totalFAQs: number;
  aiGeneratedFAQs: number;
  emailsSent: number;
  activeChats: number;
  aiLeanSessions: number;
  aiLeanActiveManagers: number;
  totalOrganizations: number;
  activeOrganizations: number;
}

export const useAdminDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeUsers: 0,
    pendingVerifications: 0,
    totalFAQs: 0,
    aiGeneratedFAQs: 0,
    emailsSent: 0,
    activeChats: 0,
    aiLeanSessions: 0,
    aiLeanActiveManagers: 0,
    totalOrganizations: 0,
    activeOrganizations: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      // Fetch active users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Note: Pending verifications count requires admin access to auth.users
      // Setting to 0 for now as it requires service role key
      const pendingCount = 0;

      // Fetch total active FAQs
      const { count: faqCount } = await supabase
        .from('faq_entries')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch AI-generated FAQs (created by system/admin with metadata)
      const { count: aiGeneratedCount } = await supabase
        .from('faq_entries')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('created_by', 'is', null);

      // Fetch emails sent count
      const { count: emailsCount } = await supabase
        .from('communication_logs')
        .select('*', { count: 'exact', head: true });

      // Fetch active conversations count
      const { count: chatsCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      // Fetch AiLean sessions count
      const { count: aiLeanCount } = await supabase
        .from('ailean_sessions')
        .select('*', { count: 'exact', head: true });

      // Fetch distinct AiLean users
      const { data: aiLeanUsers } = await supabase
        .from('ailean_sessions')
        .select('user_id');
      
      const uniqueManagers = new Set(aiLeanUsers?.map(s => s.user_id)).size;

      // Fetch organizations counts
      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id, is_active');
      
      const totalOrgsCount = allOrgs?.length || 0;
      const activeOrgsCount = allOrgs?.filter(o => o.is_active === true).length || 0;

      setMetrics({
        activeUsers: usersCount || 0,
        pendingVerifications: pendingCount,
        totalFAQs: faqCount || 0,
        aiGeneratedFAQs: aiGeneratedCount || 0,
        emailsSent: emailsCount || 0,
        activeChats: chatsCount || 0,
        aiLeanSessions: aiLeanCount || 0,
        aiLeanActiveManagers: uniqueManagers,
        totalOrganizations: totalOrgsCount || 0,
        activeOrganizations: activeOrgsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    // Set up real-time subscriptions
    const channel = supabase
      .channel('dashboard-metrics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchMetrics();
          toast.info('User data updated');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'faq_entries' },
        () => {
          fetchMetrics();
          toast.info('FAQ data updated');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'communication_logs' },
        () => {
          fetchMetrics();
          toast.info('Communication data updated');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchMetrics();
          toast.info('Conversation data updated');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organizations' },
        () => {
          fetchMetrics();
          toast.info('Organization data updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics]);

  return { metrics, loading, refreshMetrics: fetchMetrics };
};
