import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useRegulatoryContent = (sectionNumber?: string) => {
  return useQuery({
    queryKey: ['comar-citation', sectionNumber],
    enabled: !!sectionNumber,
    queryFn: async () => {
      if (!sectionNumber) return [];

      // Canonical single source of truth: comar_citations (scraped official text),
      // with the editorial paraphrase joined from comar_editorial_summaries.
      const { data: citation, error } = await supabase
        .from('comar_citations')
        .select('section_number, chapter, section_title, official_text, source_url, last_scraped_at')
        .eq('section_number', sectionNumber)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!citation) return [];

      const { data: summary } = await supabase
        .from('comar_editorial_summaries')
        .select('plain_summary')
        .eq('section_number', sectionNumber)
        .eq('is_active', true)
        .maybeSingle();

      // Shape the row to match what RegulatorySidebar consumes.
      return [{
        section_number: citation.section_number,
        section_title: citation.section_title,
        content_text: citation.official_text,
        plain_language_summary: summary?.plain_summary ?? null,
        source_url: citation.source_url,
        last_modified_at: citation.last_scraped_at,
        compliance_tips: null,
      }];
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
