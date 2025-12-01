import React, { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UATAccountResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  onConfirm: (resetSeats: boolean) => void;
  isResetting: boolean;
}

export const UATAccountResetDialog = ({
  open,
  onOpenChange,
  account,
  onConfirm,
  isResetting
}: UATAccountResetDialogProps) => {
  const [confirmed, setConfirmed] = useState(false);
  const [resetSeats, setResetSeats] = useState(false);

  const handleConfirm = () => {
    if (!confirmed) return;
    onConfirm(resetSeats);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-600" />
            Reset UAT Account
          </DialogTitle>
          <DialogDescription>
            Review what will be deleted before proceeding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Info */}
          <div className="rounded-lg bg-muted p-4">
            <div className="font-medium">{account.email}</div>
            <div className="text-sm text-muted-foreground">
              {account.profiles?.[0]?.first_name} {account.profiles?.[0]?.last_name} • {account.account_type}
            </div>
          </div>

          {/* What Will Be Deleted */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">The following data will be permanently deleted:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All training progress and module completions</li>
                <li>All exam attempts and scores</li>
                <li>All certificates issued to this user</li>
                <li>User journey state (will be reset to "new_user")</li>
                {resetSeats && <li className="text-orange-600">Training seat assignment (will be unassigned)</li>}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Risk Assessment */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="font-medium text-orange-900 mb-2">⚠️ Risk Level: Medium</div>
            <p className="text-sm text-orange-800">
              This action cannot be undone. The account will remain active but all training data will be cleared.
              Use this to reset UAT accounts for new testing cycles.
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-seats"
                checked={resetSeats}
                onCheckedChange={(checked) => setResetSeats(checked === true)}
              />
              <label
                htmlFor="reset-seats"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Also unassign training seat (make it available for re-assignment)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-reset"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <label
                htmlFor="confirm-reset"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand this will permanently delete all training data for this UAT account
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!confirmed || isResetting}
          >
            {isResetting ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
