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
import { PhoneOff } from 'lucide-react';

interface VideoCallRoomProps {
  token: string;
  roomName: string;
  serverUrl: string;
  onDisconnect: () => void;
  isHost?: boolean;
}

export const VideoCallRoom = ({
  token,
  roomName,
  serverUrl,
  onDisconnect,
  isHost = false,
}: VideoCallRoomProps) => {
  const [connected, setConnected] = useState(false);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Video Call</h2>
          <p className="text-sm text-muted-foreground">{roomName}</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDisconnect}
        >
          <PhoneOff className="w-4 h-4 mr-2" />
          {isHost ? 'End Call' : 'Leave Call'}
        </Button>
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