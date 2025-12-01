import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Plus, Users, Bell, Search, Hash } from 'lucide-react';
import { useRealTimeMessaging, type Conversation } from '@/hooks/useRealTimeMessaging';
import { ConversationView } from './ConversationView';
import { CreateConversationDialog } from './CreateConversationDialog';
import { formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';

export const CommunicationHub = () => {
  const {
    conversations,
    loading,
    activeConversation,
    setActiveConversation,
    createConversation
  } = useRealTimeMessaging();
  const { isAdmin, isDispensaryManager, isTrainingCoordinator } = useUserRole();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredConversations = conversations
    .filter(conv => {
      // Filter by search term
      const matchesSearch = !searchTerm || 
        conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.last_message?.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by conversation type
      const matchesType = filterType === 'all' || 
        (filterType === 'direct' && conv.conversation_type === 'direct') ||
        (filterType === 'group' && conv.conversation_type === 'group') ||
        (filterType === 'announcement' && conv.conversation_type === 'announcement');
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      // Sort by last message time, most recent first
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  const getConversationIcon = (type: Conversation['conversation_type']) => {
    switch (type) {
      case 'announcement':
        return <Bell className="h-4 w-4 text-amber-500" />;
      case 'group':
        return <Hash className="h-4 w-4 text-blue-500" />;
      case 'direct':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const canCreateAnnouncement = isAdmin || isDispensaryManager || isTrainingCoordinator;

  const getConversationTitle = (conv: Conversation) => {
    return conv.title || `${conv.conversation_type} conversation`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-background border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card">
        {/* Header */}
        <div className="p-4 border-b bg-card/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Messages</h2>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
          
          {/* Filter Tabs */}
          <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="direct" className="text-xs">Direct</TabsTrigger>
              <TabsTrigger value="group" className="text-xs">Groups</TabsTrigger>
              <TabsTrigger value="announcement" className="text-xs">
                {canCreateAnnouncement ? 'Announce' : 'News'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="overflow-y-auto h-full">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new conversation to get started</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                  activeConversation === conversation.id ? 'bg-accent' : ''
                }`}
                onClick={() => setActiveConversation(conversation.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getConversationIcon(conversation.conversation_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-foreground truncate">
                        {getConversationTitle(conversation)}
                      </h3>
                      {conversation.conversation_type === 'announcement' && (
                        <Badge variant="secondary" className="text-xs">
                          Announcement
                        </Badge>
                      )}
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs px-1 min-w-[1.25rem] h-5">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    
                    {conversation.last_message && (
                      <>
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.last_message.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(conversation.last_message.created_at), { 
                            addSuffix: true 
                          })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <ConversationView 
            conversationId={activeConversation}
            conversationTitle={getConversationTitle(
              conversations.find(c => c.id === activeConversation)!
            )}
            conversationType={
              conversations.find(c => c.id === activeConversation)?.conversation_type
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Welcome to Team Chat</h3>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Conversation Dialog */}
      <CreateConversationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateConversation={createConversation}
      />
    </div>
  );
};