import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentMetadata {
  lastUpdated: Date | null;
  isLoading: boolean;
  notes?: string;
}

export const useContentLastUpdated = (contentKey: string): ContentMetadata => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [notes, setNotes] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial data
    const fetchLastUpdated = async () => {
      try {
        const { data, error } = await supabase
          .from('site_content_metadata')
          .select('last_updated_at, notes')
          .eq('content_key', contentKey)
          .single();

        if (error) {
          console.error('Error fetching content metadata:', error);
          return;
        }

        if (data) {
          setLastUpdated(new Date(data.last_updated_at));
          setNotes(data.notes || undefined);
        }
      } catch (error) {
        console.error('Error fetching content metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLastUpdated();

    // Set up real-time subscription
    const channel = supabase
      .channel('site-content-metadata-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'site_content_metadata',
          filter: `content_key=eq.${contentKey}`
        },
        (payload) => {
          console.log('Content metadata updated:', payload);
          if (payload.new && 'last_updated_at' in payload.new) {
            setLastUpdated(new Date(payload.new.last_updated_at));
            setNotes(payload.new.notes || undefined);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentKey]);

  return { lastUpdated, isLoading, notes };
};
