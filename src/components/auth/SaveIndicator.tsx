import { useSaveStatusOptional } from '@/hooks/useSaveStatus';
import { CheckCircle2, Loader2, AlertCircle, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveIndicatorProps {
  className?: string;
  showAlways?: boolean;
}

export const SaveIndicator = ({ className, showAlways = false }: SaveIndicatorProps) => {
  const saveStatusContext = useSaveStatusOptional();
  
  if (!saveStatusContext) return null;
  
  const { saveStatus, lastSavedAt } = saveStatusContext;

  // Only show when there's activity (unless showAlways is true)
  if (!showAlways && saveStatus === 'idle') return null;

  const formatLastSaved = () => {
    if (!lastSavedAt) return '';
    const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
    if (seconds < 5) return 'Saved just now';
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `Saved ${minutes}m ago`;
  };

  const getContent = () => {
    switch (saveStatus) {
      case 'dirty':
        return (
          <>
            <Cloud className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-600">Unsaved changes</span>
          </>
        );
      case 'saving':
        return (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Saving…</span>
          </>
        );
      case 'saved':
        return (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span className="text-green-600">Progress saved</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-destructive">Save failed</span>
          </>
        );
      case 'idle':
      default:
        if (showAlways && lastSavedAt) {
          return (
            <>
              <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{formatLastSaved()}</span>
            </>
          );
        }
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium transition-opacity duration-200',
        className
      )}
    >
      {content}
    </div>
  );
};
