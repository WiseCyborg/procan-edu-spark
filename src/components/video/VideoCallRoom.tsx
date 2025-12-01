import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhoneOff } from 'lucide-react';
import { RecordingControls } from './RecordingControls';

interface VideoCallRoomProps {
  token: string;
  roomName: string;
  serverUrl: string;
  onDisconnect: () => void;
  isHost?: boolean;
  callId?: string;
  isRecording?: boolean;
}

export const VideoCallRoom = ({
  token,
  roomName,
  serverUrl,
  onDisconnect,
  isHost = false,
  callId,
  isRecording = false
}: VideoCallRoomProps) => {
  const [connected, setConnected] = useState(false);
  const [recordingState, setRecordingState] = useState(isRecording);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">Video Call</h2>
            <p className="text-sm text-muted-foreground">{roomName}</p>
          </div>
          {recordingState && (
            <Badge variant="destructive" className="animate-pulse gap-1">
              <span className="h-2 w-2 rounded-full bg-white" />
              Recording
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {callId && (
            <RecordingControls
              callId={callId}
              isHost={isHost}
              isRecording={recordingState}
              onRecordingChange={() => setRecordingState(!recordingState)}
            />
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={onDisconnect}
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            {isHost ? 'End Call' : 'Leave Call'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          connect={true}
          onConnected={() => setConnected(true)}
          onDisconnected={onDisconnect}
          className="h-full"
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
};