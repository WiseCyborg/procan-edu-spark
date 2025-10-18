import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentFreshness {
  isStale: boolean;
  lastReviewed: Date | null;
  relevantUpdates: number;
  status: 'fresh' | 'aging' | 'stale' | 'critical';
  daysOld: number;
}

export const useContentFreshness = (contentType: string, contentId: string) => {
  const [freshness, setFreshness] = useState<ContentFreshness | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkFreshness = async () => {
      if (!contentId) {
        setLoading(false);
        return;
      }

      try {
        // Get content review queue items for this content
        const { data, error } = await supabase
          .from('content_review_queue')
          .select('*, regulatory_update_id')
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error checking content freshness:', error);
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setFreshness({
            isStale: false,
            lastReviewed: null,
            relevantUpdates: 0,
            status: 'fresh',
            daysOld: 0
          });
          setLoading(false);
          return;
        }

        // Calculate freshness metrics
        const relevantUpdates = data.length;
        const oldestUpdate = data[data.length - 1];
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(oldestUpdate.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Determine status based on urgency and age
        let status: 'fresh' | 'aging' | 'stale' | 'critical' = 'fresh';
        const hasCritical = data.some(item => item.urgency === 'critical');
        const hasHigh = data.some(item => item.urgency === 'high');

        if (hasCritical || relevantUpdates > 3) {
          status = 'critical';
        } else if (hasHigh || relevantUpdates > 1 || daysSinceUpdate > 30) {
          status = 'stale';
        } else if (daysSinceUpdate > 14) {
          status = 'aging';
        }

        setFreshness({
          isStale: status === 'stale' || status === 'critical',
          lastReviewed: null,
          relevantUpdates,
          status,
          daysOld: daysSinceUpdate
        });
      } catch (err) {
        console.error('Error in useContentFreshness:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkFreshness();
  }, [contentType, contentId]);
  
  return { freshness, loading };
};
