import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Users, UserPlus, UserMinus, MoreVertical, 
  ArrowRightLeft, RotateCcw, UserX, Upload, Loader2 
} from 'lucide-react';
import { AssignCoordinatorDialog } from './AssignCoordinatorDialog';
import { RevokeCoordinatorDialog } from './RevokeCoordinatorDialog';
import { BulkEmployeeInviteDialog } from './BulkEmployeeInviteDialog';
import { ResetProgressDialog } from './ResetProgressDialog';
import { DeactivateEmployeeDialog } from './DeactivateEmployeeDialog';
import { TransferSeatDialog } from './TransferSeatDialog';

interface TeamManagementPanelProps {
  organizationId: string;
  organizationName: string;
}

interface Coordinator {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function TeamManagementPanel({ organizationId, organizationName }: TeamManagementPanelProps) {
  const [loading, setLoading] = useState(true);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showBulkInviteDialog, setShowBulkInviteDialog] = useState(false);
  const [showResetProgressDialog, setShowResetProgressDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  
  // Selected items
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch coordinators
      const { data: coordData } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(first_name, last_name, email_cache, organization_id)
        `)
        .eq('role', 'training_coordinator')
        .eq('profiles.organization_id', organizationId);

      const coords = coordData?.map((c: any) => ({
        user_id: c.user_id,
        first_name: c.profiles.first_name,
        last_name: c.profiles.last_name,
        email: c.profiles.email_cache || '',
      })) || [];

      setCoordinators(coords);

      // Fetch employees (non-coordinators)
      const { data: empData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email_cache')
        .eq('organization_id', organizationId);

      const coordIds = new Set(coords.map(c => c.user_id));
      const emps = empData?.filter((e: any) => !coordIds.has(e.user_id)).map((e: any) => ({
        user_id: e.user_id,
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email_cache || '',
      })) || [];

      setEmployees(emps);
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeClick = (coord: Coordinator) => {
    setSelectedCoordinator(coord);
    setShowRevokeDialog(true);
  };

  const handleResetProgressClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowResetProgressDialog(true);
  };

  const handleDeactivateClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowDeactivateDialog(true);
  };

  const handleTransferClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowTransferDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Training Coordinators Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Training Coordinators
              </CardTitle>
              <CardDescription>
                Manage team members who coordinate employee training
              </CardDescription>
            </div>
            <Button onClick={() => setShowAssignDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Coordinator
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {coordinators.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No training coordinators assigned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {coordinators.map((coord) => (
                <div
                  key={coord.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {coord.first_name} {coord.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{coord.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>Training Coordinator</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRevokeClick(coord)}>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Revoke Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetProgressClick(coord)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset Progress
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeactivateClick(coord)}
                          className="text-destructive"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Actions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee Operations</CardTitle>
              <CardDescription>
                Bulk operations and employee management tools
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBulkInviteDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Invite
              </Button>
              <Button variant="outline" onClick={() => setShowTransferDialog(true)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Seat
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {employees.length} employees in your organization (excluding coordinators)
          </p>
          
          {employees.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {employees.slice(0, 10).map((emp) => (
                <div
                  key={emp.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-muted-foreground text-xs">{emp.email}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedEmployee(emp);
                        setShowAssignDialog(true);
                      }}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Promote to Coordinator
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTransferClick(emp)}>
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transfer Seat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetProgressClick(emp)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset Progress
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeactivateClick(emp)}
                        className="text-destructive"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {employees.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  And {employees.length - 10} more...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AssignCoordinatorDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        organizationId={organizationId}
        organizationName={organizationName}
        employees={employees}
        onAssigned={fetchData}
      />

      <RevokeCoordinatorDialog
        open={showRevokeDialog}
        onOpenChange={setShowRevokeDialog}
        coordinator={selectedCoordinator}
        onRevoked={fetchData}
      />

      <BulkEmployeeInviteDialog
        open={showBulkInviteDialog}
        onOpenChange={setShowBulkInviteDialog}
        organizationId={organizationId}
        organizationName={organizationName}
        onInvited={fetchData}
      />

      <ResetProgressDialog
        open={showResetProgressDialog}
        onOpenChange={setShowResetProgressDialog}
        employee={selectedEmployee}
        onReset={fetchData}
      />

      <DeactivateEmployeeDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
        employee={selectedEmployee}
        organizationId={organizationId}
        onDeactivated={fetchData}
      />

      <TransferSeatDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        organizationId={organizationId}
        fromUserId={selectedEmployee?.user_id}
        onTransferComplete={fetchData}
      />
    </div>
  );
}
