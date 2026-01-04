import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, UserPlus } from 'lucide-react';

export interface RoleAssignment {
  email: string;
  role: 'dispensary_admin' | 'training_coordinator' | 'employee';
}

interface RoleAssignmentSectionProps {
  defaultEmail?: string;
  assignments: RoleAssignment[];
  onAssignmentsChange: (assignments: RoleAssignment[]) => void;
  disabled?: boolean;
}

const ROLE_OPTIONS = [
  { value: 'dispensary_admin', label: 'Dispensary Admin', description: 'Full org management' },
  { value: 'training_coordinator', label: 'Training Coordinator', description: 'Manages employee training' },
  { value: 'employee', label: 'Employee', description: 'Takes training courses' },
] as const;

export function RoleAssignmentSection({
  defaultEmail,
  assignments,
  onAssignmentsChange,
  disabled = false,
}: RoleAssignmentSectionProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<RoleAssignment['role']>('employee');

  const addAssignment = () => {
    if (!newEmail.trim()) return;
    
    // Check for duplicate
    const exists = assignments.some(
      a => a.email.toLowerCase() === newEmail.toLowerCase() && a.role === newRole
    );
    
    if (exists) {
      return;
    }

    onAssignmentsChange([...assignments, { email: newEmail.trim(), role: newRole }]);
    setNewEmail('');
    setNewRole('employee');
  };

  const removeAssignment = (index: number) => {
    onAssignmentsChange(assignments.filter((_, i) => i !== index));
  };

  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.label || role;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'dispensary_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'training_coordinator':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'employee':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Assign Roles (Optional)</Label>
      </div>

      <p className="text-xs text-muted-foreground">
        Pre-assign roles to team members. They'll receive invite emails with registration links.
      </p>

      {/* Current assignments */}
      {assignments.length > 0 && (
        <div className="space-y-2">
          {assignments.map((assignment, index) => (
            <div
              key={`${assignment.email}-${assignment.role}`}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{assignment.email}</span>
                <Badge variant="outline" className={getRoleBadgeColor(assignment.role)}>
                  {getRoleLabel(assignment.role)}
                </Badge>
                {assignment.email.toLowerCase() === defaultEmail?.toLowerCase() && (
                  <Badge variant="secondary" className="text-xs">Primary Contact</Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAssignment(index)}
                disabled={disabled}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new assignment */}
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="email@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          disabled={disabled}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addAssignment();
            }
          }}
        />
        <Select
          value={newRole}
          onValueChange={(value) => setNewRole(value as RoleAssignment['role'])}
          disabled={disabled}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addAssignment}
          disabled={disabled || !newEmail.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick add primary contact as admin */}
      {defaultEmail && !assignments.some(a => a.email.toLowerCase() === defaultEmail.toLowerCase() && a.role === 'dispensary_admin') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onAssignmentsChange([
              { email: defaultEmail, role: 'dispensary_admin' },
              ...assignments.filter(a => a.email.toLowerCase() !== defaultEmail.toLowerCase())
            ]);
          }}
          disabled={disabled}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add primary contact as Dispensary Admin
        </Button>
      )}
    </div>
  );
}
