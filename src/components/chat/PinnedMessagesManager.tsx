import React, { useState, useEffect } from 'react';
import { DraggableMessage } from './DraggableMessage';

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
}

interface PinnedMessagesManagerProps {
  messages: Message[];
  currentPageContext?: {
    route: string;
    title: string;
    description: string;
  };
}

export const PinnedMessagesManager: React.FC<PinnedMessagesManagerProps> = ({
  messages,
  currentPageContext
}) => {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);

  // Load pinned messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pinnedMessages');
    if (saved) {
      try {
        setPinnedMessages(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading pinned messages:', error);
      }
    }
  }, []);

  // Save pinned messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pinnedMessages', JSON.stringify(pinnedMessages));
  }, [pinnedMessages]);

  const handlePin = (messageId: string, position: Position) => {
    setPinnedMessages(prev => {
      // Remove if already pinned
      const filtered = prev.filter(p => p.messageId !== messageId);
      return [...filtered, { messageId, position }];
    });
  };

  const handleUnpin = (messageId: string) => {
    setPinnedMessages(prev => prev.filter(p => p.messageId !== messageId));
  };

  const updatePinnedPosition = (messageId: string, position: Position) => {
    setPinnedMessages(prev => 
      prev.map(p => 
        p.messageId === messageId 
          ? { ...p, position }
          : p
      )
    );
  };

  // Get messages that are pinned
  const pinnedMessageData = pinnedMessages.map(pinned => {
    const message = messages.find(m => m.id === pinned.messageId);
    return message ? { message, position: pinned.position } : null;
  }).filter(Boolean);

  return (
    <>
      {pinnedMessageData.map(({ message, position }) => (
        <DraggableMessage
          key={`pinned-${message.id}`}
          message={message}
          currentPageContext={currentPageContext}
          onPin={handlePin}
          onUnpin={handleUnpin}
          isPinned={true}
          pinnedPosition={position}
        />
      ))}
    </>
  );
};

// Hook to manage pinned messages state
export const usePinnedMessages = () => {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('pinnedMessages');
    if (saved) {
      try {
        setPinnedMessages(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading pinned messages:', error);
      }
    }
  }, []);

  const isPinned = (messageId: string) => {
    return pinnedMessages.some(p => p.messageId === messageId);
  };

  const pinMessage = (messageId: string, position: Position) => {
    setPinnedMessages(prev => {
      const filtered = prev.filter(p => p.messageId !== messageId);
      const updated = [...filtered, { messageId, position }];
      localStorage.setItem('pinnedMessages', JSON.stringify(updated));
      return updated;
    });
  };

  const unpinMessage = (messageId: string) => {
    setPinnedMessages(prev => {
      const updated = prev.filter(p => p.messageId !== messageId);
      localStorage.setItem('pinnedMessages', JSON.stringify(updated));
      return updated;
    });
  };

  return {
    pinnedMessages,
    isPinned,
    pinMessage,
    unpinMessage
  };
};