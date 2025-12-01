// Phase 5: Active Call Banner Component
import { Video, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActiveCallBannerProps {
  participantCount: number;
  callDuration: string;
  onJoinCall: () => void;
  onDismiss?: () => void;
}

export const ActiveCallBanner = ({
  participantCount,
  callDuration,
  onJoinCall,
  onDismiss,
}: ActiveCallBannerProps) => {
  return (
    <div className="bg-primary/10 border-l-4 border-primary p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Video className="w-6 h-6 text-primary" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
          </span>
        </div>
        
        <div>
          <h3 className="font-semibold text-sm">Active Video Call in Progress</h3>
          <p className="text-xs text-muted-foreground">
            <Users className="w-3 h-3 inline mr-1" />
            {participantCount} participant{participantCount !== 1 ? 's' : ''} · {callDuration}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onJoinCall} size="sm" className="gap-2">
          <Video className="w-4 h-4" />
          Join Call
        </Button>
        {onDismiss && (
          <Button onClick={onDismiss} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
