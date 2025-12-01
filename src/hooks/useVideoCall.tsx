import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface VideoCallParams {
  title: string;
  callType: 'training' | 'orientation' | 'uat' | 'one_on_one' | 'study_session';
  conversationId?: string;
  organizationId?: string;
  maxParticipants?: number;
}

export const useVideoCall = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const { toast } = useToast();

  const createVideoCall = useCallback(async (params: VideoCallParams) => {
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create unique room name
      const newRoomName = `room-${uuidv4()}`;

      // Create video call record
      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .insert({
          room_name: newRoomName,
          title: params.title,
          call_type: params.callType,
          host_id: user.id,
          conversation_id: params.conversationId,
          organization_id: params.organizationId,
          max_participants: params.maxParticipants || 50,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (callError) throw callError;

      // Get LiveKit token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        'generate-livekit-token',
        {
          body: {
            roomName: newRoomName,
            participantName: user.email || 'User',
            isHost: true,
          },
        }
      );

      if (tokenError) throw tokenError;

      setToken(tokenData.token);
      setRoomName(newRoomName);

      toast({
        title: 'Video call created',
        description: 'Connecting to video room...',
      });

      return { callId: callData.id, token: tokenData.token, roomName: newRoomName };
    } catch (error) {
      console.error('Error creating video call:', error);
      toast({
        title: 'Failed to create video call',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [toast]);

  const joinVideoCall = useCallback(async (callId: string, participantName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get call details
      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .select('*')
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

      setToken(tokenData.token);
      setRoomName(callData.room_name);

      return { token: tokenData.token, roomName: callData.room_name };
    } catch (error) {
      console.error('Error joining video call:', error);
      toast({
        title: 'Failed to join video call',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const endVideoCall = useCallback(async (callId: string) => {
    try {
      await supabase
        .from('video_calls')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', callId);

      setToken(null);
      setRoomName(null);

      toast({
        title: 'Video call ended',
      });
    } catch (error) {
      console.error('Error ending video call:', error);
      toast({
        title: 'Failed to end video call',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    createVideoCall,
    joinVideoCall,
    endVideoCall,
    isCreating,
    token,
    roomName,
  };
};