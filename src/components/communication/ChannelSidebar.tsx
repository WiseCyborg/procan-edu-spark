// Phase 3: Enhanced Channel Sidebar Component (Teams-style)
import { useState } from 'react';
import { ChevronDown, ChevronRight, Hash, Bell, Users, MessageSquare, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Conversation } from '@/hooks/useRealTimeMessaging';

interface ChannelSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  userOrganizationId?: string | null;
}

// Extend Conversation with additional optional properties
type ChannelConversation = Conversation & {
  channel_category?: string | null;
  is_pinned?: boolean | null;
  active_call_id?: string | null;
  metadata?: {
    icon?: string;
    description?: string;
  };
};

interface ChannelCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  conversations: ChannelConversation[];
}

export const ChannelSidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  userOrganizationId,
}: ChannelSidebarProps) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Organize conversations into categories
  const categories: ChannelCategory[] = [
    {
      id: 'announcements',
      title: 'Announcements',
      icon: <Bell className="w-4 h-4" />,
      conversations: conversations.filter(c => c.conversation_type === 'announcement') as ChannelConversation[],
    },
    {
      id: 'organization',
      title: 'Organization Channels',
      icon: <Hash className="w-4 h-4" />,
      conversations: conversations.filter(
        c => c.organization_id === userOrganizationId && 
        ['group', 'study_help', 'orientation', 'uat'].includes(c.conversation_type)
      ) as ChannelConversation[],
    },
    {
      id: 'training',
      title: 'Training & Study',
      icon: <Users className="w-4 h-4" />,
      conversations: conversations.filter(c => c.conversation_type === 'group') as ChannelConversation[],
    },
    {
      id: 'direct',
      title: 'Direct Messages',
      icon: <MessageSquare className="w-4 h-4" />,
      conversations: conversations.filter(c => c.conversation_type === 'direct') as ChannelConversation[],
    },
  ].filter(cat => cat.conversations.length > 0);

  const renderConversation = (conversation: ChannelConversation, isFirst: boolean = false) => {
    const isActive = conversation.id === activeConversationId;
    const hasActiveCall = !!conversation.active_call_id;
    const unreadCount = conversation.unread_count || 0;

    return (
      <Button
        key={conversation.id}
        variant="ghost"
        className={cn(
          'w-full justify-start gap-2 px-3 py-2 h-auto font-normal',
          isActive && 'bg-accent text-accent-foreground'
        )}
        onClick={() => onSelectConversation(conversation.id)}
        data-tour={isFirst ? "channel-item" : undefined}
        data-active-conversation={isActive ? conversation.id : undefined}
      >
        <span className="text-muted-foreground">
          {conversation.metadata?.icon || '#'}
        </span>
        <span className="flex-1 text-left truncate">
          {conversation.title || 'Unnamed Channel'}
        </span>
        {hasActiveCall && (
          <Video className="w-4 h-4 text-destructive animate-pulse" />
        )}
        {unreadCount > 0 && (
          <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <div className="w-64 border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col h-full" data-tour="channel-sidebar">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-lg">Communication Hub</h2>
          {(() => {
            const total = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
            return total > 0 ? (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                {total > 99 ? '99+' : total}
              </Badge>
            ) : null;
          })()}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {conversations.length} channel{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {categories.map((category) => {
          const isCollapsed = collapsedCategories.has(category.id);
          
          return (
            <div key={category.id} className="mb-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-3 py-2 h-auto font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                onClick={() => toggleCategory(category.id)}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {category.icon}
                <span className="flex-1 text-left">{category.title}</span>
                <span className="text-xs">{category.conversations.length}</span>
              </Button>

              {!isCollapsed && (
                <div className="space-y-0.5 px-2">
                  {category.conversations
                    .sort((a, b) => {
                      // Sort: pinned first, then by active call, then by title
                      if (a.is_pinned !== b.is_pinned) {
                        return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
                      }
                      if (!!a.active_call_id !== !!b.active_call_id) {
                        return (b.active_call_id ? 1 : 0) - (a.active_call_id ? 1 : 0);
                      }
                      return (a.title || '').localeCompare(b.title || '');
                    })
                    .map((conv, idx) => renderConversation(conv, idx === 0))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
