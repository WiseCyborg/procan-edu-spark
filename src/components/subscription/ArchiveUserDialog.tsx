import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Archive, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ArchiveUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  onArchiveComplete?: () => void;
}

const ARCHIVE_REASONS = [
  { value: 'completed', label: 'Completed training' },
  { value: 'terminated', label: 'Employee terminated' },
  { value: 'transferred', label: 'Transferred to another location' },
  { value: 'resigned', label: 'Employee resigned' },
  { value: 'leave', label: 'Extended leave of absence' },
  { value: 'other', label: 'Other reason' },
];

export function ArchiveUserDialog({
  open,
  onOpenChange,
  user,
  onArchiveComplete,
}: ArchiveUserDialogProps) {
  const { user: currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    if (!reason || !confirmed) return;

    setArchiving(true);
    try {
      const { data, error } = await supabase.rpc('archive_user_seat', {
        p_user_id: user.userId,
        p_reason: ARCHIVE_REASONS.find(r => r.value === reason)?.label || reason,
        p_performed_by: currentUser?.id,
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string; message?: string };

      if (result.success) {
        toast.success('User archived successfully', {
          description: 'Their seat is now available for reassignment.',
        });
        onArchiveComplete?.();
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to archive user');
      }
    } catch (error: any) {
      console.error('Error archiving user:', error);
      toast.error('Failed to archive user', {
        description: error.message,
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive Employee Seat
          </DialogTitle>
          <DialogDescription>
            Archive {user.firstName} {user.lastName}'s training seat to free capacity for a new employee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{user.firstName}</strong> will lose access to their training dashboard.
              Their certificate (if earned) will remain valid.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for archiving</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label htmlFor="confirm" className="text-sm text-muted-foreground cursor-pointer">
              I understand this will remove {user.firstName}'s training access and free their seat
              for reassignment. This action is logged for audit purposes.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={archiving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleArchive}
            disabled={!reason || !confirmed || archiving}
          >
            {archiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Archive Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
