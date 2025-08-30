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
    <div className={cn("flex items-center gap-1", className)}>
      <HoverCallout content={isPlaying ? "Pause" : "Play"}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(sizeClasses[size], "rounded-full")}
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className={iconSizes[size]} />
          ) : (
            <Play className={iconSizes[size]} />
          )}
        </Button>
      </HoverCallout>

      {onToggleMute && (
        <HoverCallout content={isMuted ? "Unmute" : "Mute"}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(sizeClasses[size], "rounded-full")}
            onClick={onToggleMute}
          >
            {isMuted ? (
              <VolumeX className={iconSizes[size]} />
            ) : (
              <Volume2 className={iconSizes[size]} />
            )}
          </Button>
        </HoverCallout>
      )}

      {onVolumeChange && (
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-16 h-1 bg-muted rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      )}

      {showSettings && onSettings && (
        <HoverCallout content="Settings">
          <Button
            variant="ghost"
            size="icon"
            className={cn(sizeClasses[size], "rounded-full")}
            onClick={onSettings}
          >
            <Settings className={iconSizes[size]} />
          </Button>
        </HoverCallout>
      )}
    </div>
  );
};