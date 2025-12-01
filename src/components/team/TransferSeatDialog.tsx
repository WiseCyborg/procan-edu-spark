import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRightLeft, Loader2 } from 'lucide-react';

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  has_seat: boolean;
}

interface TransferSeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  fromUserId?: string;
  onTransferComplete?: () => void;
}

export function TransferSeatDialog({
  open,
  onOpenChange,
  organizationId,
  fromUserId,
  onTransferComplete,
}: TransferSeatDialogProps) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fromUser, setFromUser] = useState(fromUserId || '');
  const [toUser, setToUser] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      setFromUser(fromUserId || '');
      setToUser('');
      setReason('');
    }
  }, [open, fromUserId, organizationId]);

  const fetchEmployees = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email_cache')
        .eq('organization_id', organizationId)
        .order('first_name');

      if (error) throw error;

      // Check which employees have seats
      const { data: seats } = await supabase
        .from('rvt_seats')
        .select('assigned_user_id')
        .eq('organization_id', organizationId)
        .in('status', ['assigned', 'used'])
        .not('assigned_user_id', 'is', null);

      const seatUserIds = new Set(seats?.map((s) => s.assigned_user_id) || []);

      const enrichedEmployees = profiles?.map((p) => ({
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email_cache || '',
        has_seat: seatUserIds.has(p.user_id),
      })) || [];

      setEmployees(enrichedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setFetchingEmployees(false);
    }
  };

  const handleTransfer = async () => {
    if (!fromUser || !toUser || !user) {
      toast.error('Please select both employees');
      return;
    }

    if (fromUser === toUser) {
      toast.error('Cannot transfer seat to the same employee');
      return;
    }

    setLoading(true);

    try {
      // Find the seat assigned to fromUser
      const { data: seat, error: seatError } = await supabase
        .from('rvt_seats')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('assigned_user_id', fromUser)
        .in('status', ['assigned', 'used'])
        .single();

      if (seatError || !seat) {
        throw new Error('Source employee does not have an assigned seat');
      }

      // Update seat assignment
      const { error: updateError } = await supabase
        .from('rvt_seats')
        .update({
          assigned_user_id: toUser,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', seat.id);

      if (updateError) throw updateError;

      // Log the transfer operation
      const { error: logError } = await supabase
        .from('seat_operation_history' as any)
        .insert({
          seat_id: seat.id,
          organization_id: organizationId,
          operation_type: 'transferred',
          from_user_id: fromUser,
          to_user_id: toUser,
          performed_by: user.id,
          reason: reason || null,
        });

      if (logError) console.error('Error logging transfer:', logError);

      const fromEmployee = employees.find((e) => e.user_id === fromUser);
      const toEmployee = employees.find((e) => e.user_id === toUser);

      toast.success('Seat transferred successfully', {
        description: `From ${fromEmployee?.first_name} ${fromEmployee?.last_name} to ${toEmployee?.first_name} ${toEmployee?.last_name}`,
      });

      onOpenChange(false);
      if (onTransferComplete) {
        onTransferComplete();
      }
    } catch (error: any) {
      console.error('Error transferring seat:', error);
      toast.error('Failed to transfer seat', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const fromEmployee = employees.find((e) => e.user_id === fromUser);
  const toEmployee = employees.find((e) => e.user_id === toUser);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Training Seat
          </DialogTitle>
          <DialogDescription>
            Move a seat from one employee to another (useful when employees leave or change roles)
          </DialogDescription>
        </DialogHeader>

        {fetchingEmployees ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="from-user">Transfer From (current seat holder)</Label>
              <Select value={fromUser} onValueChange={setFromUser}>
                <SelectTrigger id="from-user">
                  <SelectValue placeholder="Select employee with seat" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => e.has_seat)
                    .map((emp) => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.first_name} {emp.last_name} ({emp.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {fromUser && (
              <div className="flex items-center justify-center py-2">
                <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="to-user">Transfer To (new seat holder)</Label>
              <Select
                value={toUser}
                onValueChange={setToUser}
                disabled={!fromUser}
              >
                <SelectTrigger id="to-user">
                  <SelectValue placeholder="Select employee to receive seat" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => !e.has_seat && e.user_id !== fromUser)
                    .map((emp) => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.first_name} {emp.last_name} ({emp.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Transfer (optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Employee left, role change, performance issue"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {fromEmployee && toEmployee && (
              <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-2">Transfer Summary:</p>
                <p className="text-muted-foreground">
                  Seat will be moved from{' '}
                  <span className="font-medium text-foreground">
                    {fromEmployee.first_name} {fromEmployee.last_name}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium text-foreground">
                    {toEmployee.first_name} {toEmployee.last_name}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || !fromUser || !toUser || fetchingEmployees}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer Seat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
