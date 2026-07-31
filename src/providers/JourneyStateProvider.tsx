import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useJourneyState } from '@/hooks/useJourneyState';

interface JourneyStateContextType {
  // Add any context values you need to expose
}

const JourneyStateContext = createContext<JourneyStateContextType | undefined>(undefined);

export const useJourneyStateContext = () => {
  const context = useContext(JourneyStateContext);
  if (!context) {
    throw new Error('useJourneyStateContext must be used within JourneyStateProvider');
  }
  return context;
};

interface JourneyStateProviderProps {
  children: ReactNode;
}

export const JourneyStateProvider: React.FC<JourneyStateProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { trackPageVisit } = useJourneyState();
  const trackRef = useRef(trackPageVisit);
  trackRef.current = trackPageVisit;
  const lastTrackedRef = useRef<string | null>(null);

  // Auto-track page visits (once per pathname change)
  useEffect(() => {
    if (!user || !location.pathname) return;
    const key = `${user.id}:${location.pathname}`;
    if (lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;
    trackRef.current(location.pathname);
  }, [user, location.pathname]);

  const value: JourneyStateContextType = {};

  return (
    <JourneyStateContext.Provider value={value}>
      {children}
    </JourneyStateContext.Provider>
  );
};
