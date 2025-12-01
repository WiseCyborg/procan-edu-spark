// Phase 5: Message Reactions Component
import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onReactionChange: () => void;
}

const AVAILABLE_EMOJIS = ['👍', '❤️', '🎉', '😂', '😮', '😢', '🙏', '🔥'];

export const MessageReactions = ({
  messageId,
  reactions,
  onReactionChange,
}: MessageReactionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleReaction = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const existingReaction = reactions.find(r => r.emoji === emoji);

      if (existingReaction?.userReacted) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          });

        if (error) throw error;
      }

      onReactionChange();
      setIsOpen(false);
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast({
        title: 'Failed to react',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 px-2 text-xs gap-1',
            reaction.userReacted && 'bg-primary/10 border border-primary/20'
          )}
          onClick={() => handleReaction(reaction.emoji)}
        >
          <span>{reaction.emoji}</span>
          <span className="text-muted-foreground">{reaction.count}</span>
        </Button>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Smile className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {AVAILABLE_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:scale-125 transition-transform"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
