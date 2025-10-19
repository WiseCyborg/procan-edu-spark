import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, UserPlus, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  progress_percentage: number;
  certificates_count: number;
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const { data: empData, error: empError } = await supabase
        .rpc('get_organization_employees', { org_id: organizationId });
      
      if (empError) throw empError;
      setEmployees(empData || []);
      
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

  const filteredUnassignedEmployees = employeesWithoutSeats.filter(emp =>
    `${emp.first_name} ${emp.last_name} ${emp.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                  <div>
                    <p className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                  </div>
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
                    <div>
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
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
