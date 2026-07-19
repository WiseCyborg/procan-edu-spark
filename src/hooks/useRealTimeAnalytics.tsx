import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RealTimeMetrics {
  activeUsers: number;
  totalSessions: number;
  onlineUsers: string[];
  systemHealth: {
    database: 'healthy' | 'degraded' | 'down';
    api: 'healthy' | 'degraded' | 'down';
    functions: 'healthy' | 'degraded' | 'down';
  };
  courseProgress: {
    activeStudents: number;
    completionsToday: number;
    averageProgress: number;
  };
  certificates: {
    generatedToday: number;
    pending: number;
    failed: number;
  };
  payments: {
    processing: number;
    completedToday: number;
    failedToday: number;
    totalRevenue: number;
  };
  organizations: {
    active: number;
    newSignups: number;
    complianceAlerts: number;
  };
  security: {
    activeThreats: number;
    loginAttempts: number;
    blockedIPs: string[];
  };
  communications: {
    activeSessions: number;
    pendingTickets: number;
    averageResponseTime: number;
  };
}

export const useRealTimeAnalytics = () => {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    activeUsers: 0,
    totalSessions: 0,
    onlineUsers: [],
    systemHealth: {
      database: 'healthy',
      api: 'healthy',
      functions: 'healthy'
    },
    courseProgress: {
      activeStudents: 0,
      completionsToday: 0,
      averageProgress: 0
    },
    certificates: {
      generatedToday: 0,
      pending: 0,
      failed: 0
    },
    payments: {
      processing: 0,
      completedToday: 0,
      failedToday: 0,
      totalRevenue: 0
    },
    organizations: {
      active: 0,
      newSignups: 0,
      complianceAlerts: 0
    },
    security: {
      activeThreats: 0,
      loginAttempts: 0,
      blockedIPs: []
    },
    communications: {
      activeSessions: 0,
      pendingTickets: 0,
      averageResponseTime: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    timestamp: Date;
    category: string;
  }>>([]);
  
  const { toast } = useToast();

  const addAlert = useCallback((alert: Omit<typeof alerts[0], 'id' | 'timestamp'>) => {
    const newAlert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
    
    if (alert.type === 'error' || alert.type === 'warning') {
      toast({
        title: `${alert.category} Alert`,
        description: alert.message,
        variant: alert.type === 'error' ? 'destructive' : 'default'
      });
    }
  }, [toast]);

  const fetchInitialMetrics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch user activity
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, updated_at')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Fetch course progress
      const { data: userProgress } = await supabase
        .from('user_progress')
        .select('user_id, is_completed, updated_at')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Fetch certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('id, created_at, issue_date')
        .gte('created_at', new Date().toISOString().split('T')[0]);


      // Fetch organizations
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, created_at, admin_approved');

      // Fetch security events
      const { data: securityEvents } = await supabase
        .from('security_events')
        .select('event_type, severity, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Update metrics
      const activeUsers = profiles?.filter(p => 
        new Date(p.updated_at) > new Date(Date.now() - 15 * 60 * 1000)
      ).length || 0;

      const completionsToday = userProgress?.filter(p => 
        p.is_completed && new Date(p.updated_at).getTime() >= new Date().setHours(0, 0, 0, 0)
      ).length || 0;


      setMetrics(prev => ({
        ...prev,
        activeUsers,
        totalSessions: profiles?.length || 0,
        onlineUsers: profiles?.slice(0, 10).map(p => p.user_id) || [],
        courseProgress: {
          activeStudents: userProgress?.length || 0,
          completionsToday,
          averageProgress: userProgress?.length ? 
            (userProgress.filter(p => p.is_completed).length / userProgress.length) * 100 : 0
        },
        certificates: {
          generatedToday: certificates?.length || 0,
          pending: 0,
          failed: 0
        },
        payments: {
          processing: 0,
          completedToday: 0,
          failedToday: 0,
          totalRevenue: 0
        },

        organizations: {
          active: organizations?.filter(o => o.admin_approved).length || 0,
          newSignups: organizations?.filter(o => 
            new Date(o.created_at).getTime() >= new Date().setHours(0, 0, 0, 0)
          ).length || 0,
          complianceAlerts: 0
        },
        security: {
          activeThreats: securityEvents?.filter(e => e.severity === 'high').length || 0,
          loginAttempts: securityEvents?.filter(e => e.event_type.includes('login')).length || 0,
          blockedIPs: []
        }
      }));

    } catch (error) {
      console.error('Error fetching metrics:', error);
      addAlert({
        type: 'error',
        message: 'Failed to load analytics data',
        category: 'System'
      });
    } finally {
      setLoading(false);
    }
  }, [addAlert]);

  const setupRealTimeSubscriptions = useCallback(() => {
    const channels: any[] = [];

    // User activity subscription
    const userChannel = supabase
      .channel('user-activity')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('User activity change:', payload);
          addAlert({
            type: 'info',
            message: `User ${payload.eventType}: ${(payload.new as any)?.first_name || 'Unknown'}`,
            category: 'User Activity'
          });
          fetchInitialMetrics();
        }
      )
      .subscribe();

    // Course progress subscription
    const progressChannel = supabase
      .channel('course-progress')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_progress' },
        (payload) => {
          if ((payload.new as any)?.is_completed) {
            addAlert({
              type: 'success',
              message: 'Course module completed',
              category: 'Education'
            });
          }
          fetchInitialMetrics();
        }
      )
      .subscribe();

    // Certificate subscription
    const certificateChannel = supabase
      .channel('certificates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'certificates' },
        (payload) => {
          addAlert({
            type: 'success',
            message: `New certificate generated: ${payload.new?.certificate_number}`,
            category: 'Certificates'
          });
          fetchInitialMetrics();
        }
      )
      .subscribe();

    // Security events subscription

    const securityChannel = supabase
      .channel('security-events')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_events' },
        (payload) => {
          addAlert({
            type: payload.new?.severity === 'high' ? 'error' : 'warning',
            message: `Security event: ${payload.new?.event_type}`,
            category: 'Security'
          });
          fetchInitialMetrics();
        }
      )
      .subscribe();

    channels.push(userChannel, progressChannel, certificateChannel, securityChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [addAlert, fetchInitialMetrics]);

  useEffect(() => {
    fetchInitialMetrics();
    const cleanup = setupRealTimeSubscriptions();

    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchInitialMetrics, 30000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [fetchInitialMetrics, setupRealTimeSubscriptions]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  return {
    metrics,
    alerts,
    loading,
    refreshMetrics: fetchInitialMetrics,
    clearAlerts,
    dismissAlert,
    addAlert
  };
};