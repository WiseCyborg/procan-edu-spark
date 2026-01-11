import React from 'react';
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
import { Clock, LogOut, Shield } from 'lucide-react';

interface IdleTimeoutWarningModalProps {
  open: boolean;
  remainingSeconds: number;
  onStaySignedIn: () => void;
  onLogoutNow: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const IdleTimeoutWarningModal: React.FC<IdleTimeoutWarningModalProps> = ({
  open,
  remainingSeconds,
  onStaySignedIn,
  onLogoutNow,
}) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-xl">Still there?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            For your security, you'll be signed out in{' '}
            <span className="font-mono font-bold text-foreground text-lg">
              {formatTime(remainingSeconds)}
            </span>{' '}
            due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <Shield className="h-4 w-4 flex-shrink-0" />
          <span>Your progress is saved. You can resume after signing back in.</span>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={onLogoutNow}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Log out now
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onStaySignedIn}
            className="bg-primary hover:bg-primary/90"
          >
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
