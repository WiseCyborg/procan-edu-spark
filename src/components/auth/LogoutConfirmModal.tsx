import { useState, useEffect } from 'react';
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

export const LogoutConfirmModal = ({
  open,
  onOpenChange,
  onConfirmLogout,
}: LogoutConfirmModalProps) => {
  const saveStatusContext = useSaveStatusOptional();
  const [waitingForSave, setWaitingForSave] = useState(false);
  
  const saveStatus = saveStatusContext?.saveStatus ?? 'idle';
  const isSaving = saveStatus === 'saving';
  const lastSavedAt = saveStatusContext?.lastSavedAt;

  // If save completes while waiting, proceed with logout
  useEffect(() => {
    if (waitingForSave && !isSaving) {
      setWaitingForSave(false);
      onConfirmLogout();
    }
  }, [waitingForSave, isSaving, onConfirmLogout]);

  const handleConfirm = () => {
    if (isSaving) {
      // Wait for save to complete
      setWaitingForSave(true);
    } else {
      onConfirmLogout();
    }
  };

  const formatLastSaved = () => {
    if (!lastSavedAt) return null;
    const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  const getIcon = () => {
    if (waitingForSave || isSaving) {
      return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    }
    if (saveStatus === 'error') {
      return <AlertCircle className="h-6 w-6 text-destructive" />;
    }
    return <CheckCircle2 className="h-6 w-6 text-green-600" />;
  };

  const getTitle = () => {
    if (waitingForSave || isSaving) {
      return 'Saving your progress…';
    }
    if (saveStatus === 'error') {
      return 'Save may have failed';
    }
    return 'Progress saved';
  };

  const getDescription = () => {
    if (waitingForSave || isSaving) {
      return 'Please wait a moment while we save your progress.';
    }
    if (saveStatus === 'error') {
      return 'There may have been an issue saving your progress. You can still log out, but some recent changes might not be saved.';
    }
    const savedTime = formatLastSaved();
    return savedTime
      ? `Your progress was saved ${savedTime}. You can safely log out.`
      : 'Your progress is saved. You can safely log out.';
  };

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
          <AlertDialogCancel disabled={waitingForSave}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={waitingForSave}
            className={saveStatus === 'error' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {waitingForSave ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Log out'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
