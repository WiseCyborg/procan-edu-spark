import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Building2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Tables']['user_roles']['Row']['role'];

interface Organization {
  id: string;
  name: string;
  license_number: string | null;
}

interface AdminUserAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    organization_name: string | null;
    roles: string[];
  } | null;
  onAssigned?: () => void;
}

const AVAILABLE_ROLES = [
  { value: 'student', label: 'Student', description: 'Standard learner access' },
  { value: 'training_coordinator', label: 'Training Coordinator', description: 'Can manage employee training' },
  { value: 'dispensary_manager', label: 'Dispensary Manager', description: 'Full organization access' },
  { value: 'admin', label: 'Admin', description: 'System-wide access' },
];

export function AdminUserAssignmentDialog({
  open,
  onOpenChange,
  user,
  onAssigned,
}: AdminUserAssignmentDialogProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetchingOrgs, setFetchingOrgs] = useState(true);

  useEffect(() => {
    if (open) {
      fetchOrganizations();
      // Pre-select current roles
      if (user?.roles) {
        setSelectedRoles(new Set(user.roles));
      }
    }
  }, [open, user]);

  const fetchOrganizations = async () => {
    setFetchingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, license_number')
        .order('name');

      if (error) throw error;
      setOrganizations((data || []) as Organization[]);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setFetchingOrgs(false);
    }
  };

  const handleAssign = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Update organization assignment
      if (selectedOrgId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            organization_id: selectedOrgId === 'none' ? null : selectedOrgId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.user_id);

        if (profileError) throw profileError;
      }

      // Handle role changes
      const currentRoles = new Set(user.roles);
      const rolesToAdd = Array.from(selectedRoles).filter(r => !currentRoles.has(r));
      const rolesToRemove = Array.from(currentRoles).filter(r => !selectedRoles.has(r));

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('user_roles')
          .insert(rolesToAdd.map(role => ({
            user_id: user.user_id,
            role: role as AppRole,
          })));

        if (addError && !addError.message.includes('duplicate')) {
          throw addError;
        }
      }

      // Remove old roles
      if (rolesToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id)
          .in('role', rolesToRemove as AppRole[]);

        if (removeError) throw removeError;
      }

      toast.success('User assignment updated', {
        description: `${user.first_name} ${user.last_name}'s organization and roles have been updated`,
      });

      onOpenChange(false);
      onAssigned?.();
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    const newRoles = new Set(selectedRoles);
    if (newRoles.has(role)) {
      newRoles.delete(role);
    } else {
      newRoles.add(role);
    }
    setSelectedRoles(newRoles);
  };

  const handleClose = () => {
    setSelectedOrgId('');
    setSelectedRoles(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assign User to Organization
          </DialogTitle>
          <DialogDescription>
            Manage organization and role assignments for{' '}
            <span className="font-medium text-foreground">
              {user?.first_name} {user?.last_name}
            </span>
          </DialogDescription>
        </DialogHeader>

        {fetchingOrgs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Current assignment info */}
            {user?.organization_name && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Currently assigned to:{' '}
                  <span className="font-medium text-foreground">{user.organization_name}</span>
                </p>
              </div>
            )}

            {/* Organization Selection */}
            <div className="space-y-2">
              <Label>Assign to Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No organization</span>
                  </SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} {org.license_number ? `(${org.license_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                User Roles
              </Label>
              <div className="space-y-2">
                {AVAILABLE_ROLES.map((role) => (
                  <div
                    key={role.value}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={role.value}
                      checked={selectedRoles.has(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={role.value}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {role.label}
                      </label>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                    {user?.roles.includes(role.value) && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || fetchingOrgs}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
