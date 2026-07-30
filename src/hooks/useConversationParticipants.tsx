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
        // Two-step fetch: the embedded profiles join is not a declared FK
        // relationship, which made PostgREST reject the request.
        const { data, error } = await supabase
          .from('conversation_participants')
          .select('id, user_id, role')
          .eq('conversation_id', conversationId);

        if (error) throw error;

        const userIds = [...new Set((data || []).map(p => p.user_id))];
        const profileMap = new Map<string, any>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, profile_photo_url')
            .in('user_id', userIds);
          (profiles || []).forEach(p => profileMap.set(p.user_id, p));
        }

        const formatted: Participant[] = (data || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          first_name: profileMap.get(p.user_id)?.first_name || '',
          last_name: profileMap.get(p.user_id)?.last_name || '',
          profile_photo_url: profileMap.get(p.user_id)?.profile_photo_url,
          role: p.role
        }));

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
