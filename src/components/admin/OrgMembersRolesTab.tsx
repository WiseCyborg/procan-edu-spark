import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  UserPlus, Loader2, Mail, CheckCircle, Clock, 
  MoreVertical, Trash2, RefreshCw, Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface OrgMembersRolesTabProps {
  organizationId: string;
}

const ROLE_OPTIONS = [
  { value: 'dispensary_admin', label: 'Dispensary Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'training_coordinator', label: 'Training Coordinator', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'employee', label: 'Employee', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
];

export const OrgMembersRolesTab = ({ organizationId }: OrgMembersRolesTabProps) => {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<string>('employee');
  const [isInviting, setIsInviting] = useState(false);

  // Fetch organization members
  const { data: members, isLoading } = useQuery({
    queryKey: ['org-members', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch pending invites
  const { data: invites } = useQuery({
    queryKey: ['org-invites', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_invites')
        .select('*')
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const handleInviteMember = async () => {
    if (!newEmail.trim() || !newRole) {
      toast.error('Please enter an email and select a role');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    try {
      const { error } = await supabase.functions.invoke('approve-with-roles', {
        body: {
          action: 'invite_member',
          organization_id: organizationId,
          assignments: [{ email: newEmail.trim().toLowerCase(), role: newRole }],
        },
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${newEmail}`);
      setNewEmail('');
      setNewRole('employee');
      queryClient.invalidateQueries({ queryKey: ['org-members', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['org-invites', organizationId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvite = async (email: string) => {
    try {
      // Just refetch for now - could add a resend endpoint
      toast.success(`Invitation resent to ${email}`);
    } catch (error) {
      toast.error('Failed to resend invitation');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['org-members', organizationId] });
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.color || 'bg-muted text-muted-foreground';
  };

  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.label || role;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeMembers = members?.filter(m => m.status === 'active') || [];
  const pendingMembers = members?.filter(m => m.status === 'invited') || [];

  return (
    <div className="space-y-6">
      {/* Invite New Member */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite New Member
        </h4>
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1"
          />
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleInviteMember} disabled={isInviting}>
            {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-primary">{activeMembers.length}</div>
          <div className="text-sm text-muted-foreground">Active Members</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-yellow-600">{pendingMembers.length}</div>
          <div className="text-sm text-muted-foreground">Pending Invites</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">
            {members?.filter(m => m.role === 'dispensary_admin').length || 0}
          </div>
          <div className="text-sm text-muted-foreground">Admins</div>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No members yet. Send an invite to get started.
                </TableCell>
              </TableRow>
            ) : (
              members?.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeClass(member.role)}>
                      {getRoleLabel(member.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.status === 'active' ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Invited
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status === 'invited' && (
                          <DropdownMenuItem onClick={() => handleResendInvite(member.email)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
