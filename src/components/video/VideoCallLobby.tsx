import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Video, VideoOff, Mic, MicOff, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get media stream
  const getMedia = useCallback(async () => {
    setIsLoadingCamera(true);
    setCameraError(null);
    
    try {
      console.log('[VideoCallLobby] Requesting camera/microphone access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      console.log('[VideoCallLobby] Got media stream:', mediaStream.id);
      setStream(mediaStream);
      setCameraError(null);
    } catch (error: any) {
      console.error('[VideoCallLobby] Error accessing media devices:', error);
      
      let errorMessage = 'Could not access camera/microphone';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera or microphone found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
      }
      
      setCameraError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingCamera(false);
    }
  }, []);

  // Get media on mount
  useEffect(() => {
    getMedia();

    return () => {
      if (stream) {
        console.log('[VideoCallLobby] Cleaning up stream');
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Assign stream to video element when both are available
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log('[VideoCallLobby] Assigning stream to video element');
      videoRef.current.srcObject = stream;
      
      // Explicitly call play() after setting srcObject
      videoRef.current.play().catch((err) => {
        console.warn('[VideoCallLobby] Video play() failed:', err);
      });
    }
  }, [stream]);

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

  const retryCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    getMedia();
  };

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
            {/* Always render video element, control visibility with CSS */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${
                stream && videoEnabled ? 'block' : 'hidden'
              }`}
              style={{ transform: 'scaleX(-1)' }} // Mirror for selfie view
            />
            
            {/* Loading state */}
            {isLoadingCamera && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Initializing camera...</p>
              </div>
            )}
            
            {/* Error state */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive font-medium mb-2">{cameraError}</p>
                <Button variant="outline" size="sm" onClick={retryCamera}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
            
            {/* Camera off state */}
            {!isLoadingCamera && !cameraError && stream && !videoEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                <VideoOff className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Camera is off</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              variant={videoEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={() => setVideoEnabled(!videoEnabled)}
              disabled={!!cameraError}
            >
              {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button
              variant={audioEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={() => setAudioEnabled(!audioEnabled)}
              disabled={!!cameraError}
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