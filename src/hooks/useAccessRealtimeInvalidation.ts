import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Real-time invalidation hook for access-related data.
 * Subscribes to changes in user_roles, entitlements, and rvt_seats.
 * When any change is detected, invalidates relevant query caches.
 */

export const useAccessRealtimeInvalidation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user?.id) {
      // Clean up existing subscription if user logs out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Create a single channel for all access-related changes
    const channel = supabase
      .channel(`access-changes-${user.id}`)
      // Listen to user_roles changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] user_roles change:', payload.eventType);
          invalidateAllAccessQueries(queryClient, user.id);
        }
      )
      // Listen to entitlements changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entitlements',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] entitlements change:', payload.eventType);
          invalidateAllAccessQueries(queryClient, user.id);
        }
      )
      // Listen to rvt_seats changes (seat assignments)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rvt_seats',
          filter: `assigned_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] rvt_seats change:', payload.eventType);
          invalidateAllAccessQueries(queryClient, user.id);
        }
      )
      // Listen to orders changes (payment completions)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] orders change:', payload.eventType);
          invalidateAllAccessQueries(queryClient, user.id);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to access changes for user:', user.id);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error for access changes');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Unsubscribing from access changes');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient]);
};

/**
 * Invalidate all access-related queries
 */
export const invalidateAllAccessQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string
) => {
  console.log('[Cache] Invalidating all access queries for user:', userId);
  
  // Invalidate access snapshot (primary source)
  queryClient.invalidateQueries({ queryKey: ['access-snapshot'] });
  
  // Invalidate course state
  queryClient.invalidateQueries({ queryKey: ['course-state'] });
  
  // Invalidate granular hooks (for backward compatibility)
  if (userId) {
    queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
    queryClient.invalidateQueries({ queryKey: ['organization-access', userId] });
    queryClient.invalidateQueries({ queryKey: ['payment-status', userId] });
    queryClient.invalidateQueries({ queryKey: ['user-context', userId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    queryClient.invalidateQueries({ queryKey: ['organization-access'] });
    queryClient.invalidateQueries({ queryKey: ['payment-status'] });
    queryClient.invalidateQueries({ queryKey: ['user-context'] });
  }
};
