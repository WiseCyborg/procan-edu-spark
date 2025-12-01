import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

interface VideoCallLobbyProps {
  onJoin: (name: string) => void;
  defaultName?: string;
}

export const VideoCallLobby = ({ onJoin, defaultName = '' }: VideoCallLobbyProps) => {
  const [name, setName] = useState(defaultName);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  return (
    <div className="flex items-center justify-center min-h-[600px] bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Video Call</CardTitle>
          <CardDescription>
            Set up your audio and video before joining
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl">
                {videoEnabled ? '📹' : '🚫'}
              </div>
              <p className="text-sm text-muted-foreground">
                {videoEnabled ? 'Camera preview' : 'Camera is off'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              variant={videoEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={() => setVideoEnabled(!videoEnabled)}
            >
              {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button
              variant={audioEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => onJoin(name)}
            disabled={!name.trim()}
          >
            Join Call
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};