import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, Users, Search, Eye, CreditCard, 
  CheckCircle, AlertCircle, Loader2, AlertTriangle, Copy
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
import { OrganizationActionsMenu } from './OrganizationActionsMenu';
import { OrganizationDetailDialog } from './OrganizationDetailDialog';

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

  // Calculate quick stats
  const stats = {
    totalOrgs: organizations?.length || 0,
    totalSeats: organizations?.reduce((acc, org) => acc + (org.total_seats || 0), 0) || 0,
    totalEmployees: organizations?.reduce((acc, org) => acc + (org.employee_count || 0), 0) || 0,
    totalCertified: organizations?.reduce((acc, org) => acc + (org.certified_count || 0), 0) || 0,
    unregisteredManagers: organizations?.filter(org => !org.manager_registered).length || 0,
  };

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

  const handleCopyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Join code copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrgs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Seats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSeats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Certified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalCertified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unregistered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unregisteredManagers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.unregisteredManagers > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.unregisteredManagers} manager(s) haven't completed registration yet. 
            Use the action menu to send reminders.
          </AlertDescription>
        </Alert>
      )}

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
                  <TableHead>Manager</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Join Code</TableHead>
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
                          License: {org.license_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm font-medium">{org.manager_name}</div>
                            <div className="text-xs text-muted-foreground">{org.manager_email}</div>
                          </div>
                          {!org.manager_registered && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              ⚠️ Not Registered
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {org.used_seats}/{org.total_seats} used
                            </Badge>
                          </div>
                          <div className="w-32 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${(org.used_seats / org.total_seats) * 100}%` }}
                            />
                          </div>
                          {org.available_seats === org.total_seats && org.total_seats > 0 && (
                            <div className="text-xs text-orange-600">⚠️ No seats used</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.join_code ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {org.join_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyJoinCode(org.join_code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No code</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {org.payment_status === 'approved' || org.payment_status === 'active' ? (
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrg(org.org_id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          <OrganizationActionsMenu 
                            organization={org}
                            onRefetch={refetch}
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
      </Card>

      {/* Organization Detail Dialog */}
      <OrganizationDetailDialog 
        organizationId={selectedOrg}
        onClose={() => setSelectedOrg(null)}
      />
    </div>
  );
};
