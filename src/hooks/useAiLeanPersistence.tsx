import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AiLeanMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiLeanSession {
  id: string;
  user_id: string;
  title: string;
  messages: AiLeanMessage[];
  scenario_type?: string;
  created_at: Date;
  updated_at: Date;
}

export const useAiLeanPersistence = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AiLeanSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load sessions from database
  const loadSessions = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ailean_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const parsedSessions = (data || []).map((session: any) => ({
        ...session,
        created_at: new Date(session.created_at),
        updated_at: new Date(session.updated_at),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));

      setSessions(parsedSessions);
    } catch (error) {
      console.error('Error loading AiLean sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Create new session
  const createSession = useCallback(async (firstMessage: string, scenarioType?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Generate title from first message (first 50 chars)
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 47) + '...'
        : firstMessage;

      const newSession = {
        user_id: user.id,
        title,
        messages: [],
        scenario_type: scenarioType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('ailean_sessions')
        .insert([newSession])
        .select()
        .single();

      if (error) throw error;

      await loadSessions();
      return data.id;
    } catch (error) {
      console.error('Error creating AiLean session:', error);
      return null;
    }
  }, [user, loadSessions]);

  // Save message to session
  const saveMessage = useCallback(async (sessionId: string, message: AiLeanMessage) => {
    if (!user) return;

    try {
      // Get current session
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const updatedMessages = [...session.messages, message];

      const { error } = await supabase
        .from('ailean_sessions')
        .update({
          messages: updatedMessages as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [user, sessions, loadSessions]);

  // Load specific session
  const loadSession = useCallback(async (sessionId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('ailean_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      return {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        messages: (data.messages as any[]).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }, [user]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ailean_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }

      await loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, [user, currentSessionId, loadSessions]);

  // Get current session
  const getCurrentSession = useCallback(() => {
    if (!currentSessionId) return null;
    return sessions.find(s => s.id === currentSessionId) || null;
  }, [currentSessionId, sessions]);

  return {
    sessions,
    currentSessionId,
    loading,
    createSession,
    saveMessage,
    loadSession,
    deleteSession,
    getCurrentSession,
    setCurrentSessionId,
    refreshSessions: loadSessions
  };
};
