// Phase 8: Active Call Hook
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveCall {
  id: string;
  room_name: string;
  started_at: string;
  participant_count: number;
}

export const useActiveCall = (conversationId: string) => {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActiveCall = async () => {
      // Get conversation's active call
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('active_call_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation?.active_call_id) {
        setActiveCall(null);
        setIsLoading(false);
        return;
      }

      // Get call details
      const { data: call, error: callError } = await supabase
        .from('video_calls')
        .select('id, room_name, started_at')
        .eq('id', conversation.active_call_id)
        .is('ended_at', null)
        .single();

      if (callError || !call) {
        setActiveCall(null);
        setIsLoading(false);
        return;
      }

      // Get participant count
      const { data: participants, error: participantsError } = await supabase
        .from('video_call_participants')
        .select('id')
        .eq('call_id', call.id);

      if (!participantsError) {
        setActiveCall({
          ...call,
          participant_count: participants?.length || 0,
        });
      }

      setIsLoading(false);
    };

    fetchActiveCall();

    // Subscribe to conversation changes
    const channel = supabase
      .channel(`active-call:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        () => {
          fetchActiveCall();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  const calculateDuration = () => {
    if (!activeCall?.started_at) return '';
    
    const startTime = new Date(activeCall.started_at);
    const now = new Date();
    const durationMs = now.getTime() - startTime.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return {
    activeCall,
    isLoading,
    callDuration: calculateDuration(),
  };
};
