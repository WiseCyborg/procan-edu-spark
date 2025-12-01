import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  role?: string;
}

export const useConversationParticipants = (conversationId: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from('conversation_participants')
          .select(`
            id,
            user_id,
            role,
            profiles:user_id (
              first_name,
              last_name,
              profile_photo_url
            )
          `)
          .eq('conversation_id', conversationId);

        if (error) throw error;

        const formatted: Participant[] = data?.map(p => ({
          id: p.id,
          user_id: p.user_id,
          first_name: (p.profiles as any)?.first_name || '',
          last_name: (p.profiles as any)?.last_name || '',
          profile_photo_url: (p.profiles as any)?.profile_photo_url,
          role: p.role
        })) || [];

        setParticipants(formatted);
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchParticipants();
    }
  }, [conversationId]);

  return { participants, loading };
};
