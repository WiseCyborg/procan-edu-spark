import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface EmailHealthSnapshot {
  id: string;
  created_at: string;
  delivery_rate_24h: number | null;
  bounce_rate_24h: number | null;
  complaint_rate_24h: number | null;
  failures_1h: number;
  latency_avg_ms: number;
  queue_depth: number;
  circuit_state: string;
  circuit_reason: string | null;
  emails_sent_24h: number;
  emails_delivered_24h: number;
  emails_opened_24h: number;
  emails_clicked_24h: number;
}

interface EmailEvent {
  id: string;
  created_at: string;
  org_id: string | null;
  recipient_email: string;
  template_id: string | null;
  status: string;
  error_message: string | null;
  provider: string;
}

interface AgentStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastCheck: string | null;
  issuesFound: number;
}

export const useEmailHealthSnapshot = () => {
  return useQuery({
    queryKey: ['email-health-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_health_snapshot')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EmailHealthSnapshot | null;
    },
    refetchInterval: 30000,
  });
};

export const useEmailEvents = (limit = 50) => {
  return useQuery({
    queryKey: ['email-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as EmailEvent[];
    },
    refetchInterval: 30000,
  });
};

export const useEmailIncidents = () => {
  return useQuery({
    queryKey: ['email-incidents'],
    queryFn: async () => {
      // Fetch recent failures and issues
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: failures } = await supabase
        .from('email_events')
        .select('*')
        .eq('status', 'failed')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      const { data: bounces } = await supabase
        .from('email_events')
        .select('*')
        .eq('status', 'bounced')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      return {
        failures: failures || [],
        bounces: bounces || [],
        total: (failures?.length || 0) + (bounces?.length || 0),
      };
    },
    refetchInterval: 30000,
  });
};

export const useRunEmailHealthAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('email-health-agent');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-health-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['email-events'] });
      queryClient.invalidateQueries({ queryKey: ['email-incidents'] });
    },
  });
};

export const usePauseSends = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('email_circuit_breaker')
        .update({ 
          circuit_state: 'open',
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-health-snapshot'] });
    },
  });
};

export const useResumeSends = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('email_circuit_breaker')
        .update({ 
          circuit_state: 'closed',
          closed_at: new Date().toISOString(),
          failure_count: 0,
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-health-snapshot'] });
    },
  });
};

export const useEmailRealtimeUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('email-ops-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['email-events'] });
          queryClient.invalidateQueries({ queryKey: ['email-incidents'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_health_snapshot' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['email-health-snapshot'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
