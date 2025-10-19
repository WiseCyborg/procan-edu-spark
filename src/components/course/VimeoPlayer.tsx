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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const vimeoId = getVimeoId(videoUrl);

  return (
    <Card className="overflow-hidden">
      <div className="relative group">
        <div className="aspect-video bg-black">
          <iframe
            ref={iframeRef}
            src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            title={title}
          />
        </div>

        {/* Progress indicator */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-md text-sm font-medium">
          {watchedPercentage.toFixed(0)}% watched
          {hasWatchedEnough && (
            <span className="ml-2 text-green-400">✓</span>
          )}
        </div>
      </div>

      {/* Video info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {hasWatchedEnough ? (
            <span className="text-green-600 font-medium">✓ Completed</span>
          ) : (
            <span>Watch {requiredWatchPercentage}% to complete</span>
          )}
        </div>
      </div>
    </Card>
  );
};
