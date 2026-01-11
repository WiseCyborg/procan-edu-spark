import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { invalidateOnLogout } from '@/lib/invalidateAccess';

const AUTH_EVENT_KEY = 'pc_auth_event';
const SESSION_EXPIRED_EVENT = 'session_expired';
const SIGNED_OUT_EVENT = 'signed_out';

/**
 * Session hardening hook - handles cross-tab sync, token refresh failures,
 * and ensures consistent logout behavior across the app.
 */
export const useSessionHardening = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const isHandlingLogout = useRef(false);

  /**
   * Broadcast logout event to other tabs
   */
  const broadcastLogout = useCallback((reason: string) => {
    try {
      localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({
        event: reason,
        timestamp: Date.now(),
      }));
      // Clear immediately to allow future events
      setTimeout(() => localStorage.removeItem(AUTH_EVENT_KEY), 100);
    } catch (e) {
      console.warn('[SessionHardening] Failed to broadcast logout:', e);
    }
  }, []);

  /**
   * Handle logout with cache clearing and redirect
   */
  const handleLogout = useCallback(async (reason: string) => {
    if (isHandlingLogout.current) return;
    isHandlingLogout.current = true;

    try {
      // Broadcast to other tabs first
      broadcastLogout(reason);
      
      // Clear all cached data
      invalidateOnLogout(queryClient);
      
      // Sign out from Supabase
      await signOut();
      
      // Redirect based on reason
      const redirectUrl = reason === SESSION_EXPIRED_EVENT 
        ? '/auth?reason=session_expired'
        : '/auth?reason=signed_out';
      
      window.location.href = redirectUrl;
    } catch (e) {
      console.error('[SessionHardening] Logout error:', e);
      // Force redirect even on error
      window.location.href = '/auth?reason=error';
    }
  }, [broadcastLogout, queryClient, signOut]);

  /**
   * Handle auth state changes from Supabase
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' && !isHandlingLogout.current) {
          console.log('[SessionHardening] Auth state: SIGNED_OUT');
          broadcastLogout(SIGNED_OUT_EVENT);
          invalidateOnLogout(queryClient);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[SessionHardening] Token refreshed successfully');
        } else if (event === 'USER_UPDATED') {
          console.log('[SessionHardening] User updated, refreshing queries');
          queryClient.invalidateQueries({ queryKey: ['access-snapshot'] });
          queryClient.invalidateQueries({ queryKey: ['user-context'] });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [broadcastLogout, queryClient]);

  /**
   * Listen for logout events from other tabs
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_EVENT_KEY && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          console.log('[SessionHardening] Received auth event from other tab:', event);
          
          if (event.event === SIGNED_OUT_EVENT || event.event === SESSION_EXPIRED_EVENT) {
            // Another tab logged out, we should too
            invalidateOnLogout(queryClient);
            
            const redirectUrl = event.event === SESSION_EXPIRED_EVENT 
              ? '/auth?reason=session_expired'
              : '/auth?reason=signed_out';
            
            window.location.href = redirectUrl;
          }
        } catch (e) {
          console.warn('[SessionHardening] Failed to parse auth event:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  /**
   * Handle session expiration errors from queries
   */
  useEffect(() => {
    const handleQueryError = (error: unknown) => {
      if (error instanceof Error) {
        const isAuthError = 
          error.message.includes('JWT') ||
          error.message.includes('token') ||
          error.message.includes('session') ||
          error.message.includes('401') ||
          error.message.includes('refresh_token');

        if (isAuthError && user) {
          console.warn('[SessionHardening] Auth error detected:', error.message);
          handleLogout(SESSION_EXPIRED_EVENT);
        }
      }
    };

    // Set up global error handler for query cache
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        handleQueryError(event.query.state.error);
      }
    });

    return () => unsubscribe();
  }, [user, queryClient, handleLogout]);

  return {
    handleLogout,
    broadcastLogout,
  };
};
