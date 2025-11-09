import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { VimeoPlayer } from './VimeoPlayer';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onComplete?: () => void;
  requiredWatchPercentage?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  title,
  onTimeUpdate,
  onComplete,
  requiredWatchPercentage = 80
}) => {
  // Check if it's a Vimeo URL
  const isVimeo = videoUrl.includes('vimeo.com');

  if (isVimeo) {
    return (
      <VimeoPlayer
        videoUrl={videoUrl}
        title={title}
        onTimeUpdate={onTimeUpdate}
        onComplete={onComplete}
        requiredWatchPercentage={requiredWatchPercentage}
      />
    );
  }

  // Original HTML5 video player for non-Vimeo videos
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [watchedPercentage, setWatchedPercentage] = useState(0);
  const [hasWatchedEnough, setHasWatchedEnough] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const total = video.duration;
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
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [onTimeUpdate, onComplete, requiredWatchPercentage, hasWatchedEnough]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (values: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = (values[0] / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (values: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = values[0] / 100;
    video.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const changePlaybackRate = () => {
    const video = videoRef.current;
    if (!video) return;

    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative group touch-none">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video bg-black"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
          controlsList="nodownload"
        />
        
        {/* Progress indicator - Mobile optimized */}
        <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-black/80 text-white px-2 md:px-3 py-1 md:py-1.5 rounded text-xs md:text-sm font-medium">
          {watchedPercentage.toFixed(0)}% watched
          {hasWatchedEnough && (
            <span className="ml-1 md:ml-2 text-green-400">✓</span>
          )}
        </div>

        {/* Video controls overlay - Touch optimized */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 md:p-4 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
          {/* Progress bar - Larger touch target */}
          <div className="mb-3 md:mb-4">
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full h-8 md:h-auto"
            />
          </div>

          {/* Control buttons - Mobile optimized */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 md:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 h-10 w-10 md:h-9 md:w-9"
              >
                {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6" />}
              </Button>

              <div className="hidden md:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    onValueChange={handleVolumeChange}
                    max={100}
                  />
                </div>
              </div>

              <span className="text-white text-xs md:text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-1 md:space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={changePlaybackRate}
                className="text-white hover:bg-white/20 h-10 w-10 md:h-9 md:w-9 text-xs md:text-sm"
              >
                {playbackRate}x
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 h-10 w-10 md:h-9 md:w-9"
              >
                <Maximize className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile volume control (tap to toggle mute) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="md:hidden absolute bottom-20 left-3 text-white bg-black/50 hover:bg-black/70 h-10 w-10"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
      </div>

      {/* Video title and progress - Mobile optimized */}
      <div className="p-3 md:p-4">
        <h3 className="font-semibold text-base md:text-lg mb-2">{title}</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs md:text-sm text-muted-foreground">
          <span>Watch progress: {watchedPercentage.toFixed(0)}%</span>
          {hasWatchedEnough ? (
            <span className="text-green-600 font-medium">✓ Completed</span>
          ) : (
            <span>Need {requiredWatchPercentage}% to complete</span>
          )}
        </div>
      </div>
    </Card>
  );
};