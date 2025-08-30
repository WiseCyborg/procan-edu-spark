import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  pageContext?: {
    route: string;
    title: string;
    description: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  route: string;
}

export const useChatPersistence = () => {
  const { user } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load chat sessions from localStorage
  useEffect(() => {
    if (!user) return;
    
    const savedSessions = localStorage.getItem(`chat-sessions-${user.id}`);
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChatSessions(sessions);
      } catch (error) {
        console.error('Error loading chat sessions:', error);
      }
    }
  }, [user]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (!user || chatSessions.length === 0) return;
    
    try {
      localStorage.setItem(`chat-sessions-${user.id}`, JSON.stringify(chatSessions));
    } catch (error) {
      console.error('Error saving chat sessions:', error);
    }
  }, [chatSessions, user]);

  const startNewSession = useCallback((route: string, title: string) => {
    const sessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: sessionId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      route
    };
    
    setChatSessions(prev => [newSession, ...prev.slice(0, 19)]); // Keep only 20 sessions
    setCurrentSessionId(sessionId);
    return sessionId;
  }, []);

  const saveMessage = useCallback((sessionId: string, message: Message) => {
    setChatSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          messages: [...session.messages, message],
          updatedAt: new Date()
        };
      }
      return session;
    }));
  }, []);

  const saveMessages = useCallback((sessionId: string, messages: Message[]) => {
    setChatSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          messages,
          updatedAt: new Date()
        };
      }
      return session;
    }));
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  const getCurrentSession = useCallback(() => {
    if (!currentSessionId) return null;
    return chatSessions.find(session => session.id === currentSessionId) || null;
  }, [currentSessionId, chatSessions]);

  return {
    chatSessions,
    currentSessionId,
    startNewSession,
    saveMessage,
    saveMessages,
    deleteSession,
    getCurrentSession,
    setCurrentSessionId
  };
};