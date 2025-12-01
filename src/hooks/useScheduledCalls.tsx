import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ScheduledCall {
  id: string;
  conversation_id: string;
  organization_id?: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  host_id: string;
  status: 'scheduled' | 'started' | 'ended' | 'cancelled';
  video_call_id?: string;
  host?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  invites?: Array<{
    user_id: string;
    status: 'pending' | 'accepted' | 'declined';
  }>;
}

export const useScheduledCalls = (conversationId: string) => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalls = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_calls')
        .select(`
          *,
          profiles:host_id (
            first_name,
            last_name,
            profile_photo_url
          ),
          scheduled_call_invites (
            user_id,
            status
          )
        `)
        .eq('conversation_id', conversationId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const formatted: ScheduledCall[] = data?.map(call => ({
        id: call.id,
        conversation_id: call.conversation_id,
        organization_id: call.organization_id,
        title: call.title,
        description: call.description,
        scheduled_at: call.scheduled_at,
        duration_minutes: call.duration_minutes,
        host_id: call.host_id,
        status: call.status as any,
        video_call_id: call.video_call_id,
        host: (call.profiles as any) ? {
          first_name: (call.profiles as any).first_name,
          last_name: (call.profiles as any).last_name,
          profile_photo_url: (call.profiles as any).profile_photo_url
        } : undefined,
        invites: call.scheduled_call_invites as any
      })) || [];

      setCalls(formatted);
    } catch (error) {
      console.error('Error fetching scheduled calls:', error);
      toast.error('Failed to load scheduled calls');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const scheduleCall = useCallback(async (data: {
    title: string;
    description?: string;
    scheduledAt: string;
    durationMinutes: number;
    participantIds: string[];
  }) => {
    if (!user) return;

    try {
      const { data: call, error: callError } = await supabase
        .from('scheduled_calls')
        .insert({
          conversation_id: conversationId,
          title: data.title,
          description: data.description,
          scheduled_at: data.scheduledAt,
          duration_minutes: data.durationMinutes,
          host_id: user.id
        })
        .select()
        .single();

      if (callError) throw callError;

      // Create invites for all participants
      const invites = data.participantIds.map(userId => ({
        scheduled_call_id: call.id,
        user_id: userId
      }));

      const { error: inviteError } = await supabase
        .from('scheduled_call_invites')
        .insert(invites);

      if (inviteError) throw inviteError;

      toast.success('Call scheduled successfully');
      await fetchCalls();
      return call.id;
    } catch (error) {
      console.error('Error scheduling call:', error);
      toast.error('Failed to schedule call');
      return null;
    }
  }, [user, conversationId, fetchCalls]);

  const cancelCall = useCallback(async (callId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_calls')
        .update({ status: 'cancelled' })
        .eq('id', callId);

      if (error) throw error;

      toast.success('Call cancelled');
      await fetchCalls();
    } catch (error) {
      console.error('Error cancelling call:', error);
      toast.error('Failed to cancel call');
    }
  }, [fetchCalls]);

  const respondToInvite = useCallback(async (
    callId: string,
    status: 'accepted' | 'declined'
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('scheduled_call_invites')
        .update({ 
          status, 
          responded_at: new Date().toISOString() 
        })
        .eq('scheduled_call_id', callId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(status === 'accepted' ? 'Invite accepted' : 'Invite declined');
      await fetchCalls();
    } catch (error) {
      console.error('Error responding to invite:', error);
      toast.error('Failed to respond to invite');
    }
  }, [user, fetchCalls]);

  useEffect(() => {
    fetchCalls();

    const channel = supabase
      .channel(`scheduled-calls:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_calls',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          fetchCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchCalls]);

  return {
    calls,
    loading,
    scheduleCall,
    cancelCall,
    respondToInvite,
    refreshCalls: fetchCalls
  };
};
