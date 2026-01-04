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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, UserX } from 'lucide-react';

interface DeactivateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  organizationId: string;
  onDeactivated?: () => void;
}

export function DeactivateEmployeeDialog({
  open,
  onOpenChange,
  employee,
  organizationId,
  onDeactivated,
}: DeactivateEmployeeDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [releaseSeat, setReleaseSeat] = useState(true);

  const handleDeactivate = async () => {
    if (!employee || !user) return;

    setLoading(true);

    try {
      // Remove employee from organization (set organization_id to null)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          organization_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', employee.user_id);

      if (profileError) throw profileError;

      // Remove all organization-specific roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', employee.user_id)
        .in('role', ['training_coordinator', 'dispensary_manager']);

      if (rolesError) console.error('Error removing roles:', rolesError);

      // Release seat if requested
      if (releaseSeat) {
        const { error: seatError } = await supabase
          .from('rvt_seats')
          .update({ 
            assigned_user_id: null,
            status: 'available',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
          .eq('assigned_user_id', employee.user_id);

        if (seatError) console.error('Error releasing seat:', seatError);
      }

      // Log the deactivation
      await supabase.from('communication_logs').insert({
        organization_id: organizationId,
        user_id: employee.user_id,
        recipient_email: employee.email,
        communication_type: 'employee_deactivated',
        subject: 'Employee Deactivated',
        content: reason || 'No reason provided',
        delivery_status: 'logged',
        metadata: {
          deactivated_by: user.id,
          seat_released: releaseSeat,
        },
      });

      toast.success('Employee deactivated', {
        description: `${employee.first_name} ${employee.last_name} has been removed from the organization`,
      });

      setReason('');
      setReleaseSeat(true);
      onOpenChange(false);
      onDeactivated?.();
    } catch (error: any) {
      console.error('Error deactivating employee:', error);
      toast.error('Failed to deactivate employee', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setReleaseSeat(true);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            Deactivate Employee
          </AlertDialogTitle>
          <AlertDialogDescription>
            Remove{' '}
            <span className="font-medium text-foreground">
              {employee?.first_name} {employee?.last_name}
            </span>{' '}
            from your organization.
            <br /><br />
            Their account will remain active but they will no longer be associated with your organization.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Employee left the company, transferred to another location"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="release-seat"
              checked={releaseSeat}
              onCheckedChange={(checked) => setReleaseSeat(checked as boolean)}
            />
            <label
              htmlFor="release-seat"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Release their training seat (make available for reassignment)
            </label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={handleClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
