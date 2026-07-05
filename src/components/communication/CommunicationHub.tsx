import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, PlayCircle, MessageSquarePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRealTimeMessaging } from '@/hooks/useRealTimeMessaging';
import { ConversationView } from './ConversationView';
import { CreateConversationDialog } from './CreateConversationDialog';
import { NewDirectMessageDialog } from './NewDirectMessageDialog';
import { ChannelSidebar } from './ChannelSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CommunicationHubOnboarding } from './CommunicationHubOnboarding';
import { InteractiveCommunicationTour } from './InteractiveCommunicationTour';

export const CommunicationHub = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const {
    conversations,
    loading,
    activeConversation,
    setActiveConversation,
    createConversation,
    createDirectConversation,
    refreshConversations,
    messages,
  } = useRealTimeMessaging();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDMDialog, setShowDMDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [creatingDefaultChannels, setCreatingDefaultChannels] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Auto-create default channels if none exist
  useEffect(() => {
    const autoCreateChannels = async () => {
      if (!user || !organizationId || loading || conversations.length > 0) return;
      
      // Check if we've already tried to create channels for this org
      const storageKey = `channels-created-${organizationId}`;
      if (localStorage.getItem(storageKey)) return;

      setCreatingDefaultChannels(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-org-channels', {
          body: {
            organizationId,
            createdBy: user.id,
          },
        });

        if (error) throw error;

        // Mark as created
        localStorage.setItem(storageKey, 'true');
        
        // Refresh conversations list
        await refreshConversations();
        
        toast.success(`Created ${data.channels?.length || 0} default channels`);
      } catch (error) {
        console.error('Error creating default channels:', error);
        // Don't show error toast - user can create channels manually
      } finally {
        setCreatingDefaultChannels(false);
      }
    };

    // Run after initial load
    if (!loading) {
      autoCreateChannels();
    }
  }, [user, organizationId, loading, conversations.length, refreshConversations]);

  const filteredConversations = conversations.filter(conv => {
    return !searchTerm || 
      conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.last_message?.content.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeConv = conversations.find(c => c.id === activeConversation);

  if (loading || creatingDefaultChannels) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">
          {creatingDefaultChannels ? 'Setting up your channels...' : 'Loading conversations...'}
        </div>
      </div>
    );
  }

  return (
    <>
      <CommunicationHubOnboarding onStartTour={() => setShowTour(true)} />
      {showTour && (
        <InteractiveCommunicationTour
          onComplete={() => {
            setShowTour(false);
            toast.success('Tour completed! You\'re ready to communicate with your team.');
          }}
          onSkip={() => setShowTour(false)}
          activeConversationId={activeConversation}
          hasMessages={Object.values(messages).some((m: any) => m.length > 0)}
        />
      )}
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
                data-tour="search-input"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowTour(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Take Tour
            </Button>
            <Button
              onClick={() => setShowDMDialog(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <MessageSquarePlus className="w-4 h-4" />
              New Message
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
              data-tour="new-channel-button"
            >
              <Plus className="w-4 h-4" />
              New Channel
            </Button>
          </div>
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
    </>
  );
};
