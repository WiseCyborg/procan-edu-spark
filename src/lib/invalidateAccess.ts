import { QueryClient } from '@tanstack/react-query';

/**
 * Cache invalidation helpers for user access data.
 * Use these when server-side changes occur that should refresh cached data.
 */

/**
 * Invalidate all user access caches for a specific user.
 * Use when: role changes, seat assignment changes, profile updates.
 */
export const invalidateUserAccess = (queryClient: QueryClient, userId: string) => {
  queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
  queryClient.invalidateQueries({ queryKey: ['organization-access', userId] });
  queryClient.invalidateQueries({ queryKey: ['payment-status', userId] });
  queryClient.invalidateQueries({ queryKey: ['user-context', userId] });
};

/**
 * Invalidate payment-related caches after a purchase.
 * Use when: order completed, payment confirmed.
 */
export const invalidateOnPayment = (queryClient: QueryClient, userId: string, courseId?: string) => {
  if (courseId) {
    queryClient.invalidateQueries({ queryKey: ['payment-status', userId, courseId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ['payment-status', userId] });
  }
  queryClient.invalidateQueries({ queryKey: ['user-context', userId] });
};

/**
 * Invalidate organization-related caches.
 * Use when: seat allocated/removed, org status changes.
 */
export const invalidateOrganizationAccess = (queryClient: QueryClient, userId: string) => {
  queryClient.invalidateQueries({ queryKey: ['organization-access', userId] });
  queryClient.invalidateQueries({ queryKey: ['user-context', userId] });
};

/**
 * Clear all cached data on logout.
 * This ensures no stale access data persists between sessions.
 */
export const invalidateOnLogout = (queryClient: QueryClient) => {
  queryClient.clear();
};
