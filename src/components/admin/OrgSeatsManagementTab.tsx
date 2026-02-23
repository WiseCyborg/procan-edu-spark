import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, CreditCard, UserCheck, AlertTriangle, 
  ChevronRight, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface OrgSeatsManagementTabProps {
  organizationId: string;
}

export const OrgSeatsManagementTab = ({ organizationId }: OrgSeatsManagementTabProps) => {
  const queryClient = useQueryClient();
  const [assigningSeat, setAssigningSeat] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>('');

  // Fetch seats with user details
  const { data: seats, isLoading: loadingSeats } = useQuery({
    queryKey: ['org-seats-detailed', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rvt_seats')
        .select(`
          id, 
          status, 
          assigned_user_id, 
          assigned_at, 
          created_at
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch members for assignment dropdown
  const { data: members } = useQuery({
    queryKey: ['org-members-for-seats', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, email, user_id, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch user details for assigned seats
  const { data: userProfiles } = useQuery({
    queryKey: ['seat-user-profiles', organizationId],
    queryFn: async () => {
      const assignedUserIds = seats?.filter(s => s.assigned_user_id).map(s => s.assigned_user_id) || [];
      if (assignedUserIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email_cache')
        .in('id', assignedUserIds);
      if (error) throw error;
      
      return data?.reduce((acc, p) => ({ ...acc, [p.id]: { ...p, email: p.email_cache } }), {}) || {};
    },
    enabled: !!seats && seats.length > 0,
  });

  const handleAssignSeat = async (seatId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('rvt_seats')
        .update({
          assigned_user_id: userId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
        })
        .eq('id', seatId);

      if (error) throw error;

      // Create course entitlement for the assigned user
      const { data: seatData } = await supabase
        .from('rvt_seats')
        .select('course_id')
        .eq('id', seatId)
        .single();

      if (seatData?.course_id) {
        const { error: entError } = await supabase.from('course_entitlements').upsert({
          user_id: userId,
          course_id: seatData.course_id,
          source: 'org_seat',
          status: 'active',
          purchased_at: new Date().toISOString(),
          metadata: { seat_id: seatId, organization_id: organizationId }
        }, { onConflict: 'user_id,course_id' });
        if (entError) throw entError;
      }

      toast.success('Seat assigned successfully');
      setAssigningSeat(null);
      setSelectedMember('');
      queryClient.invalidateQueries({ queryKey: ['org-seats-detailed', organizationId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign seat');
    }
  };

  const handleUnassignSeat = async (seatId: string) => {
    try {
      // Capture assigned user BEFORE clearing the seat
      const { data: seatData } = await supabase
        .from('rvt_seats')
        .select('course_id, assigned_user_id')
        .eq('id', seatId)
        .single();

      const { error } = await supabase
        .from('rvt_seats')
        .update({
          assigned_user_id: null,
          status: 'available',
          assigned_at: null,
        })
        .eq('id', seatId);

      if (error) throw error;

      // Revoke entitlement for the previously assigned user
      if (seatData?.assigned_user_id && seatData?.course_id) {
        await supabase.from('course_entitlements')
          .update({ status: 'revoked' })
          .eq('user_id', seatData.assigned_user_id)
          .eq('course_id', seatData.course_id);
      }

      toast.success('Seat unassigned');
      queryClient.invalidateQueries({ queryKey: ['org-seats-detailed', organizationId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to unassign seat');
    }
  };

  if (loadingSeats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableSeats = seats?.filter(s => s.status === 'available') || [];
  const assignedSeats = seats?.filter(s => s.status === 'assigned') || [];
  const usedSeats = seats?.filter(s => s.status === 'used') || [];
  const totalSeats = seats?.length || 0;
  const utilization = totalSeats > 0 ? ((assignedSeats.length + usedSeats.length) / totalSeats) * 100 : 0;

  // Members without seats
  const membersWithSeats = new Set(seats?.map(s => s.assigned_user_id).filter(Boolean));
  const unassignedMembers = members?.filter(m => m.user_id && !membersWithSeats.has(m.user_id)) || [];

  return (
    <div className="space-y-6">
      {/* Seat Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm">Total Seats</span>
          </div>
          <div className="text-2xl font-bold">{totalSeats}</div>
        </div>
        <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-900/20">
          <div className="text-sm text-muted-foreground mb-1">Available</div>
          <div className="text-2xl font-bold text-green-600">{availableSeats.length}</div>
        </div>
        <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="text-sm text-muted-foreground mb-1">Assigned</div>
          <div className="text-2xl font-bold text-yellow-600">{assignedSeats.length}</div>
        </div>
        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20">
          <div className="text-sm text-muted-foreground mb-1">In Training</div>
          <div className="text-2xl font-bold text-blue-600">{usedSeats.length}</div>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="rounded-lg border p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Seat Utilization</span>
          <span className="text-sm text-muted-foreground">{Math.round(utilization)}%</span>
        </div>
        <Progress value={utilization} className="h-2" />
      </div>

      {/* Warning for unassigned members */}
      {unassignedMembers.length > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              {unassignedMembers.length} member(s) without training seats
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Assign seats to enable training access.
            </p>
          </div>
        </div>
      )}

      {/* Seats Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Assignment Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seats?.map((seat: any, index: number) => {
              const user = userProfiles?.[seat.assigned_user_id];
              const isAssigning = assigningSeat === seat.id;

              return (
                <TableRow key={seat.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        seat.status === 'available' ? 'outline' : 
                        seat.status === 'assigned' ? 'secondary' : 
                        'default'
                      }
                      className={
                        seat.status === 'available' ? 'border-green-500 text-green-600' :
                        seat.status === 'used' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                        ''
                      }
                    >
                      {seat.status === 'available' && '○ Available'}
                      {seat.status === 'assigned' && '◐ Assigned'}
                      {seat.status === 'used' && '● In Training'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isAssigning ? (
                      <div className="flex items-center gap-2">
                        <Select value={selectedMember} onValueChange={setSelectedMember}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                          <SelectContent>
                            {members?.filter(m => m.user_id && !membersWithSeats.has(m.user_id)).map((member) => (
                              <SelectItem key={member.id} value={member.user_id || ''}>
                                {member.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          onClick={() => handleAssignSeat(seat.id, selectedMember)}
                          disabled={!selectedMember}
                        >
                          Assign
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setAssigningSeat(null);
                            setSelectedMember('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : user ? (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {seat.assigned_at ? new Date(seat.assigned_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {seat.status === 'available' && !isAssigning && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setAssigningSeat(seat.id)}
                        disabled={!members?.some(m => m.user_id && !membersWithSeats.has(m.user_id))}
                      >
                        Assign
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                    {seat.status === 'assigned' && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleUnassignSeat(seat.id)}
                      >
                        Unassign
                      </Button>
                    )}
                    {seat.status === 'used' && (
                      <Badge variant="outline" className="gap-1">
                        <BookOpen className="h-3 w-3" />
                        Training Active
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
