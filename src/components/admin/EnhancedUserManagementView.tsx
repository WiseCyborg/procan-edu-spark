import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SensitiveOperationWrapper } from '@/components/auth/SensitiveOperationWrapper';
import { Search, CheckCircle, XCircle, Mail, Shield, Users, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface User {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  email_verified: boolean;
  created_at: string;
  roles: string[];
  organization_name: string | null;
}

export const EnhancedUserManagementView = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, verificationFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with their profiles, roles, and email verification status
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          organization_id,
          organizations:organization_id (name)
        `);

      if (profilesError) throw profilesError;

      // Get emails and verification status from profiles/auth metadata
      // Note: We can't directly access auth.users from client, so we'll get what we can
      const userIds = profiles?.map(p => p.user_id) || [];
      
      // Fetch auth metadata we have access to
      const authPromises = userIds.map(async (userId) => {
        const { data: { user } } = await supabase.auth.admin.getUserById(userId);
        return user;
      });
      
      const authUsers = await Promise.all(authPromises);

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const combinedUsers = profiles?.map(profile => {
        const authUser = authUsers?.find(u => u.id === profile.user_id);
        const userRoles = roles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
        const orgName = Array.isArray(profile.organizations) 
          ? profile.organizations[0]?.name || null
          : (profile.organizations as any)?.name || null;
        
        return {
          user_id: profile.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser?.email || '',
          email_verified: !!authUser?.email_confirmed_at,
          created_at: authUser?.created_at || '',
          roles: userRoles,
          organization_name: orgName,
        };
      }) || [];

      setUsers(combinedUsers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(query) ||
        user.first_name?.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.organization_name?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.roles.includes(roleFilter));
    }

    // Verification filter
    if (verificationFilter === 'verified') {
      filtered = filtered.filter(user => user.email_verified);
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(user => !user.email_verified);
    }

    setFilteredUsers(filtered);
  };

  const handleManualVerify = async (userId: string, userName: string) => {
    try {
      const { data, error } = await supabase.rpc('manually_verify_user', {
        target_user_id: userId,
        admin_notes: `Manually verified by admin for ${userName}`
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${userName} has been manually verified.`,
      });

      // Refresh users
      fetchUsers();
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkVerify = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select users to verify.",
        variant: "destructive",
      });
      return;
    }

    try {
      const userIds = Array.from(selectedUsers);
      const { data, error } = await supabase.rpc('bulk_verify_users', {
        target_user_ids: userIds,
        admin_notes: `Bulk verification of ${userIds.length} users`
      }) as { data: any; error: any };

      if (error) throw error;

      const result = data as { success: boolean; verified_count: number };
      toast({
        title: "Success",
        description: `${result.verified_count} users verified successfully.`,
      });

      // Clear selection and refresh
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Verification email sent successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const unverifiedCount = users.filter(u => !u.email_verified).length;
  const selectedUnverifiedUsers = Array.from(selectedUsers).filter(userId => {
    const user = users.find(u => u.user_id === userId);
    return user && !user.email_verified;
  });

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unverifiedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedUsers.size}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <SensitiveOperationWrapper
              operation="bulk_verify_users"
              operationDescription="Verify multiple users at once"
              onExecute={handleBulkVerify}
              variant="default"
              size="sm"
              disabled={selectedUnverifiedUsers.length === 0}
              className="w-full"
            >
              Verify Selected ({selectedUnverifiedUsers.length})
            </SensitiveOperationWrapper>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Search, filter, and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="dispensary_manager">Dispensary Manager</SelectItem>
                <SelectItem value="training_coordinator">Training Coordinator</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>

            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No users found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers(new Set(filteredUsers.map(u => u.user_id)));
                        } else {
                          setSelectedUsers(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.user_id)}
                        onCheckedChange={() => toggleUserSelection(user.user_id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.email_verified ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.organization_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Manage {selectedUser?.first_name} {selectedUser?.last_name}'s account
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Verification Status</label>
                  <p className="text-sm">
                    {selectedUser.email_verified ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Unverified
                      </Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Roles</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedUser.roles.map(role => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Organization</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.organization_name || 'None'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedUser.created_at), 'PPP')}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {!selectedUser.email_verified && (
                    <SensitiveOperationWrapper
                      operation="manual_verify_user"
                      operationDescription={`Manually verify ${selectedUser.first_name} ${selectedUser.last_name}`}
                      onExecute={() => handleManualVerify(selectedUser.user_id, `${selectedUser.first_name} ${selectedUser.last_name}`)}
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Manually Verify
                    </SensitiveOperationWrapper>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => handleSendVerificationEmail(selectedUser.email)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
