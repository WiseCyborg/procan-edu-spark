import { useState, useEffect, useRef } from 'react';
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
import { toast } from 'sonner';

interface VideoCallLobbyProps {
  onJoin: (name: string) => void;
  defaultName?: string;
}

export const VideoCallLobby = ({ onJoin, defaultName = '' }: VideoCallLobbyProps) => {
  const [name, setName] = useState(defaultName);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get media stream on mount
  useEffect(() => {
    let mounted = true;

    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast.error('Could not access camera/microphone');
      }
    };

    getMedia();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Toggle video track
  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = videoEnabled;
      });
    }
  }, [videoEnabled, stream]);

  // Toggle audio track
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled;
      });
    }
  }, [audioEnabled, stream]);

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

          <div className="bg-muted rounded-lg aspect-video flex items-center justify-center overflow-hidden relative">
            {stream && videoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center space-y-2">
                <div className="text-4xl">
                  {videoEnabled ? '📹' : '🚫'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {videoEnabled ? 'Loading camera...' : 'Camera is off'}
                </p>
              </div>
            )}
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