import React from 'react';
import { useAccessRealtimeInvalidation } from '@/hooks/useAccessRealtimeInvalidation';
import { useSessionHardening } from '@/hooks/useSessionHardening';
import { useAuth } from '@/hooks/useAuth';

/**
 * Access Provider - Initializes real-time invalidation and session hardening.
 * Should be placed inside AuthProvider and QueryClientProvider.
 */
export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Only initialize hooks when user is authenticated
  // These hooks set up subscriptions and listeners
  if (user) {
    return <AuthenticatedAccessProvider>{children}</AuthenticatedAccessProvider>;
  }

  return <>{children}</>;
};

/**
 * Inner provider that only runs when authenticated
 */
const AuthenticatedAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Set up real-time invalidation for access changes
  useAccessRealtimeInvalidation();
  
  // Set up session hardening (cross-tab sync, error handling)
  useSessionHardening();

  return <>{children}</>;
};

export default AccessProvider;
