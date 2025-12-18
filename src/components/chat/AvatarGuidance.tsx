import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, SkipForward, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAvatarAgent } from '@/hooks/useAvatarAgent';
import { cn } from '@/lib/utils';

interface AvatarGuidanceProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showOnPages?: string[];
  hideOnPages?: string[];
}

export function AvatarGuidance({
  className,
  position = 'bottom-right',
  showOnPages,
  hideOnPages = ['/auth', '/course/final-exam']
}: AvatarGuidanceProps) {
  const {
    state,
    currentMessage,
    messageQueue,
    skipMessage,
    replayMessage,
    isEnabled,
    setEnabled,
    triggerAvatar
  } = useAvatarAgent();

  // Check if we should show on current page
  const currentPath = window.location.pathname;
  const shouldHide = hideOnPages?.some(p => currentPath.startsWith(p));
  const shouldShow = !showOnPages || showOnPages.some(p => currentPath.startsWith(p));

  // Trigger page-based prompts on mount
  useEffect(() => {
    if (!isEnabled || shouldHide || !shouldShow) return;

    // Small delay to let page render first
    const timer = setTimeout(() => {
      triggerAvatar(currentPath, {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentPath, isEnabled, shouldHide, shouldShow, triggerAvatar]);

  if (shouldHide || !shouldShow) return null;

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4'
  };

  return (
    <>
      {/* Gaze highlight styles */}
      <style>{`
        .avatar-gaze-highlight {
          position: relative;
          animation: avatar-pulse 2s ease-in-out infinite;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.5), 0 0 20px hsl(var(--primary) / 0.3);
          border-radius: 8px;
        }
        
        @keyframes avatar-pulse {
          0%, 100% { box-shadow: 0 0 0 3px hsl(var(--primary) / 0.5), 0 0 20px hsl(var(--primary) / 0.3); }
          50% { box-shadow: 0 0 0 6px hsl(var(--primary) / 0.3), 0 0 30px hsl(var(--primary) / 0.2); }
        }
      `}</style>

      <AnimatePresence>
        {currentMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'fixed z-50 max-w-sm',
              positionClasses[position],
              className
            )}
          >
            <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-2">
                  {/* Avatar indicator */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    state === 'speaking' ? 'bg-primary' : 'bg-muted'
                  )}>
                    {state === 'speaking' ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <Volume2 className="w-4 h-4 text-primary-foreground" />
                      </motion.div>
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    ProCann Guide
                  </span>
                  {state === 'speaking' && (
                    <span className="text-xs text-muted-foreground">Speaking...</span>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={skipMessage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Message content */}
              <div className="p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {currentMessage.compiledText}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipMessage}
                    className="h-7 px-2 text-xs"
                  >
                    <SkipForward className="h-3 w-3 mr-1" />
                    Skip
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={replayMessage}
                    className="h-7 px-2 text-xs"
                    disabled={state === 'speaking'}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Replay
                  </Button>
                </div>

                {messageQueue.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    +{messageQueue.length} more
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle when no message */}
      {!currentMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'fixed z-40',
            positionClasses[position]
          )}
        >
          <Button
            variant={isEnabled ? 'default' : 'outline'}
            size="icon"
            className="rounded-full w-10 h-10 shadow-lg"
            onClick={() => setEnabled(!isEnabled)}
            title={isEnabled ? 'Disable voice guide' : 'Enable voice guide'}
          >
            {isEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </motion.div>
      )}
    </>
  );
}
