import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { MemberType } from './useOrganizationMembership';

export type RoleRequestStatus = 'pending' | 'approved' | 'denied';

export interface RoleRequest {
  id: string;
  user_id: string;
  organization_id: string | null;
  requested_member_type: MemberType;
  justification: string | null;
  status: RoleRequestStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  organization?: {
    name: string;
  };
}

// Cache configuration
const REQUESTS_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const REQUESTS_GC_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to get the current user's role requests
 */
export const useMyRoleRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-role-requests', user?.id],
    queryFn: async (): Promise<RoleRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('role_requests')
        .select(`
          *,
          organizations:organization_id (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching role requests:', error);
        throw error;
      }

      return (data || []).map((r: any) => ({
        ...r,
        organization: r.organizations
      }));
    },
    enabled: !!user?.id,
    staleTime: REQUESTS_STALE_TIME,
    gcTime: REQUESTS_GC_TIME,
  });
};

/**
 * Hook to get pending role requests for organizations the user manages
 */
export const useOrgRoleRequests = (organizationId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['org-role-requests', organizationId],
    queryFn: async (): Promise<RoleRequest[]> => {
      if (!user?.id || !organizationId) return [];

      const { data, error } = await supabase
        .from('role_requests')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching org role requests:', error);
        throw error;
      }

      // Get emails separately since profiles don't have email
      const userIds = (data || []).map(r => r.user_id);
      
      return (data || []).map((r: any) => ({
        ...r,
        user: {
          first_name: r.profiles?.first_name,
          last_name: r.profiles?.last_name,
        }
      }));
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: REQUESTS_STALE_TIME,
    gcTime: REQUESTS_GC_TIME,
  });
};

/**
 * Hook to get pending requests count for badge display
 */
export const usePendingRequestsCount = (organizationId: string | null) => {
  const { data: requests, isLoading } = useOrgRoleRequests(organizationId);
  
  const pendingCount = (requests || []).filter(r => r.status === 'pending').length;
  
  return { pendingCount, isLoading };
};

/**
 * Hook to create a role request
 */
export const useCreateRoleRequest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestedMemberType,
      organizationId,
      justification,
    }: {
      requestedMemberType: MemberType;
      organizationId?: string;
      justification?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('role_requests')
        .insert({
          user_id: user.id,
          organization_id: organizationId || null,
          requested_member_type: requestedMemberType,
          justification: justification || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-role-requests'] });
      toast({
        title: 'Request Submitted',
        description: 'Your role request has been submitted for review.',
      });
    },
    onError: (error: Error) => {
      console.error('Error creating role request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit role request.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook for managers/owners to approve or deny role requests
 */
export const useReviewRoleRequest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      reviewNotes,
    }: {
      requestId: string;
      status: 'approved' | 'denied';
      reviewNotes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('role_requests')
        .update({
          status,
          review_notes: reviewNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved, update organization_members
      if (status === 'approved' && data) {
        // First, check if they already have a membership
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', data.user_id)
          .eq('organization_id', data.organization_id)
          .maybeSingle();

        if (existingMember) {
          // Update existing membership
          const { error: updateError } = await supabase
            .from('organization_members')
            .update({
              member_type: data.requested_member_type,
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMember.id);

          if (updateError) throw updateError;
        } else if (data.organization_id) {
          // Get user email first
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', data.user_id)
            .single();

          // We need the email - get it from auth
          const { data: authData } = await supabase.auth.admin.getUserById(data.user_id);
          const email = authData?.user?.email;

          if (email) {
            // Create new membership
            const { error: insertError } = await supabase
              .from('organization_members')
              .insert({
                organization_id: data.organization_id,
                user_id: data.user_id,
                email: email,
                role: data.requested_member_type === 'coordinator' ? 'training_coordinator' : 'dispensary_admin',
                member_type: data.requested_member_type,
                status: 'active',
              });

            if (insertError) throw insertError;
          }
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org-role-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organization-memberships'] });
      toast({
        title: variables.status === 'approved' ? 'Request Approved' : 'Request Denied',
        description: variables.status === 'approved' 
          ? 'The user has been granted the requested role.'
          : 'The role request has been denied.',
      });
    },
    onError: (error: Error) => {
      console.error('Error reviewing role request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process the request.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Check if user has a pending request for a specific member type
 */
export const useHasPendingRequest = (memberType: MemberType) => {
  const { data: requests, isLoading } = useMyRoleRequests();
  
  const hasPending = (requests || []).some(
    r => r.requested_member_type === memberType && r.status === 'pending'
  );
  
  return { hasPending, isLoading };
};
