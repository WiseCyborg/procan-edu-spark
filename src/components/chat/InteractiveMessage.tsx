import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Pin, 
  PinOff, 
  Volume2, 
  VolumeX, 
  MoreHorizontal, 
  Share, 
  Clock,
  MapPin
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { useUnifiedVoice } from '@/providers/UnifiedVoiceProvider';
import { usePinnedMessages } from './PinnedMessagesManager';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  pageContext?: {
    route: string;
    title: string;
    description: string;
  };
}

interface InteractiveMessageProps {
  message: Message;
  isHovered: boolean;
  onCopy?: (content: string) => void;
  onShare?: (message: Message) => void;
}

export const InteractiveMessage: React.FC<InteractiveMessageProps> = ({
  message,
  isHovered,
  onCopy,
  onShare
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { speak, stop, isSpeaking, settings } = useUnifiedVoice();
  const { isPinned, pinMessage, unpinMessage } = usePinnedMessages();
  
  const isPinnedMessage = isPinned(message.id);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy?.(message.content);
    toast({
      title: "Copied to clipboard",
      description: "Message content copied successfully.",
    });
  };

  const handleSpeak = () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
    } else {
      speak(message.content, { priority: 'high' });
      setIsPlaying(true);
      // Stop playing indicator after a reasonable time
      setTimeout(() => setIsPlaying(false), message.content.length * 100);
    }
  };

  const handlePin = () => {
    if (isPinnedMessage) {
      unpinMessage(message.id);
      toast({
        title: "Message unpinned",
        description: "Message removed from pinned list.",
      });
    } else {
      const position = { x: window.innerWidth - 350, y: 100 };
      pinMessage(message.id, position);
      toast({
        title: "Message pinned",
        description: "Message added to pinned list.",
      });
    }
  };

  const handleShare = () => {
    onShare?.(message);
    toast({
      title: "Share options",
      description: "Message prepared for sharing.",
    });
  };

  return (
    <div className={`group relative ${message.isUser ? 'justify-end' : 'justify-start'} flex`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
          message.isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        } ${isHovered ? 'shadow-md scale-[1.02]' : ''}`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        
        {/* Hover Actions */}
        <div className={`
          flex items-center gap-1 mt-2 transition-all duration-200 
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}
        `}>
          <Badge variant="outline" className="text-xs mr-auto">
            <Clock className="h-3 w-3 mr-1" />
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Badge>
          
          {/* Quick Actions */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {settings.enabled && !message.isUser && (
            <Button
              size="sm"
              variant="ghost"
              className={`h-6 w-6 p-0 ${
                isPlaying 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={handleSpeak}
            >
              {isPlaying ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 w-6 p-0 ${
              isPinnedMessage 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={handlePin}
          >
            {isPinnedMessage ? (
              <PinOff className="h-3 w-3" />
            ) : (
              <Pin className="h-3 w-3" />
            )}
          </Button>
          
          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Message
              </DropdownMenuItem>
              
              {!message.isUser && (
                <DropdownMenuItem onClick={handleSpeak}>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Read Aloud
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={handlePin}>
                {isPinnedMessage ? (
                  <>
                    <PinOff className="h-4 w-4 mr-2" />
                    Unpin Message
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin Message
                  </>
                )}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share Message
              </DropdownMenuItem>
              
              {message.pageContext && (
                <DropdownMenuItem>
                  <MapPin className="h-4 w-4 mr-2" />
                  Context: {message.pageContext.title}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};