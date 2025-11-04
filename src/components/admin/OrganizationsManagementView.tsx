import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Users, Search, Eye, CreditCard, 
  CheckCircle, AlertCircle, Loader2 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

export const OrganizationsManagementView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: organizations, isLoading, refetch } = useQuery({
    queryKey: ['approved-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_approved_organizations' as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: orgEmployees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['org-employees', selectedOrg],
    queryFn: async () => {
      if (!selectedOrg) return null;
      const { data, error } = await supabase.rpc('get_organization_employees' as any, {
        org_id: selectedOrg
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedOrg,
  });

  const filteredOrgs = organizations?.filter((org: any) => {
    const matchesSearch = 
      org.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.license_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.dispensary_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      org.payment_status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Organizations</h2>
          <p className="text-sm text-muted-foreground">
            {organizations?.length || 0} approved dispensaries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('active')}
          >
            Active
          </Button>
          <Button
            variant={filterStatus === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, license #, or dispensary #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Approved Organizations
          </CardTitle>
          <CardDescription>
            View and manage all approved dispensary organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>License Info</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No organizations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrgs?.map((org: any) => (
                    <TableRow key={org.org_id}>
                      <TableCell>
                        <div className="font-medium">{org.organization_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Dispensary #{org.dispensary_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{org.license_number}</div>
                        <div className="text-xs text-muted-foreground">License</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{org.manager_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {org.manager_email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {org.used_seats}/{org.total_seats}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {org.available_seats} available
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.payment_status === 'active' ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {org.payment_status || 'Pending'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrg(org.org_id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Staff
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Organization Employees</DialogTitle>
            <DialogDescription>
              View all employees for this organization
            </DialogDescription>
          </DialogHeader>
          
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgEmployees?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No employees found
                        </TableCell>
                      </TableRow>
                    ) : (
                      orgEmployees?.map((employee: any) => (
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
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium">
                                {employee.progress_percentage || 0}%
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {employee.current_tier || 'Green'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {employee.certificate_status === 'valid' ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Certified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {employee.certificate_status || 'In Progress'}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
