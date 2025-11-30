import { useQuery } from '@tanstack/react-query';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';

interface TokenValidation {
  is_valid: boolean;
  application_id?: string;
  organization_id?: string;
  organization_name?: string;
  expires_at?: string;
  error_message?: string;
}

export const useValidateRegistrationToken = (token: string | null) => {
  return useQuery({
    queryKey: ['validate-token', token],
    queryFn: async () => {
      if (!token) {
        return {
          is_valid: false,
          error_message: 'No token provided'
        } as TokenValidation;
      }

      const { data, error } = await invokePublicFunction('validate-manager-registration', {
        token
      });

      if (error) throw error;
      return data as TokenValidation;
    },
    enabled: !!token,
    retry: false,
    staleTime: 0, // Always revalidate
  });
};
