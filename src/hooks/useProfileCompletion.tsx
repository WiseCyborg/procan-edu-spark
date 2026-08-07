import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileCompletionData {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  organization: string;
  job_title: string;
}

const REQUIRED_FIELDS: (keyof ProfileCompletionData)[] = [
  'first_name',
  'last_name',
  'phone',
  'date_of_birth',
  'emergency_contact_name',
  'emergency_contact_phone'
];

const calculateCompletion = (profileData: Partial<ProfileCompletionData> | null): {
  completionPercentage: number;
  missingFields: string[];
} => {
  if (!profileData) {
    return {
      completionPercentage: 0,
      missingFields: REQUIRED_FIELDS.map(field =>
        field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      )
    };
  }

  const completedFields = REQUIRED_FIELDS.filter(field => {
    const value = profileData[field];
    return value !== null && value !== undefined && value.toString().trim().length > 0;
  });

  const missingFields = REQUIRED_FIELDS.filter(field => {
    const value = profileData[field];
    return value === null || value === undefined || value.toString().trim().length === 0;
  }).map(field =>
    field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );

  return {
    completionPercentage: Math.round((completedFields.length / REQUIRED_FIELDS.length) * 100),
    missingFields
  };
};

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['profile-completion', user?.id];

  const { data, isLoading: queryIsLoading } = useQuery({
    queryKey,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Partial<ProfileCompletionData> | null> => {
      if (!user) return null;

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          return null;
        }

        return profileData ?? null;
      } catch (error) {
        console.error('Error in fetchProfile:', error);
        return null;
      }
    }
  });

  const profile = data ?? null;
  const { completionPercentage, missingFields } = calculateCompletion(profile);
  const isLoading = !!user && queryIsLoading;

  const isProfileComplete = () => {
    return completionPercentage === 100;
  };

  const getRequiredFieldsCount = () => {
    return REQUIRED_FIELDS.length;
  };

  const getCompletedFieldsCount = () => {
    return Math.round((completionPercentage / 100) * REQUIRED_FIELDS.length);
  };

  const refreshProfile = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  return {
    profile,
    isLoading,
    completionPercentage,
    missingFields,
    isProfileComplete,
    getRequiredFieldsCount,
    getCompletedFieldsCount,
    refreshProfile
  };
};