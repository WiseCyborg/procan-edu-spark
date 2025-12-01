import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationSeats } from '@/hooks/useOrganizationSeats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { SeatOperationsToolbar } from './SeatOperationsToolbar';
import { SeatHistoryTab } from './SeatHistoryTab';
import { RequestSeatsForm } from './RequestSeatsForm';
import { TransferSeatDialog } from './TransferSeatDialog';
import { PurchaseSeatsDialog } from './PurchaseSeatsDialog';
import { SeatRequestManager } from './SeatRequestManager';
import { toast } from 'sonner';
import { Users, Search, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  has_seat: boolean;
  seat_status?: 'available' | 'assigned' | 'used';
  progress_percentage: number;
}

interface AdvancedSeatManagementProps {
  organizationId: string;
}

export function AdvancedSeatManagement({ organizationId }: AdvancedSeatManagementProps) {
  const { user } = useAuth();
  const { isAdmin, isDispensaryManager, isTrainingCoordinator } = useUserRole();
  const { data: seatData } = useOrganizationSeats(organizationId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const canAssignSeats = isAdmin || isTrainingCoordinator || isDispensaryManager;
  const canPurchaseSeats = isAdmin || isDispensaryManager;
  const canApproveRequests = isAdmin || isDispensaryManager;

  useEffect(() => {
    fetchEmployees();

    // Real-time updates
    const channel = supabase
      .channel('seat-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rvt_seats', filter: `organization_id=eq.${organizationId}` },
        () => fetchEmployees()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `organization_id=eq.${organizationId}` },
        () => fetchEmployees()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const fetchEmployees = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email_cache')
        .eq('organization_id', organizationId)
        .order('first_name');

      if (error) throw error;

      // Get seat assignments and progress
      const { data: seats } = await supabase
        .from('rvt_seats')
        .select('assigned_user_id, status')
        .eq('organization_id', organizationId)
        .not('assigned_user_id', 'is', null);

      const { data: progress } = await supabase
        .rpc('get_organization_employees', { org_id: organizationId });

      const seatMap = new Map(seats?.map((s) => [s.assigned_user_id, s.status]) || []);
      const progressMap = new Map(
        progress?.map((p: any) => [p.user_id, p.progress_percentage]) || []
      );

      const enrichedEmployees = profiles?.map((p) => ({
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email_cache || '',
        has_seat: seatMap.has(p.user_id),
        seat_status: seatMap.get(p.user_id) as 'available' | 'assigned' | 'used' | undefined,
        progress_percentage: progressMap.get(p.user_id) || 0,
      })) || [];

      setEmployees(enrichedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSeats = async () => {
    if (selectedEmployees.length === 0 || !seatData) return;

    if (selectedEmployees.length > seatData.available) {
      toast.error('Not enough available seats', {
        description: `You have ${seatData.available} available seats but selected ${selectedEmployees.length} employees`,
      });
      return;
    }

    try {
      // Get the RVT course ID
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .ilike('title', '%RVT%')
        .single();

      if (!course) {
        throw new Error('RVT course not found');
      }

      const promises = selectedEmployees.map(async (userId) => {
        const { error } = await supabase.rpc('allocate_seat_to_user', {
          org_id: organizationId,
          user_id: userId,
          course_id: course.id,
        });
        if (error) throw error;
      });

      await Promise.all(promises);

      toast.success('Seats assigned successfully', {
        description: `Assigned ${selectedEmployees.length} seats to selected employees`,
      });

      setSelectedEmployees([]);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error assigning seats:', error);
      toast.error('Failed to assign seats', {
        description: error.message,
      });
    }
  };

  const handleUnassignSeats = async () => {
    if (selectedEmployees.length === 0) return;

    try {
      const { data: seats } = await supabase
        .from('rvt_seats')
        .select('id')
        .eq('organization_id', organizationId)
        .in('assigned_user_id', selectedEmployees);

      if (!seats || seats.length === 0) {
        toast.error('No seats found to unassign');
        return;
      }

      const promises = seats.map(async (seat) => {
        const { error } = await supabase.rpc('unassign_seat', {
          seat_id_param: seat.id,
        });
        if (error) throw error;
      });

      await Promise.all(promises);

      toast.success('Seats unassigned successfully', {
        description: `Freed up ${seats.length} seats`,
      });

      setSelectedEmployees([]);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error unassigning seats:', error);
      toast.error('Failed to unassign seats', {
        description: error.message,
      });
    }
  };

  const handleSendReminders = async () => {
    if (selectedEmployees.length === 0) return;

    try {
      const { error } = await supabase.rpc('send_bulk_reminders', {
        user_ids: selectedEmployees,
        message_template: 'Please complete your training as soon as possible',
        coordinator_id: user!.id,
      });

      if (error) throw error;

      toast.success('Reminders sent successfully', {
        description: `Sent to ${selectedEmployees.length} employees`,
      });
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    `${emp.first_name} ${emp.last_name} ${emp.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seat Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Seats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seatData?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{seatData?.available || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{seatData?.assigned || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              In Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{seatData?.used || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="history">Seat History</TabsTrigger>
          {canApproveRequests && <TabsTrigger value="requests">Requests</TabsTrigger>}
          {(isTrainingCoordinator || canPurchaseSeats) && (
            <TabsTrigger value="actions">Actions</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Employee Seat Management</CardTitle>
                  <CardDescription>
                    Assign, unassign, and manage training seats for your team
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SeatOperationsToolbar
                selectedCount={selectedEmployees.length}
                onAssignSeats={handleAssignSeats}
                onUnassignSeats={handleUnassignSeats}
                onSendReminders={handleSendReminders}
                onTransferSeat={() => setShowTransferDialog(true)}
                onViewUtilization={() => toast.info('Utilization report coming soon')}
                canAssign={canAssignSeats}
                canUnassign={canAssignSeats}
                canTransfer={canAssignSeats}
              />

              <div className="space-y-2">
                {filteredEmployees.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No employees found
                  </p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div
                      key={emp.user_id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={selectedEmployees.includes(emp.user_id)}
                        onCheckedChange={(checked) => {
                          setSelectedEmployees((prev) =>
                            checked
                              ? [...prev, emp.user_id]
                              : prev.filter((id) => id !== emp.user_id)
                          );
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{emp.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {emp.has_seat ? (
                          <>
                            <Badge
                              variant={
                                emp.seat_status === 'used'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {emp.seat_status === 'used' ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  In Progress
                                </>
                              )}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {emp.progress_percentage}%
                            </span>
                          </>
                        ) : (
                          <Badge variant="outline">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            No Seat
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <SeatHistoryTab organizationId={organizationId} />
        </TabsContent>

        {canApproveRequests && (
          <TabsContent value="requests">
            <SeatRequestManager organizationId={organizationId} />
          </TabsContent>
        )}

        {(isTrainingCoordinator || canPurchaseSeats) && (
          <TabsContent value="actions" className="space-y-4">
            {isTrainingCoordinator && !canPurchaseSeats && (
              <RequestSeatsForm
                organizationId={organizationId}
                onRequestSubmitted={fetchEmployees}
              />
            )}
            {canPurchaseSeats && (
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Training Seats</CardTitle>
                  <CardDescription>
                    Add more seats to accommodate growing team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setShowPurchaseDialog(true)}>
                    Purchase Seats
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <TransferSeatDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        organizationId={organizationId}
        onTransferComplete={fetchEmployees}
      />

      {canPurchaseSeats && (
        <PurchaseSeatsDialog
          organizationId={organizationId}
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          onPurchaseComplete={fetchEmployees}
        />
      )}
    </div>
  );
}
