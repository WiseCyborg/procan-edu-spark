import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Pin, X, Copy, Volume2, Square } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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

interface Position {
  x: number;
  y: number;
}

interface PinnedMessage {
  id: string;
  position: Position;
  isDragging: boolean;
}

interface DraggableMessageProps {
  message: Message;
  currentPageContext?: {
    route: string;
    title: string;
    description: string;
  };
  onPin?: (messageId: string, position: Position) => void;
  onUnpin?: (messageId: string) => void;
  isPinned?: boolean;
  pinnedPosition?: Position;
  className?: string;
  isPlaying?: boolean;
  onPlay?: (messageId: string, content: string) => void;
  onStop?: () => void;
}

export const DraggableMessage: React.FC<DraggableMessageProps> = ({
  message,
  currentPageContext,
  onPin,
  onUnpin,
  isPinned = false,
  pinnedPosition,
  className,
  isPlaying = false,
  onPlay,
  onStop,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [localPosition, setLocalPosition] = useState<Position>(
    pinnedPosition || { x: 0, y: 0 }
  );
  const messageRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!messageRef.current || !isPinned) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = messageRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, [isPinned]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isPinned) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within screen bounds
    const maxX = window.innerWidth - 320; // Message width
    const maxY = window.innerHeight - 200; // Approximate message height
    
    const newPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    };
    
    setLocalPosition(newPosition);
  }, [isDragging, dragOffset, isPinned]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handlePin = () => {
    if (onPin) {
      const rect = messageRef.current?.getBoundingClientRect();
      if (rect) {
        onPin(message.id, { x: rect.left, y: rect.top });
      }
    }
  };

  const handleUnpin = () => {
    if (onUnpin) {
      onUnpin(message.id);
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getTooltipContent = () => {
    const pageContext = message.pageContext || currentPageContext;
    return (
      <div className="max-w-xs space-y-2">
        <div>
          <p className="font-semibold text-sm">Message Context</p>
          <p className="text-xs text-muted-foreground">
            Sent at {formatTime(message.timestamp)}
          </p>
        </div>
        {pageContext && (
          <div>
            <p className="text-sm font-medium">Page: {pageContext.title}</p>
            <p className="text-xs text-muted-foreground">
              Route: {pageContext.route}
            </p>
            <p className="text-xs">{pageContext.description}</p>
          </div>
        )}
        <div className="pt-1 border-t">
          <p className="text-xs text-muted-foreground">
            Drag to pin this message anywhere on screen
          </p>
        </div>
      </div>
    );
  };

  const MessageCard = (
    <Card 
      ref={messageRef}
      className={`group relative transition-all duration-200 hover:shadow-md ${
        message.isUser 
          ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]' 
          : 'bg-muted max-w-[80%]'
      } ${isDragging ? 'shadow-lg scale-105' : ''} ${
        isPinned ? 'border-2 border-primary shadow-lg' : ''
      } ${className || ''}`}
      style={isPinned ? { 
        position: 'fixed', 
        left: localPosition.x, 
        top: localPosition.y,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab'
      } : {}}
    >
      <CardContent className="p-3">
        {/* Drag handle for pinned messages */}
        {isPinned && (
          <div 
            className="absolute -top-2 -left-2 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-md">
              <GripVertical className="w-4 h-4" />
            </div>
          </div>
        )}
        
        {/* Message controls */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={copyMessage}
          >
            <Copy className="w-3 h-3" />
          </Button>
          
          {!isPinned ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handlePin}
            >
              <Pin className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleUnpin}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="pr-12">
          <p className="text-sm leading-relaxed">{message.content}</p>
          
          {isPinned && (
            <div className="mt-2 pt-2 border-t border-border/20">
              <Badge variant="secondary" className="text-xs">
                Pinned Message
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isPinned) {
    return MessageCard;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {MessageCard}
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
