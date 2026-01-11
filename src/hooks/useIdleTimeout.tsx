import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { invalidateOnLogout } from '@/lib/invalidateAccess';

// Constants
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_AT_MS = 25 * 60 * 1000; // 25 minutes - show warning
const ACTIVITY_THROTTLE_MS = 3000; // 3 seconds - debounce activity writes
const STORAGE_KEY = 'pc_lastActivityAt';

interface UseIdleTimeoutReturn {
  showWarningModal: boolean;
  remainingSeconds: number;
  handleStaySignedIn: () => Promise<void>;
  handleLogoutNow: () => Promise<void>;
}

export const useIdleTimeout = (): UseIdleTimeoutReturn => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [lastActivityAt, setLastActivityAt] = useState<number>(Date.now());
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [logoutInProgress, setLogoutInProgress] = useState(false);
  
  const lastWriteRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<number | null>(null);

  // Record activity with throttling
  const recordActivity = useCallback((source: string) => {
    const now = Date.now();
    const shouldWrite = now - lastWriteRef.current > ACTIVITY_THROTTLE_MS;
    
    setLastActivityAt(now);
    
    if (shouldWrite) {
      try {
        localStorage.setItem(STORAGE_KEY, now.toString());
        lastWriteRef.current = now;
      } catch (e) {
        console.warn('Failed to write activity to localStorage:', e);
      }
    }
    
    // Close modal if it's open
    if (showWarningModal) {
      setShowWarningModal(false);
    }
  }, [showWarningModal]);

  // Get effective last activity (cross-tab sync)
  const getEffectiveLastActivity = useCallback((): number => {
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return Math.max(lastActivityAt, stored);
    } catch {
      return lastActivityAt;
    }
  }, [lastActivityAt]);

  // Perform idle logout
  const doIdleLogout = useCallback(async () => {
    if (logoutInProgress) return;
    setLogoutInProgress(true);
    
    try {
      setShowWarningModal(false);
      
      // Clear activity storage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to clear activity storage:', e);
      }
      
      // Clear all cached access data before logout
      invalidateOnLogout(queryClient);
      
      // Sign out
      await signOut();
      
      // Redirect with reason
      window.location.href = '/auth?reason=inactive';
    } catch (e) {
      console.error('Idle logout failed:', e);
      setLogoutInProgress(false);
    }
  }, [logoutInProgress, signOut, queryClient]);

  // Check idle status
  const checkIdle = useCallback(() => {
    if (!user || logoutInProgress) return;
    
    const last = getEffectiveLastActivity();
    const idleMs = Date.now() - last;
    
    if (idleMs >= IDLE_TIMEOUT_MS) {
      doIdleLogout();
      return;
    }
    
    if (idleMs >= WARNING_AT_MS) {
      const remainingMs = IDLE_TIMEOUT_MS - idleMs;
      const sec = Math.ceil(remainingMs / 1000);
      setRemainingSeconds(sec);
      setShowWarningModal(true);
    } else {
      setShowWarningModal(false);
      setRemainingSeconds(0);
    }
  }, [user, logoutInProgress, getEffectiveLastActivity, doIdleLogout]);

  // Handle "Stay signed in" button
  const handleStaySignedIn = useCallback(async () => {
    recordActivity('modal_stay');
    
    try {
      // Refresh session to ensure it's still valid
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        // Session expired during warning period
        await doIdleLogout();
      }
    } catch (e) {
      console.error('Session refresh failed:', e);
    }
  }, [recordActivity, doIdleLogout]);

  // Handle "Log out now" button
  const handleLogoutNow = useCallback(async () => {
    if (logoutInProgress) return;
    setLogoutInProgress(true);
    
    try {
      localStorage.removeItem(STORAGE_KEY);
      
      // Clear all cached access data before logout
      invalidateOnLogout(queryClient);
      
      await signOut();
      window.location.href = '/auth?reason=manual';
    } catch (e) {
      console.error('Manual logout failed:', e);
      setLogoutInProgress(false);
    }
  }, [logoutInProgress, signOut, queryClient]);

  // Set up activity event listeners
  useEffect(() => {
    if (!user) return;

    const activityEvents = [
      'mousemove',
      'mousedown',
      'click',
      'keydown',
      'scroll',
      'touchstart',
      'focus'
    ];

    const handleActivity = () => recordActivity('user_interaction');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recordActivity('visibility_change');
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize activity timestamp
    recordActivity('init');

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, recordActivity]);

  // Record activity on route change
  useEffect(() => {
    if (user) {
      recordActivity('route_change');
    }
  }, [location.pathname, user, recordActivity]);

  // Set up idle check interval
  useEffect(() => {
    if (!user) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    checkIntervalRef.current = window.setInterval(checkIdle, 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [user, checkIdle]);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newTimestamp = Number(e.newValue);
        if (newTimestamp > lastActivityAt) {
          setLastActivityAt(newTimestamp);
          setShowWarningModal(false); // User active in another tab
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [lastActivityAt]);

  return {
    showWarningModal,
    remainingSeconds,
    handleStaySignedIn,
    handleLogoutNow
  };
};
