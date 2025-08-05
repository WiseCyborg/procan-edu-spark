import { useState, useEffect } from 'react';
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
  'address',
  'city',
  'zip_code',
  'emergency_contact_name',
  'emergency_contact_phone',
  'organization',
  'job_title'
];

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<ProfileCompletionData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
      calculateCompletion(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCompletion = (profileData: Partial<ProfileCompletionData> | null) => {
    if (!profileData) {
      setCompletionPercentage(0);
      setMissingFields(REQUIRED_FIELDS.map(field => 
        field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      ));
      return;
    }

    const completedFields = REQUIRED_FIELDS.filter(field => {
      const value = profileData[field];
      return value !== null && value !== undefined && value.toString().trim().length > 0;
    });

    const missing = REQUIRED_FIELDS.filter(field => {
      const value = profileData[field];
      return value === null || value === undefined || value.toString().trim().length === 0;
    }).map(field => 
      field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    );

    const percentage = Math.round((completedFields.length / REQUIRED_FIELDS.length) * 100);
    
    setCompletionPercentage(percentage);
    setMissingFields(missing);
  };

  const isProfileComplete = () => {
    return completionPercentage === 100;
  };

  const getRequiredFieldsCount = () => {
    return REQUIRED_FIELDS.length;
  };

  const getCompletedFieldsCount = () => {
    return Math.round((completionPercentage / 100) * REQUIRED_FIELDS.length);
  };

  return {
    profile,
    isLoading,
    completionPercentage,
    missingFields,
    isProfileComplete,
    getRequiredFieldsCount,
    getCompletedFieldsCount,
    refreshProfile: fetchProfile
  };
};