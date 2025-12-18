import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Session {
  id: string;
  title: string;
  session_type: string;
  status: string;
  host_id: string;
  organization_id?: string;
  video_call_id?: string;
  record_audio: boolean;
  transcribe: boolean;
  generate_summary: boolean;
  track_actions: boolean;
  pre_meeting_context?: any;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

interface SessionSummary {
  id: string;
  session_id: string;
  executive_summary?: string;
  key_outcomes?: any;
  risks_identified?: any;
  topics_discussed?: any;
  duration_minutes?: number;
  participant_count?: number;
}

interface SessionAction {
  id: string;
  session_id: string;
  task_description: string;
  owner_name?: string;
  due_date?: string;
  priority: string;
  status: string;
}

export const useCoveredSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('covered_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('covered_sessions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'covered_sessions' },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  const createSession = useCallback(async (params: {
    title: string;
    sessionType: string;
    organizationId?: string;
    videoCallId?: string;
    conversationId?: string;
    recordAudio?: boolean;
    transcribe?: boolean;
    generateSummary?: boolean;
    trackActions?: boolean;
    scheduledAt?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('covered_sessions')
        .insert({
          title: params.title,
          session_type: params.sessionType,
          host_id: user.id,
          organization_id: params.organizationId,
          video_call_id: params.videoCallId,
          conversation_id: params.conversationId,
          record_audio: params.recordAudio ?? true,
          transcribe: params.transcribe ?? true,
          generate_summary: params.generateSummary ?? true,
          track_actions: params.trackActions ?? true,
          scheduled_at: params.scheduledAt,
          status: params.scheduledAt ? 'scheduled' : 'in_progress',
          started_at: params.scheduledAt ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add host as participant
      await supabase.from('session_participants').insert({
        session_id: data.id,
        user_id: user.id,
        participant_name: user.email || 'Host',
        participant_role: 'admin',
        consent_given: true,
        consent_given_at: new Date().toISOString(),
      });

      // Get pre-meeting context
      await supabase.functions.invoke('process-session', {
        body: { sessionId: data.id, action: 'get_context' },
      });

      toast({
        title: 'Session created',
        description: 'Agent coverage is now active',
      });

      return data;
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Failed to create session',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const endSession = useCallback(async (sessionId: string) => {
    try {
      // Update session end time
      await supabase
        .from('covered_sessions')
        .update({ 
          ended_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', sessionId);

      // Trigger summarization
      const { data, error } = await supabase.functions.invoke('process-session', {
        body: { sessionId, action: 'summarize' },
      });

      if (error) throw error;

      toast({
        title: 'Session ended',
        description: 'Summary and action items are being generated',
      });

      return data;
    } catch (error: any) {
      console.error('Error ending session:', error);
      toast({
        title: 'Error ending session',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const getSessionSummary = useCallback(async (sessionId: string): Promise<SessionSummary | null> => {
    try {
      const { data, error } = await supabase
        .from('session_summaries')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching summary:', error);
      return null;
    }
  }, []);

  const getSessionActions = useCallback(async (sessionId: string): Promise<SessionAction[]> => {
    try {
      const { data, error } = await supabase
        .from('session_actions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching actions:', error);
      return [];
    }
  }, []);

  const updateActionStatus = useCallback(async (actionId: string, status: string) => {
    try {
      await supabase
        .from('session_actions')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', actionId);

      toast({
        title: 'Action updated',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to update action',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    sessions,
    isLoading,
    createSession,
    endSession,
    getSessionSummary,
    getSessionActions,
    updateActionStatus,
    refresh: fetchSessions,
  };
};
