// Phase 4: Join Call Button Component
import { useState, useEffect } from 'react';
import { Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JoinCallButtonProps {
  callId: string;
  conversationId: string;
  participantName: string;
  onJoin: (token: string, roomName: string) => void;
}

export const JoinCallButton = ({
  callId,
  conversationId,
  participantName,
  onJoin,
}: JoinCallButtonProps) => {
  const [participantCount, setParticipantCount] = useState(0);
  const [callDuration, setCallDuration] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch call details and participant count
    const fetchCallDetails = async () => {
      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .select('started_at')
        .eq('id', callId)
        .single();

      if (callError) {
        console.error('Error fetching call details:', callError);
        return;
      }

      // Calculate duration
      if (callData?.started_at) {
        const startTime = new Date(callData.started_at);
        const now = new Date();
        const durationMs = now.getTime() - startTime.getTime();
        const minutes = Math.floor(durationMs / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
          setCallDuration(`${hours}h ${minutes % 60}m`);
        } else {
          setCallDuration(`${minutes}m`);
        }
      }

      // Fetch participant count
      const { data: participants, error: participantsError } = await supabase
        .from('video_call_participants')
        .select('id')
        .eq('call_id', callId);

      if (!participantsError && participants) {
        setParticipantCount(participants.length);
      }
    };

    fetchCallDetails();
    const interval = setInterval(fetchCallDetails, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [callId]);

  const handleJoinCall = async () => {
    setIsJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get call details
      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .select('room_name, host_id')
        .eq('id', callId)
        .single();

      if (callError) throw callError;

      // Get LiveKit token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        'generate-livekit-token',
        {
          body: {
            roomName: callData.room_name,
            participantName,
            isHost: callData.host_id === user.id,
          },
        }
      );

      if (tokenError) throw tokenError;

      // Add participant record
      await supabase
        .from('video_call_participants')
        .insert({
          call_id: callId,
          user_id: user.id,
          role: callData.host_id === user.id ? 'host' : 'participant',
        });

      toast({
        title: 'Joining call',
        description: 'Connecting to video room...',
      });

      onJoin(tokenData.token, callData.room_name);
    } catch (error) {
      console.error('Error joining call:', error);
      toast({
        title: 'Failed to join call',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Button
      onClick={handleJoinCall}
      disabled={isJoining}
      variant="default"
      className="gap-2"
    >
      <Video className="w-4 h-4" />
      <span>Join Active Call</span>
      <div className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-background/20 rounded text-xs">
        <Users className="w-3 h-3" />
        <span>{participantCount}</span>
      </div>
      {callDuration && (
        <span className="ml-1 text-xs opacity-70">({callDuration})</span>
      )}
    </Button>
  );
};
