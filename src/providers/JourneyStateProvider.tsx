import React, { createContext, useContext, useEffect, ReactNode } from 'react';
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

  // Auto-track page visits
  useEffect(() => {
    if (user && location.pathname) {
      trackPageVisit(location.pathname);
    }
  }, [user, location.pathname, trackPageVisit]);

  const value: JourneyStateContextType = {};

  return (
    <JourneyStateContext.Provider value={value}>
      {children}
    </JourneyStateContext.Provider>
  );
};
