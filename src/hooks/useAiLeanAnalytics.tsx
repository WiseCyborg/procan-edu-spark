import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AiLeanAnalytics {
  totalSessions: number;
  totalUsers: number;
  avgSessionDuration: number;
  totalMessages: number;
  popularScenarios: Array<{
    scenario: string;
    count: number;
    percentage: number;
  }>;
  recentSessions: Array<{
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    scenario_type: string | null;
    user_name: string;
    organization_name: string | null;
  }>;
  sessionsOverTime: Array<{
    date: string;
    count: number;
  }>;
  topUsers: Array<{
    user_id: string;
    user_name: string;
    organization_name: string | null;
    session_count: number;
    last_active: string;
  }>;
}

export const useAiLeanAnalytics = () => {
  const [analytics, setAnalytics] = useState<AiLeanAnalytics>({
    totalSessions: 0,
    totalUsers: 0,
    avgSessionDuration: 0,
    totalMessages: 0,
    popularScenarios: [],
    recentSessions: [],
    sessionsOverTime: [],
    topUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('ailean_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch profile data separately
      const userIds = [...new Set(sessions?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, organization_id, organizations(name)')
        .in('user_id', userIds);

      // Create a map of user profiles
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      if (!sessions || sessions.length === 0) {
        setAnalytics({
          totalSessions: 0,
          totalUsers: 0,
          avgSessionDuration: 0,
          totalMessages: 0,
          popularScenarios: [],
          recentSessions: [],
          sessionsOverTime: [],
          topUsers: [],
        });
        setLoading(false);
        return;
      }

      // Calculate total sessions
      const totalSessions = sessions.length;

      // Calculate unique users
      const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;

      // Calculate total messages
      const totalMessages = sessions.reduce((sum, s) => {
        const messages = Array.isArray(s.messages) ? s.messages : [];
        return sum + messages.length;
      }, 0);

      // Calculate average session duration in minutes
      const durationsInMinutes = sessions
        .filter(s => s.updated_at && s.created_at)
        .map(s => {
          const created = new Date(s.created_at).getTime();
          const updated = new Date(s.updated_at).getTime();
          return (updated - created) / 1000 / 60;
        });
      const avgDuration = durationsInMinutes.length > 0
        ? durationsInMinutes.reduce((a, b) => a + b, 0) / durationsInMinutes.length
        : 0;

      // Calculate popular scenarios
      const scenarioCounts = sessions.reduce((acc, s) => {
        const scenario = s.scenario_type || 'General Management';
        acc[scenario] = (acc[scenario] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const popularScenarios = Object.entries(scenarioCounts)
        .map(([scenario, count]) => ({
          scenario,
          count,
          percentage: Math.round((count / totalSessions) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Prepare recent sessions
      const recentSessions = sessions.slice(0, 10).map(s => {
        const profile = profileMap.get(s.user_id);
        return {
          id: s.id,
          user_id: s.user_id,
          title: s.title || 'Untitled Session',
          created_at: s.created_at,
          updated_at: s.updated_at,
          message_count: Array.isArray(s.messages) ? s.messages.length : 0,
          scenario_type: s.scenario_type,
          user_name: profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : 'Unknown User',
          organization_name: profile?.organizations?.name || null,
        };
      });

      // Sessions over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sessionsByDate = sessions
        .filter(s => new Date(s.created_at) >= thirtyDaysAgo)
        .reduce((acc, s) => {
          const date = new Date(s.created_at).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const sessionsOverTime = Object.entries(sessionsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top users by session count
      const userSessionCounts = sessions.reduce((acc, s) => {
        const userId = s.user_id;
        const profile = profileMap.get(userId);
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            user_name: profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              : 'Unknown User',
            organization_name: profile?.organizations?.name || null,
            session_count: 0,
            last_active: s.updated_at,
          };
        }
        acc[userId].session_count += 1;
        if (new Date(s.updated_at) > new Date(acc[userId].last_active)) {
          acc[userId].last_active = s.updated_at;
        }
        return acc;
      }, {} as Record<string, any>);

      const topUsers = Object.values(userSessionCounts)
        .sort((a: any, b: any) => b.session_count - a.session_count)
        .slice(0, 10);

      setAnalytics({
        totalSessions,
        totalUsers: uniqueUsers,
        avgSessionDuration: Math.round(avgDuration),
        totalMessages,
        popularScenarios,
        recentSessions,
        sessionsOverTime,
        topUsers,
      });

    } catch (error) {
      console.error('Error fetching AiLean analytics:', error);
      toast({
        title: 'Error loading analytics',
        description: 'Failed to fetch AiLean analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscription
    const channel = supabase
      .channel('ailean-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ailean_sessions',
        },
        () => {
          fetchAnalytics();
          toast({
            title: 'Analytics Updated',
            description: 'AiLean session data has been updated',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnalytics, toast]);

  return { analytics, loading, refreshAnalytics: fetchAnalytics };
};
