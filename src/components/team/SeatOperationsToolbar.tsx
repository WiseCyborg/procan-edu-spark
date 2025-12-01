import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserMinus, Mail, ArrowRightLeft, BarChart } from 'lucide-react';

interface SeatOperationsToolbarProps {
  selectedCount: number;
  onAssignSeats: () => void;
  onUnassignSeats: () => void;
  onSendReminders: () => void;
  onTransferSeat: () => void;
  onViewUtilization: () => void;
  canAssign?: boolean;
  canUnassign?: boolean;
  canTransfer?: boolean;
}

export function SeatOperationsToolbar({
  selectedCount,
  onAssignSeats,
  onUnassignSeats,
  onSendReminders,
  onTransferSeat,
  onViewUtilization,
  canAssign = true,
  canUnassign = true,
  canTransfer = true,
}: SeatOperationsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 mr-auto">
        {selectedCount > 0 && (
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canAssign && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAssignSeats}
            disabled={selectedCount === 0}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Seats
          </Button>
        )}

        {canUnassign && (
          <Button
            size="sm"
            variant="outline"
            onClick={onUnassignSeats}
            disabled={selectedCount === 0}
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Unassign Seats
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onSendReminders}
          disabled={selectedCount === 0}
        >
          <Mail className="h-4 w-4 mr-2" />
          Send Reminders
        </Button>

        {canTransfer && (
          <Button
            size="sm"
            variant="outline"
            onClick={onTransferSeat}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer Seat
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onViewUtilization}
        >
          <BarChart className="h-4 w-4 mr-2" />
          Utilization Report
        </Button>
      </div>
    </div>
  );
}
