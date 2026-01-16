import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IdleTimeoutWarningModalProps {
  open: boolean;
  remainingSeconds: number;
  onStaySignedIn: () => void;
  onLogoutNow: () => void;
}

const formatMinSec = (seconds: number): { min: number; sec: number } => {
  const totalSec = Math.max(0, seconds);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return { min, sec };
};

export const IdleTimeoutWarningModal: React.FC<IdleTimeoutWarningModalProps> = ({
  open,
  remainingSeconds,
  onStaySignedIn,
  onLogoutNow,
}) => {
  const stayBtnRef = useRef<HTMLButtonElement | null>(null);
  const { min, sec } = formatMinSec(remainingSeconds);

  useEffect(() => {
    if (open) {
      stayBtnRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        className="relative w-[92vw] max-w-xl rounded-2xl bg-background shadow-2xl border border-border animate-in fade-in-0 zoom-in-95"
      >
        <div className="flex items-center justify-end px-6 pt-4">
          <button
            onClick={onStaySignedIn}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            aria-label="Close"
          >
            Close <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-8 pt-2 text-center">
          {/* Animated circular indicator */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-b-transparent border-l-transparent rotate-45 animate-pulse" />
          </div>

          <h2 id="idle-title" className="text-2xl font-semibold text-foreground">
            Are You Still There?
          </h2>

          <p className="mt-2 text-muted-foreground">
            Your session will time out in:
          </p>

          {/* Large countdown display */}
          <div className="mt-6 flex items-end justify-center gap-2">
            <div className="text-6xl font-semibold tracking-tight text-foreground tabular-nums">
              {min}
            </div>
            <div className="pb-2 text-muted-foreground text-lg">min</div>
            <div className="text-6xl font-semibold tracking-tight text-foreground tabular-nums">
              {String(sec).padStart(2, '0')}
            </div>
            <div className="pb-2 text-muted-foreground text-lg">sec</div>
          </div>

          {/* Action buttons */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={onLogoutNow}
              className="border-destructive text-destructive hover:bg-destructive/10 px-6 py-6 text-base"
            >
              End My Session
            </Button>

            <Button
              ref={stayBtnRef}
              onClick={onStaySignedIn}
              className="bg-primary hover:bg-primary/90 px-6 py-6 text-base font-medium"
            >
              I'm Still Here!
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
