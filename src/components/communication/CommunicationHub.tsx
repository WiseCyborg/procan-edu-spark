import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRealTimeMessaging } from '@/hooks/useRealTimeMessaging';
import { ConversationView } from './ConversationView';
import { CreateConversationDialog } from './CreateConversationDialog';
import { ChannelSidebar } from './ChannelSidebar';
import { useAuth } from '@/hooks/useAuth';

export const CommunicationHub = () => {
  const { user } = useAuth();
  const {
    conversations,
    loading,
    activeConversation,
    setActiveConversation,
    createConversation
  } = useRealTimeMessaging();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(conv => {
    return !searchTerm || 
      conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.last_message?.content.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeConv = conversations.find(c => c.id === activeConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-background border rounded-lg overflow-hidden">
      {/* Channel Sidebar */}
      <ChannelSidebar
        conversations={filteredConversations}
        activeConversationId={activeConversation}
        onSelectConversation={setActiveConversation}
        userOrganizationId={user?.user_metadata?.organization_id}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between bg-card/50">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Channel
          </Button>
        </div>

        {/* Conversation View */}
        <div className="flex-1 overflow-hidden">
          {activeConversation && activeConv ? (
            <ConversationView 
              conversationId={activeConversation}
              conversationTitle={activeConv.title || 'Untitled'}
              conversationType={activeConv.conversation_type}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <h2 className="text-xl font-semibold mb-2">Select a channel to start messaging</h2>
                <p className="text-muted-foreground">
                  Choose a channel from the sidebar or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
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
