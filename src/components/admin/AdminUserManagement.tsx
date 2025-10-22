import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Shield, Trash2, Plus, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { SensitiveOperationWrapper } from '@/components/auth/SensitiveOperationWrapper';
import { EnhancedProfileEditor } from './EnhancedProfileEditor';

interface UserWithRoles {
  user_id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  roles: string[];
}

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('');
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  const fetchUsersWithRoles = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_with_roles');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeAddRole = async () => {
    if (!selectedUser || !newRole) return;

    try {
      const { data, error } = await supabase.rpc('manage_user_role', {
        target_user_id: selectedUser,
        new_role: newRole as 'student' | 'dispensary_manager' | 'admin',
        action: 'add'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role added successfully",
      });

      fetchUsersWithRoles();
      setShowAddRole(false);
      setSelectedUser('');
      setNewRole('');
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: "Error",
        description: "Failed to add role",
        variant: "destructive",
      });
    }
  };

  const executeRemoveRole = async (userId: string, role: string) => {
    try {
      const { data, error } = await supabase.rpc('manage_user_role', {
        target_user_id: userId,
        new_role: role as 'student' | 'dispensary_manager' | 'admin',
        action: 'remove'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role removed successfully",
      });

      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'dispensary_manager':
        return 'default';
      case 'student':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading users...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <Dialog open={showAddRole} onOpenChange={setShowAddRole}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Role to User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Select Role</label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="dispensary_manager">Dispensary Manager</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SensitiveOperationWrapper
                  operation="user_role_management"
                  operationDescription="Adding administrative roles to users"
                  onExecute={executeAddRole}
                  urgency="high"
                  className="w-full"
                >
                  Add Role
                </SensitiveOperationWrapper>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map((role) => (
                      <Badge
                        key={role}
                        variant={getRoleBadgeVariant(role)}
                        className="text-xs"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUserId(user.user_id)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {user.roles.map((role) => (
                      <SensitiveOperationWrapper
                        key={role}
                        operation="user_role_management"
                        operationDescription={`Removing ${role} role from ${user.first_name} ${user.last_name}`}
                        onExecute={() => executeRemoveRole(user.user_id, role)}
                        urgency={role === 'admin' ? 'high' : 'medium'}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove {role}
                      </SensitiveOperationWrapper>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Profile Editor Dialog */}
      {editingUserId && (
        <EnhancedProfileEditor
          userId={editingUserId}
          open={!!editingUserId}
          onClose={() => setEditingUserId(null)}
          onSaved={() => {
            fetchUsersWithRoles();
            setEditingUserId(null);
          }}
        />
      )}
    </Card>
  );
};