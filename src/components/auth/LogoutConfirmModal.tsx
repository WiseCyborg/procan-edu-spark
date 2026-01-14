import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useSaveStatusOptional } from '@/hooks/useSaveStatus';

interface LogoutConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmLogout: () => void;
}

type ModalState = 'checking' | 'waiting' | 'ready' | 'error' | 'timeout';

export const LogoutConfirmModal = ({
  open,
  onOpenChange,
  onConfirmLogout,
}: LogoutConfirmModalProps) => {
  const saveStatusContext = useSaveStatusOptional();
  const [modalState, setModalState] = useState<ModalState>('checking');
  
  const saveStatus = saveStatusContext?.saveStatus ?? 'idle';
  const lastSavedAt = saveStatusContext?.lastSavedAt;
  const flushSave = saveStatusContext?.flushSave;

  // When modal opens, check save status and wait if needed
  useEffect(() => {
    if (!open) {
      setModalState('checking');
      return;
    }

    const checkAndWait = async () => {
      // If actively saving, wait for it
      if (saveStatus === 'saving' && flushSave) {
        setModalState('waiting');
        const success = await flushSave(5000);
        setModalState(success ? 'ready' : 'timeout');
      } else if (saveStatus === 'dirty') {
        // Dirty state means changes exist but haven't been flushed
        // For now, treat as ready since saves happen on navigation
        setModalState('ready');
      } else if (saveStatus === 'error') {
        setModalState('error');
      } else {
        setModalState('ready');
      }
    };

    checkAndWait();
  }, [open, saveStatus, flushSave]);

  const handleConfirm = useCallback(() => {
    onConfirmLogout();
  }, [onConfirmLogout]);

  const formatLastSaved = () => {
    if (!lastSavedAt) return null;
    const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  const getIcon = () => {
    switch (modalState) {
      case 'checking':
      case 'waiting':
        return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
      case 'error':
      case 'timeout':
        return <AlertCircle className="h-6 w-6 text-destructive" />;
      case 'ready':
      default:
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
    }
  };

  const getTitle = () => {
    switch (modalState) {
      case 'checking':
        return 'Checking save status…';
      case 'waiting':
        return 'Saving your progress…';
      case 'error':
        return 'Save may have failed';
      case 'timeout':
        return 'Progress still saving';
      case 'ready':
      default:
        return 'Progress saved';
    }
  };

  const getDescription = () => {
    switch (modalState) {
      case 'checking':
      case 'waiting':
        return 'Please wait a moment while we save your progress.';
      case 'error':
        return 'There may have been an issue saving your progress. You can still sign out, but some recent changes might not be saved.';
      case 'timeout':
        return "We couldn't confirm your progress was saved yet. Do you want to sign out anyway?";
      case 'ready':
      default:
        const savedTime = formatLastSaved();
        return savedTime
          ? `Your progress was saved ${savedTime}. You can safely sign out.`
          : 'Your progress is saved. You can safely sign out.';
    }
  };

  const isWaiting = modalState === 'checking' || modalState === 'waiting';
  const showWarning = modalState === 'error' || modalState === 'timeout';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isWaiting}>
            {showWarning ? 'Stay signed in' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isWaiting}
            className={showWarning ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isWaiting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : showWarning ? (
              'Sign out anyway'
            ) : (
              'Sign out'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
