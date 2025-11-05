import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useRegulatoryContent = (sectionNumber?: string) => {
  return useQuery({
    queryKey: ['regulatory-content', sectionNumber],
    queryFn: async () => {
      let query = supabase
        .from('regulatory_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (sectionNumber) {
        query = query.eq('section_number', sectionNumber);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useRegulatoryNotifications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['regulatory-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('regulatory_change_notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useAcknowledgeNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('regulatory_change_notifications')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulatory-notifications'] });
    },
  });
};

export const useStudentCertificationVersions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['certification-versions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('student_certification_versions')
        .select(`
          *,
          course_modules!inner(
            module_number,
            title,
            comar_reference
          )
        `)
        .eq('user_id', user.id)
        .eq('requires_update', true);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};
