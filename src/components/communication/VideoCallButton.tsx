import { forwardRef, useImperativeHandle, useState } from 'react';
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
import { pushNotificationService } from '@/services/pushNotificationService';

interface VideoCallButtonProps {
  conversationId: string;
  conversationTitle: string;
  conversationType: string;
}

export interface VideoCallButtonHandle {
  joinActiveCall: () => Promise<void>;
}

export const VideoCallButton = forwardRef<VideoCallButtonHandle, VideoCallButtonProps>(({
  conversationId,
  conversationTitle,
  conversationType,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inCall, setInCall] = useState(false);
  // Token/room for a JOINED call (as opposed to a newly created one)
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [joinRoomName, setJoinRoomName] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(true);
  const { user } = useAuth();
  const { isTrainingCoordinator, isDispensaryManager, isAdmin } = useUserRole();
  const { createVideoCall, joinVideoCall, token, roomName, isCreating } = useVideoCall();
  const { activeCall } = useActiveCall(conversationId);

  // All users can start/join calls now
  const canStartCall = true;

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
      
      // Get conversation participants to notify them
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId);

      if (participants && participants.length > 0) {
        // Send push notifications to all participants
        await pushNotificationService.notifyVideoCallStart({
          conversationId,
          conversationTitle,
          startedBy: user?.id || '',
          participantIds: participants.map(p => p.user_id),
        });
      }

      setActiveCallId(result.callId);
      setIsHost(true);
      setJoinToken(null);
      setJoinRoomName(null);
      setInCall(true);
    }
  };

  // Called by JoinCallButton once it has minted a token + added the participant
  const handleJoinActiveCall = (joinedToken: string, joinedRoomName: string) => {
    setJoinToken(joinedToken);
    setJoinRoomName(joinedRoomName);
    setActiveCallId(activeCall?.id ?? null);
    setIsHost(false);
    setInCall(true);
    setIsOpen(true);
  };

  // Imperative join used by the ActiveCallBanner "Join Call" button
  const joinActiveCall = async () => {
    if (!activeCall) return;
    const result = await joinVideoCall(activeCall.id, user?.email || 'User');
    if (result) {
      setJoinToken(result.token);
      setJoinRoomName(result.roomName);
      setActiveCallId(activeCall.id);
      setIsHost(false);
      setInCall(true);
      setIsOpen(true);
    }
  };

  useImperativeHandle(ref, () => ({ joinActiveCall }), [activeCall, user?.email]);

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
    setJoinToken(null);
    setJoinRoomName(null);
    setActiveCallId(null);
  };

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://procannedu.livekit.cloud';

  const activeToken = joinToken ?? token;
  const activeRoomName = joinRoomName ?? roomName;

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
          <Video className="w-4 h-4 me-2" />
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

          {inCall && activeToken && activeRoomName && (
            <VideoCallRoom
              token={activeToken}
              roomName={activeRoomName}
              serverUrl={livekitUrl}
              onDisconnect={handleDisconnect}
              isHost={isHost}
              callId={activeCallId ?? undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

VideoCallButton.displayName = 'VideoCallButton';
