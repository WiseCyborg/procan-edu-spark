import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Search, Calendar, Mail, Download, 
  CheckCircle, AlertCircle, Clock, Loader2, Filter 
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EmployeeRosterWidgetProps {
  organizationId: string;
}

export const EmployeeRosterWidget = ({ organizationId }: EmployeeRosterWidgetProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ['organization-employees', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_organization_employees', {
        org_id: organizationId
      });
      if (error) throw error;
      return data;
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
