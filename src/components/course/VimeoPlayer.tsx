import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { Card } from '@/components/ui/card';

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

  // Extract Vimeo video ID from URL
  const getVimeoId = (url: string): string => {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : '';
  };

  useEffect(() => {
    if (!iframeRef.current) return;

    const vimeoId = getVimeoId(videoUrl);
    if (!vimeoId) return;

    // Initialize Vimeo player
    const player = new Player(iframeRef.current);
    playerRef.current = player;

    // Get duration
    player.getDuration().then((d) => {
      setDuration(d);
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
  }, [videoUrl, onTimeUpdate, onComplete, requiredWatchPercentage, hasWatchedEnough]);

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

  return (
    <Card className="overflow-hidden">
      <div 
        className="relative group touch-none" 
        role="region" 
        aria-label={`Video player: ${title}`}
        tabIndex={0}
      >
        <div className="aspect-video bg-black">
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
        <details className="mt-3 md:mt-4">
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
