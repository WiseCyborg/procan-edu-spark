// Phase 8: Typing Indicator Hook
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTypingIndicator = (conversationId: string, isTyping: boolean) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const updateTypingStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isTyping) {
        // Insert or update typing indicator
        await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            started_at: new Date().toISOString(),
          });

        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Auto-remove after 3 seconds of inactivity
        timeoutRef.current = setTimeout(async () => {
          await supabase
            .from('typing_indicators')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id);
        }, 3000);
      } else {
        // Remove typing indicator immediately
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    };

    updateTypingStatus();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [conversationId, isTyping]);
};
