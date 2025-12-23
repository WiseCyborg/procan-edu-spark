import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Search, Calendar, Mail, Download, 
  CheckCircle, AlertCircle, Clock, Loader2, Filter,
  User, Send, Award, MoreVertical, Package
} from 'lucide-react';
import { EmployeePacketExportButton } from '@/components/compliance/EmployeePacketExportButton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EmployeeRosterWidgetProps {
  organizationId: string;
}

export const EmployeeRosterWidget = ({ organizationId }: EmployeeRosterWidgetProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Date | undefined>(undefined);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ['organization-employees', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_organization_employees' as any, {
        org_id: organizationId
      });
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredEmployees = employees?.filter((emp: any) => {
    const matchesSearch = 
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    
    if (statusFilter === 'certified') {
      return matchesSearch && emp.certificate_status === 'valid';
    }
    if (statusFilter === 'in_progress') {
      return matchesSearch && emp.progress_percentage < 100 && emp.progress_percentage > 0;
    }
    if (statusFilter === 'not_started') {
      return matchesSearch && (emp.progress_percentage === 0 || !emp.progress_percentage);
    }
    if (statusFilter === 'at_risk') {
      const hasDeadline = emp.training_deadline;
      const lowProgress = (emp.progress_percentage || 0) < 50;
      return matchesSearch && hasDeadline && lowProgress;
    }
    
    return matchesSearch;
  });

  const exportToCSV = () => {
    if (!employees || employees.length === 0) {
      toast.error('No employees to export');
      return;
    }

    const headers = ['Name', 'Email', 'Role', 'Progress %', 'Tier', 'Certificate', 'Deadline', 'Last Login'];
    const rows = employees.map((emp: any) => [
      `${emp.first_name} ${emp.last_name}`,
      emp.email,
      emp.role?.replace('_', ' ') || 'Student',
      emp.progress_percentage || 0,
      emp.current_tier || 'Green',
      emp.certificate_status || 'N/A',
      emp.training_deadline ? format(new Date(emp.training_deadline), 'MM/dd/yyyy') : 'Not Set',
      emp.last_login ? format(new Date(emp.last_login), 'MM/dd/yyyy') : 'Never'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-roster-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast.success('Employee roster exported');
  };

  const handleViewProfile = (employee: any) => {
    setSelectedEmployee(employee);
    setShowProfileDialog(true);
  };

  const handleSendReminder = async (employee: any) => {
    setIsSendingReminder(true);
    try {
      const { error } = await supabase.functions.invoke('send-deadline-reminders', {
        body: { 
          userIds: [employee.user_id],
          organizationId 
        }
      });

      if (error) throw error;
      
      toast.success(`Reminder sent to ${employee.first_name} ${employee.last_name}`);
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSetDeadline = (employee: any) => {
    setSelectedEmployee(employee);
    setSelectedDeadline(employee.training_deadline ? new Date(employee.training_deadline) : undefined);
    setShowDeadlineDialog(true);
  };

  const handleSaveDeadline = async () => {
    if (!selectedEmployee || !selectedDeadline) return;

    try {
      const { error } = await supabase
        .from('enrollment_deadlines')
        .upsert({
          user_id: selectedEmployee.user_id,
          deadline: selectedDeadline.toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Deadline updated successfully');
      setShowDeadlineDialog(false);
      refetch();
    } catch (error: any) {
      console.error('Error setting deadline:', error);
      toast.error('Failed to set deadline');
    }
  };

  const handleViewCertificate = (employee: any) => {
    if (employee.certificate_url) {
      window.open(employee.certificate_url, '_blank');
    } else {
      toast.info('No certificate available yet');
    }
  };

  const getStatusBadge = (employee: any) => {
    if (employee.certificate_status === 'valid') {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Certified
        </Badge>
      );
    }
    
    const progress = employee.progress_percentage || 0;
    const hasDeadline = employee.training_deadline;
    
    if (hasDeadline && progress < 50) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          At Risk
        </Badge>
      );
    }
    
    if (progress > 0 && progress < 100) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        Not Started
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Roster
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardTitle>
        <CardDescription>
          {employees?.length || 0} employees in your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'certified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('certified')}
            >
              Certified
            </Button>
            <Button
              variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('in_progress')}
            >
              In Progress
            </Button>
            <Button
              variant={statusFilter === 'at_risk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('at_risk')}
            >
              At Risk
            </Button>
          </div>
        </div>

        {/* Employee Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No employees match your filters' 
                      : 'No employees found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees?.map((employee: any) => (
                  <TableRow key={employee.user_id}>
                    <TableCell>
                      <div className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {employee.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {employee.role?.replace('_', ' ').toUpperCase() || 'Student'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">
                            {employee.progress_percentage || 0}%
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {employee.current_tier || 'Green'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(employee)}
                    </TableCell>
                    <TableCell>
                      {employee.training_deadline ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(employee.training_deadline), 'MM/dd/yyyy')}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.last_login ? (
                        <span className="text-sm">
                          {format(new Date(employee.last_login), 'MM/dd/yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewProfile(employee)}
                          title="View Profile"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSendReminder(employee)}
                          disabled={isSendingReminder}
                          title="Send Reminder"
                        >
                          {isSendingReminder ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSetDeadline(employee)}
                          title="Set Deadline"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        {employee.certificate_status === 'valid' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewCertificate(employee)}
                            title="View Certificate"
                          >
                            <Award className="h-4 w-4" />
                          </Button>
                        )}
                        <EmployeePacketExportButton
                          organizationId={organizationId}
                          employeeUserId={employee.user_id}
                          employeeName={`${employee.first_name} ${employee.last_name}`}
                          size="icon"
                          variant="ghost"
                          showLabel={false}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Profile</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-sm mt-1">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm mt-1">{selectedEmployee.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="text-sm mt-1 capitalize">{selectedEmployee.role?.replace('_', ' ') || 'Student'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Progress</label>
                  <p className="text-sm mt-1">{selectedEmployee.progress_percentage || 0}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Tier</label>
                  <Badge variant="secondary" className="mt-1">
                    {selectedEmployee.current_tier || 'Green'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Certificate Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedEmployee)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Training Deadline</label>
                  <p className="text-sm mt-1">
                    {selectedEmployee.training_deadline 
                      ? format(new Date(selectedEmployee.training_deadline), 'MMMM dd, yyyy')
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                  <p className="text-sm mt-1">
                    {selectedEmployee.last_login 
                      ? format(new Date(selectedEmployee.last_login), 'MMMM dd, yyyy')
                      : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleSendReminder(selectedEmployee)}
                  disabled={isSendingReminder}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                {selectedEmployee.certificate_status === 'valid' && (
                  <Button
                    variant="outline"
                    onClick={() => handleViewCertificate(selectedEmployee)}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    View Certificate
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deadline Dialog */}
      <Dialog open={showDeadlineDialog} onOpenChange={setShowDeadlineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Training Deadline</DialogTitle>
            <DialogDescription>
              Set a deadline for {selectedEmployee?.first_name} {selectedEmployee?.last_name} to complete training
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Deadline Date</label>
              <Input
                type="date"
                value={selectedDeadline ? format(selectedDeadline, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDeadline(e.target.value ? new Date(e.target.value) : undefined)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeadlineDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDeadline} disabled={!selectedDeadline}>
                Save Deadline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
