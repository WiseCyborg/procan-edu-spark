import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface VimeoPlayerProps {
  videoUrl: string;
  title: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onComplete?: () => void;
  requiredWatchPercentage?: number;
}

export const VimeoPlayer: React.FC<VimeoPlayerProps> = ({
  videoUrl,
  title,
  onTimeUpdate,
  onComplete,
  requiredWatchPercentage = 80
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [watchedPercentage, setWatchedPercentage] = useState(0);
  const [hasWatchedEnough, setHasWatchedEnough] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Extract Vimeo video ID from URL
  const getVimeoId = (url: string): string => {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : '';
  };

  useEffect(() => {
    if (!iframeRef.current) return;

    const vimeoId = getVimeoId(videoUrl);
    if (!vimeoId) {
      setError('Invalid video URL');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Initialize Vimeo player
    const player = new Player(iframeRef.current);
    playerRef.current = player;

    // Handle player ready
    player.ready().then(() => {
      setIsLoading(false);
    }).catch((err) => {
      console.error('Vimeo player error:', err);
      setError('Unable to load video. Please try again or continue with the reading material below.');
      setIsLoading(false);
    });

    // Get duration
    player.getDuration().then((d) => {
      setDuration(d);
    }).catch(() => {
      // Duration error is non-critical
    });

    // Error listener
    player.on('error', (data) => {
      console.error('Vimeo playback error:', data);
      setError('Video temporarily unavailable. You can continue with the reading material below.');
      setIsLoading(false);
    });

    // Time update listener
    player.on('timeupdate', (data) => {
      const current = data.seconds;
      const total = data.duration;
      setCurrentTime(current);

      if (total > 0) {
        const percentage = (current / total) * 100;
        setWatchedPercentage(percentage);

        if (percentage >= requiredWatchPercentage && !hasWatchedEnough) {
          setHasWatchedEnough(true);
          onComplete?.();
        }

        onTimeUpdate?.(current, total);
      }
    });

    return () => {
      player.destroy();
    };
  }, [videoUrl, onTimeUpdate, onComplete, requiredWatchPercentage, hasWatchedEnough, retryCount]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!playerRef.current) return;
    
    switch(e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        playerRef.current.getPaused().then(paused => {
          if (paused) {
            playerRef.current?.play();
          } else {
            playerRef.current?.pause();
          }
        });
        break;
      case 'f':
        e.preventDefault();
        playerRef.current.requestFullscreen();
        break;
      case 'm':
        e.preventDefault();
        playerRef.current.getVolume().then(vol => {
          playerRef.current?.setVolume(vol > 0 ? 0 : 1);
        });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        playerRef.current.getCurrentTime().then(t => {
          playerRef.current?.setCurrentTime(Math.max(0, t - 10));
        });
        break;
      case 'ArrowRight':
        e.preventDefault();
        playerRef.current.getCurrentTime().then(t => {
          playerRef.current?.setCurrentTime(t + 10);
        });
        break;
    }
  };

  useEffect(() => {
    const container = iframeRef.current?.parentElement;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const vimeoId = getVimeoId(videoUrl);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="relative group touch-none" 
        role="region" 
        aria-label={`Video player: ${title}`}
        tabIndex={0}
      >
        <div className="aspect-video bg-black relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner size="large" />
                <p className="text-sm text-muted-foreground">Loading video...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-destructive/10 to-background p-6 z-10">
              <div className="max-w-md text-center space-y-4">
                <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Video Unavailable</h3>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={handleRetry} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Video
                  </Button>
                  <Button variant="secondary" size="sm" asChild>
                    <a href="#transcript">Continue Reading</a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Need help? <a href="mailto:support@procannedu.com" className="underline hover:text-primary">Contact Support</a>
                </p>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            title={title}
            aria-describedby="video-controls-help"
            allowFullScreen
          />
        </div>

        {/* Keyboard shortcuts help */}
        <div id="video-controls-help" className="sr-only">
          Video controls: Space or K to play/pause, F for fullscreen, M to mute, 
          Left/Right arrows to skip 10 seconds. Double-tap left/right on mobile to skip.
        </div>

        {/* Progress indicator - Mobile optimized */}
        {!error && (
          <div 
            className="absolute top-2 md:top-4 right-2 md:right-4 bg-black/80 text-white px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {watchedPercentage.toFixed(0)}% watched
            {hasWatchedEnough && (
              <span className="ml-1 md:ml-2 text-green-400" aria-label="Video completed">✓</span>
            )}
          </div>
        )}
      </div>

      {/* Video info with transcript - Mobile optimized */}
      <div className="p-3 md:p-4">
        <h3 className="font-semibold text-base md:text-lg mb-2">{title}</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs md:text-sm text-muted-foreground">
          <span aria-label={`Video progress: ${formatTime(currentTime)} of ${formatTime(duration)}`}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {hasWatchedEnough ? (
            <span className="text-green-600 font-medium" role="status">✓ Completed</span>
          ) : (
            <span role="status">Watch {requiredWatchPercentage}% to complete</span>
          )}
        </div>
        
        {/* Transcript section - Mobile optimized */}
        <details className="mt-3 md:mt-4" id="transcript">
          <summary className="cursor-pointer font-medium text-sm md:text-base hover:underline touch-manipulation min-h-[44px] flex items-center">
            Video Transcript
          </summary>
          <div className="mt-2 text-xs md:text-sm text-muted-foreground p-3 md:p-4 bg-muted rounded-md">
            <p className="italic">
              Transcript will be available here. Contact support if you need this content in text format.
            </p>
          </div>
        </details>
      </div>
    </Card>
  );
};
