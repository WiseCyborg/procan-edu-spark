import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Access Snapshot - Single authoritative source for user access decisions.
 * This replaces disparate role/org/payment checks with one consistent read.
 */

export type DenyReason = 
  | 'none'
  | 'enrollment_required'
  | 'payment_required'
  | 'org_seat_required'
  | 'suspended'
  | 'expired';

export type EntitlementAccess = 'none' | 'trial' | 'paid' | 'org_seat' | 'admin_granted';

export interface AccessSnapshot {
  user_id: string | null;
  authenticated: boolean;
  roles: string[];
  enrollment_status: 'none' | 'active' | 'suspended';
  course_requires_payment: boolean;
  entitlement_access: EntitlementAccess;
  entitlement_valid_now: boolean;
  organization_id: string | null;
  org_name: string | null;
  org_has_seat: boolean;
  org_payment_status: string | null;
  org_admin_approved: boolean | null;
  can_access_course: boolean;
  deny_reason: DenyReason;
  deny_detail: Record<string, any>;
  error?: string;
}

const DEFAULT_SNAPSHOT: AccessSnapshot = {
  user_id: null,
  authenticated: false,
  roles: ['student'],
  enrollment_status: 'none',
  course_requires_payment: true,
  entitlement_access: 'none',
  entitlement_valid_now: false,
  organization_id: null,
  org_name: null,
  org_has_seat: false,
  org_payment_status: null,
  org_admin_approved: null,
  can_access_course: false,
  deny_reason: 'none',
  deny_detail: {},
};

// Shorter stale time - access can change quickly (seat assignment, payment)
const SNAPSHOT_STALE_TIME = 60 * 1000; // 1 minute
const SNAPSHOT_GC_TIME = 30 * 60 * 1000; // 30 minutes

export interface UseAccessSnapshotReturn {
  snapshot: AccessSnapshot;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useAccessSnapshot = (courseId?: string): UseAccessSnapshotReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['access-snapshot', user?.id, courseId],
    queryFn: async (): Promise<AccessSnapshot> => {
      if (!user?.id) {
        return DEFAULT_SNAPSHOT;
      }

      const { data, error } = await supabase.rpc('get_access_snapshot', {
        p_course_id: courseId || null,
      });

      if (error) {
        console.error('[AccessSnapshot] RPC error:', error);
        throw new Error(error.message);
      }

      // Parse the JSONB response - cast through unknown first for type safety
      const snapshot = data as unknown as AccessSnapshot;
      
      if (!snapshot || snapshot.error) {
        console.warn('[AccessSnapshot] Invalid response:', snapshot);
        return {
          ...DEFAULT_SNAPSHOT,
          error: snapshot?.error || 'Failed to fetch access snapshot',
        };
      }

      return snapshot;
    },
    enabled: !!user?.id,
    staleTime: SNAPSHOT_STALE_TIME,
    gcTime: SNAPSHOT_GC_TIME,
    retry: 2,
  });

  return {
    snapshot: data ?? DEFAULT_SNAPSHOT,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Hook to get the redirect path based on deny reason
 */
export const useAccessRedirect = (denyReason: DenyReason): string => {
  switch (denyReason) {
    case 'enrollment_required':
      return '/auth?tab=signup';
    case 'payment_required':
      return '/payment';
    case 'org_seat_required':
      return '/auth?tab=accesskey';
    case 'suspended':
      return '/auth?reason=suspended';
    case 'expired':
      return '/renew';
    default:
      return '/dashboard';
  }
};

/**
 * Helper to check if user has a specific role from snapshot
 */
export const hasRoleInSnapshot = (snapshot: AccessSnapshot, role: string): boolean => {
  return snapshot.roles?.includes(role) ?? false;
};

/**
 * Helper to check if user is admin from snapshot
 */
export const isAdminFromSnapshot = (snapshot: AccessSnapshot): boolean => {
  return hasRoleInSnapshot(snapshot, 'admin');
};

/**
 * Helper to check if user is manager from snapshot
 */
export const isManagerFromSnapshot = (snapshot: AccessSnapshot): boolean => {
  return hasRoleInSnapshot(snapshot, 'dispensary_manager');
};
