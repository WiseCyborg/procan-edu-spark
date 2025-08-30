import React, { useState, useEffect } from 'react';
import { DraggableMessage } from './DraggableMessage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  messageId: string;
  position: Position;
  isMinimized?: boolean;
  zIndex?: number;
}

interface EnhancedDraggableChatProps {
  messages: Message[];
  currentPageContext?: {
    route: string;
    title: string;
    description: string;
  };
}

export const EnhancedDraggableChat: React.FC<EnhancedDraggableChatProps> = ({
  messages,
  currentPageContext
}) => {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  // Load pinned messages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('enhancedPinnedMessages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPinnedMessages(parsed);
        // Set next z-index based on existing messages
        const maxZ = Math.max(...parsed.map((p: PinnedMessage) => p.zIndex || 1000));
        setNextZIndex(maxZ + 1);
      } catch (error) {
        console.error('Error loading pinned messages:', error);
      }
    }
  }, []);

  // Save pinned messages to localStorage
  useEffect(() => {
    localStorage.setItem('enhancedPinnedMessages', JSON.stringify(pinnedMessages));
  }, [pinnedMessages]);

  const handlePin = (messageId: string, position: Position) => {
    setPinnedMessages(prev => {
      const filtered = prev.filter(p => p.messageId !== messageId);
      const newMessage = { 
        messageId, 
        position,
        isMinimized: false,
        zIndex: nextZIndex
      };
      setNextZIndex(nextZIndex + 1);
      return [...filtered, newMessage];
    });
  };

  const handleUnpin = (messageId: string) => {
    setPinnedMessages(prev => prev.filter(p => p.messageId !== messageId));
  };

  const updatePinnedPosition = (messageId: string, position: Position) => {
    setPinnedMessages(prev => 
      prev.map(p => 
        p.messageId === messageId 
          ? { ...p, position, zIndex: nextZIndex }
          : p
      )
    );
    setNextZIndex(nextZIndex + 1);
  };

  const toggleMinimize = (messageId: string) => {
    setPinnedMessages(prev =>
      prev.map(p =>
        p.messageId === messageId
          ? { ...p, isMinimized: !p.isMinimized, zIndex: nextZIndex }
          : p
      )
    );
    setNextZIndex(nextZIndex + 1);
  };

  const resetPosition = (messageId: string) => {
    const defaultPosition = { x: 20, y: 20 };
    updatePinnedPosition(messageId, defaultPosition);
  };

  const clearAllPinned = () => {
    setPinnedMessages([]);
  };

  // Get messages that are pinned
  const pinnedMessageData = pinnedMessages.map(pinned => {
    const message = messages.find(m => m.id === pinned.messageId);
    return message ? { message, pinned } : null;
  }).filter(Boolean);

  return (
    <>
      {/* Pinned Messages Manager */}
      {pinnedMessages.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="p-2 bg-background/95 backdrop-blur-sm shadow-lg">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">
                {pinnedMessages.length} pinned
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllPinned}
                className="h-6 px-2 text-xs"
              >
                Clear All
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Render Pinned Messages */}
      {pinnedMessageData.map(({ message, pinned }) => (
        <div
          key={`enhanced-pinned-${message.id}`}
          className="fixed"
          style={{
            left: pinned.position.x,
            top: pinned.position.y,
            zIndex: pinned.zIndex || 1000,
          }}
        >
          {pinned.isMinimized ? (
            <Card className="p-2 bg-background/95 backdrop-blur-sm shadow-lg cursor-pointer max-w-xs">
              <div className="flex items-center justify-between space-x-2">
                <span className="text-sm font-medium truncate">
                  {message.content.substring(0, 30)}...
                </span>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMinimize(message.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnpin(message.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="relative group">
              {/* Enhanced Controls */}
              <div className="absolute -top-8 right-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMinimize(message.id)}
                  className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetPosition(message.id)}
                  className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnpin(message.id)}
                  className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <DraggableMessage
                message={message}
                currentPageContext={currentPageContext}
                onPin={handlePin}
                onUnpin={handleUnpin}
                isPinned={true}
                pinnedPosition={pinned.position}
                className={cn(
                  "max-w-sm shadow-xl border-2 border-primary/20",
                  "bg-background/95 backdrop-blur-sm"
                )}
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
};