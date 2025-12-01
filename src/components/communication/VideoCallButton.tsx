import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoCallLobby } from '@/components/video/VideoCallLobby';
import { VideoCallRoom } from '@/components/video/VideoCallRoom';
import { useVideoCall } from '@/hooks/useVideoCall';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useActiveCall } from '@/hooks/useActiveCall';
import { JoinCallButton } from '@/components/video/JoinCallButton';
import { supabase } from '@/integrations/supabase/client';

interface VideoCallButtonProps {
  conversationId: string;
  conversationTitle: string;
  conversationType: string;
}

export const VideoCallButton = ({
  conversationId,
  conversationTitle,
  conversationType,
}: VideoCallButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inCall, setInCall] = useState(false);
  const { user } = useAuth();
  const { isTrainingCoordinator, isDispensaryManager, isAdmin } = useUserRole();
  const { createVideoCall, token, roomName, isCreating } = useVideoCall();
  const { activeCall } = useActiveCall(conversationId);

  const canStartCall = isTrainingCoordinator || isDispensaryManager || isAdmin;

  const handleJoinLobby = async (participantName: string) => {
    const callType = conversationType === 'announcement' ? 'training' : 
                     conversationType === 'group' ? 'study_session' : 
                     'one_on_one';

    const result = await createVideoCall({
      title: `${conversationTitle} Video Call`,
      callType,
      conversationId,
    });

    if (result) {
      // Update conversation with active call
      await supabase
        .from('conversations')
        .update({ active_call_id: result.callId })
        .eq('id', conversationId);
      
      setInCall(true);
    }
  };

  const handleJoinActiveCall = (token: string, roomName: string) => {
    // Handle joining an active call (called from JoinCallButton)
    setInCall(true);
    setIsOpen(true);
  };

  const handleDisconnect = async () => {
    // Clear active call from conversation
    if (activeCall) {
      await supabase
        .from('conversations')
        .update({ active_call_id: null })
        .eq('id', conversationId);
    }
    setInCall(false);
    setIsOpen(false);
  };

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://procannedu.livekit.cloud';

  if (!canStartCall) {
    return null;
  }

  return (
    <>
      {activeCall ? (
        <JoinCallButton
          callId={activeCall.id}
          conversationId={conversationId}
          participantName={user?.email || 'User'}
          onJoin={handleJoinActiveCall}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          disabled={isCreating}
        >
          <Video className="w-4 h-4 mr-2" />
          Start Video Call
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>
              {inCall ? 'Video Call' : 'Join Video Call'}
            </DialogTitle>
          </DialogHeader>
          
          {!inCall && (
            <VideoCallLobby
              onJoin={handleJoinLobby}
              defaultName={user?.email || 'User'}
            />
          )}

          {inCall && token && roomName && (
            <VideoCallRoom
              token={token}
              roomName={roomName}
              serverUrl={livekitUrl}
              onDisconnect={handleDisconnect}
              isHost={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};