import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface GuestSession {
  sessionId: string;
  createdAt: string;
  email?: string;
}

const SESSION_KEY = 'procann_guest_session';
const SESSION_EXPIRY_DAYS = 30;

export const useGuestSession = () => {
  const [session, setSession] = useState<GuestSession | null>(null);

  useEffect(() => {
    // Load or create session
    const loadSession = () => {
      const stored = localStorage.getItem(SESSION_KEY);
      
      if (stored) {
        try {
          const parsed: GuestSession = JSON.parse(stored);
          
          // Check if session is expired
          const createdDate = new Date(parsed.createdAt);
          const now = new Date();
          const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff < SESSION_EXPIRY_DAYS) {
            setSession(parsed);
            return;
          }
        } catch (error) {
          console.error('Error parsing guest session:', error);
        }
      }
      
      // Create new session
      const newSession: GuestSession = {
        sessionId: uuidv4(),
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
    };

    loadSession();
  }, []);

  const updateEmail = (email: string) => {
    if (!session) return;
    
    const updated: GuestSession = {
      ...session,
      email
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    setSession(updated);
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return {
    session,
    sessionId: session?.sessionId,
    email: session?.email,
    updateEmail,
    clearSession,
    isLoading: session === null
  };
};
