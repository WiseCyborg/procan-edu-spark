import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from 'sonner';
import { Loader2, UserMinus } from 'lucide-react';

interface RevokeCoordinatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinator: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  onRevoked?: () => void;
}

export function RevokeCoordinatorDialog({
  open,
  onOpenChange,
  coordinator,
  onRevoked,
}: RevokeCoordinatorDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    if (!coordinator || !user) return;

    setLoading(true);

    try {
      // Remove the training_coordinator role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', coordinator.user_id)
        .eq('role', 'training_coordinator');

      if (error) throw error;

      toast.success('Coordinator role revoked', {
        description: `${coordinator.first_name} ${coordinator.last_name} is no longer a training coordinator`,
      });

      onOpenChange(false);
      onRevoked?.();
    } catch (error: any) {
      console.error('Error revoking coordinator:', error);
      toast.error('Failed to revoke role', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Revoke Coordinator Role
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove the training coordinator role from{' '}
            <span className="font-medium text-foreground">
              {coordinator?.first_name} {coordinator?.last_name}
            </span>
            ?
            <br /><br />
            They will lose access to coordinator features but remain as an employee.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking...
              </>
            ) : (
              'Revoke Role'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
