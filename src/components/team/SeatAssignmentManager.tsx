import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, UserPlus, Search, Loader2, CheckCircle, AlertCircle, AlertTriangle, ShoppingCart, Mail, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  progress_percentage: number;
  certificates_count: number;
  invitation_status?: 'pending' | 'sent' | 'failed' | null;
  invitation_sent_at?: string | null;
}

interface EmployeeWithProfile extends Employee {
  profile_completion?: number;
}

interface Seat {
  id: string;
  status: string;
  assigned_user_id: string | null;
}

interface SeatAssignmentManagerProps {
  organizationId: string;
  courseId?: string;
}

export const SeatAssignmentManager: React.FC<SeatAssignmentManagerProps> = ({ 
  organizationId,
  courseId = 'rvt-course-2024' 
}) => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resending, setResending] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'invited' | 'not_invited' | 'failed'>('all');

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees with invitation status
      const { data: empData, error: empError } = await supabase
        .rpc('get_organization_employees', { org_id: organizationId });
      
      if (empError) throw empError;

      // Fetch invitation status for each employee
      const { data: invitations } = await supabase
        .from('staff_invitations')
        .select('email, status, sent_at')
        .eq('organization_id', organizationId);
      
      // Calculate profile completion for each employee
      const REQUIRED_FIELDS = ['first_name', 'last_name', 'phone', 'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone'];
      const employeesWithCompletion = await Promise.all(
        (empData || []).map(async (emp) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone, date_of_birth, emergency_contact_name, emergency_contact_phone')
            .eq('user_id', emp.user_id)
            .single();
          
          let completedFields = 0;
          if (profile) {
            REQUIRED_FIELDS.forEach(field => {
              if (profile[field]) completedFields++;
            });
          }

          // Find invitation status for this employee
          const invitation = invitations?.find(inv => inv.email === emp.email);
          
          return {
            ...emp,
            profile_completion: Math.round((completedFields / REQUIRED_FIELDS.length) * 100),
            invitation_status: (invitation?.status as 'pending' | 'sent' | 'failed' | null) || null,
            invitation_sent_at: invitation?.sent_at || null
          };
        })
      );
      
      setEmployees(employeesWithCompletion);
      
      // Fetch seats
      const { data: seatData, error: seatError } = await supabase
        .from('rvt_seats')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('course_id', courseId);
      
      if (seatError) throw seatError;
      setSeats(seatData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load seat assignment data');
    } finally {
      setLoading(false);
    }
  };

  const assignSeatToEmployee = async (userId: string) => {
    setAssigning(userId);
    try {
      const { data, error } = await supabase.rpc('allocate_seat_to_user', {
        org_id: organizationId,
        user_id: userId,
        course_id: courseId
      });
      
      if (error) throw error;
      
      toast.success('Seat assigned successfully!');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error assigning seat:', error);
      if (error.message?.includes('No available seats')) {
        toast.error('No available seats. Please purchase more seats.');
      } else {
        toast.error('Failed to assign seat');
      }
    } finally {
      setAssigning(null);
    }
  };

  const availableSeats = seats.filter(s => s.status === 'available').length;
  const assignedSeats = seats.filter(s => s.status === 'assigned').length;
  const usedSeats = seats.filter(s => s.status === 'used').length;
  
  const employeesWithSeats = employees.filter(emp => 
    seats.some(seat => seat.assigned_user_id === emp.user_id)
  );
  
  const employeesWithoutSeats = employees.filter(emp => 
    !seats.some(seat => seat.assigned_user_id === emp.user_id)
  );

  const resendInvitation = async (email: string) => {
    setResending(email);
    try {
      const { error } = await supabase.functions.invoke('send-employee-invitation', {
        body: {
          employeeEmail: email,
          organizationName: 'Your Organization',
          invitationToken: crypto.randomUUID(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      if (error) throw error;

      // Get current resend count and increment
      const { data: currentInvite } = await supabase
        .from('staff_invitations')
        .select('resend_count')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .single();

      await supabase
        .from('staff_invitations')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          resend_count: (currentInvite?.resend_count || 0) + 1
        })
        .eq('email', email)
        .eq('organization_id', organizationId);

      toast.success('Invitation resent successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setResending(null);
    }
  };

  const filteredUnassignedEmployees = employeesWithoutSeats.filter(emp => {
    const matchesSearch = `${emp.first_name} ${emp.last_name} ${emp.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'invited') return matchesSearch && emp.invitation_status === 'sent';
    if (filterStatus === 'not_invited') return matchesSearch && !emp.invitation_status;
    if (filterStatus === 'failed') return matchesSearch && emp.invitation_status === 'failed';
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seat Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Seats</p>
                <p className="text-2xl font-bold">{seats.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">{availableSeats}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{assignedSeats}</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Use</p>
                <p className="text-2xl font-bold text-primary">{usedSeats}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Seats Warning */}
      {availableSeats < seats.length * 0.1 && seats.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">
                  Low Seat Availability
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  You have less than 10% seats available. Consider purchasing more seats.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Without Seats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Unassigned Employees ({employeesWithoutSeats.length})
          </CardTitle>
          <CardDescription>
            Assign training seats to employees to give them access to the course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableSeats === 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-bold">No Training Seats Available</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>You have no available training seats to assign to employees.</p>
                <Button 
                  onClick={() => navigate("/purchase-seats")} 
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Purchase Seats to Continue
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Filter and Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All</option>
              <option value="invited">Invited</option>
              <option value="not_invited">Not Invited</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Employee List */}
          <div className="space-y-2">
            {filteredUnassignedEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {employeesWithoutSeats.length === 0 
                  ? '✓ All employees have seats assigned'
                  : 'No employees match your search'}
              </p>
            ) : (
              filteredUnassignedEmployees.map((employee) => (
                <div
                  key={employee.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <Badge 
                        variant={
                          (employee.profile_completion || 0) === 100 
                            ? "default" 
                            : (employee.profile_completion || 0) >= 50 
                            ? "secondary" 
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {employee.profile_completion || 0}% Profile
                      </Badge>
                      {employee.invitation_status && (
                        <Badge 
                          variant={employee.invitation_status === 'sent' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          {employee.invitation_status === 'sent' ? 'Invited' : 'Failed'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                    {employee.invitation_sent_at && (
                      <p className="text-xs text-muted-foreground">
                        Invited: {new Date(employee.invitation_sent_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {employee.invitation_status === 'failed' && (
                      <Button
                        onClick={() => resendInvitation(employee.email)}
                        disabled={resending === employee.email}
                        size="sm"
                        variant="outline"
                      >
                        {resending === employee.email ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Resend
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={() => assignSeatToEmployee(employee.user_id)}
                      disabled={assigning === employee.user_id || availableSeats === 0}
                      size="sm"
                    >
                      {assigning === employee.user_id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign Seat
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employees With Seats */}
      {employeesWithSeats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Assigned Employees ({employeesWithSeats.length})
            </CardTitle>
            <CardDescription>
              Employees who have been assigned training seats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {employeesWithSeats.map((employee) => {
                const seat = seats.find(s => s.assigned_user_id === employee.user_id);
                return (
                  <div
                    key={employee.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <Badge 
                          variant={
                            (employee.profile_completion || 0) === 100 
                              ? "default" 
                              : (employee.profile_completion || 0) >= 50 
                              ? "secondary" 
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {employee.profile_completion || 0}% Profile
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                    <Badge variant={seat?.status === 'used' ? 'default' : 'secondary'}>
                      {seat?.status === 'used' ? 'In Progress' : 'Seat Assigned'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
