import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Settings } from 'lucide-react';
import { HoverCallout } from '@/components/ui/hover-callout';
import { cn } from '@/lib/utils';

interface EnhancedPlayControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  showSettings?: boolean;
  onSettings?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EnhancedPlayControls: React.FC<EnhancedPlayControlsProps> = ({
  isPlaying,
  onTogglePlay,
  isMuted = false,
  onToggleMute,
  volume = 100,
  onVolumeChange,
  showSettings = false,
  onSettings,
  className,
  size = 'md'
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Play/Pause Button */}
      <HoverCallout
        content={isPlaying ? "Pause video (Spacebar)" : "Play video (Spacebar)"}
      >
        <Button
          onClick={onTogglePlay}
          variant="outline"
          size="sm"
          className={cn(
            sizeClasses[size],
            "bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90",
            "transition-all duration-200"
          )}
        >
          {isPlaying ? (
            <Pause className={iconSizes[size]} />
          ) : (
            <Play className={iconSizes[size]} />
          )}
        </Button>
      </HoverCallout>

      {/* Volume Controls */}
      {onToggleMute && (
        <div className="flex items-center space-x-1">
          <HoverCallout
            content={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            <Button
              onClick={onToggleMute}
              variant="outline"
              size="sm"
              className={cn(
                sizeClasses[size],
                "bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90"
              )}
            >
              {isMuted ? (
                <VolumeX className={iconSizes[size]} />
              ) : (
                <Volume2 className={iconSizes[size]} />
              )}
            </Button>
          </HoverCallout>

          {/* Volume Slider */}
          {onVolumeChange && (
            <div 
              className="relative"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              {showVolumeSlider && (
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                    className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings Button */}
      {showSettings && onSettings && (
        <HoverCallout
          content="Video settings and quality options"
        >
          <Button
            onClick={onSettings}
            variant="outline"
            size="sm"
            className={cn(
              sizeClasses[size],
              "bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90"
            )}
          >
            <Settings className={iconSizes[size]} />
          </Button>
        </HoverCallout>
      )}

      {/* Playback Status Indicator */}
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        <div
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            isPlaying ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )}
        />
        <span className="hidden sm:inline">
          {isPlaying ? "Playing" : "Paused"}
        </span>
      </div>
    </div>
  );
};