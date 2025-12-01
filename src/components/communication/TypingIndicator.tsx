// Phase 5: Typing Indicator Component
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId: string;
}

export const TypingIndicator = ({ conversationId, currentUserId }: TypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    // Fetch initial typing users
    const fetchTypingUsers = async () => {
      const { data, error } = await supabase
        .from('typing_indicators')
        .select('user_id, profiles!inner(full_name)')
        .eq('conversation_id', conversationId)
        .neq('user_id', currentUserId)
        .gte('started_at', new Date(Date.now() - 5000).toISOString()); // Last 5 seconds

      if (!error && data) {
        const names = data.map((t: any) => t.profiles.full_name).filter(Boolean);
        setTypingUsers(names);
      }
    };

    fetchTypingUsers();

    // Subscribe to typing indicator changes
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchTypingUsers();
        }
      )
      .subscribe();

    // Refresh every 2 seconds to remove stale indicators
    const interval = setInterval(fetchTypingUsers, 2000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [conversationId, currentUserId]);

  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : typingUsers.length === 2
      ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
      : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;

  return (
    <div className="text-xs text-muted-foreground italic px-4 py-2 flex items-center gap-2">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
      {text}
    </div>
  );
};
