import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Users, BarChart3, GraduationCap, Eye } from 'lucide-react';

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    path: '/admin-dashboard',
    icon: Shield,
  },
  dispensary_manager: {
    label: 'Manager',
    path: '/dispensary-manager-dashboard',
    icon: Users,
  },
  training_coordinator: {
    label: 'Coordinator',
    path: '/training-coordinator-dashboard',
    icon: BarChart3,
  },
  student: {
    label: 'Student',
    path: '/student-dashboard',
    icon: GraduationCap,
  },
  mca_inspector: {
    label: 'MCA Inspector',
    path: '/mca-compliance-review',
    icon: Eye,
  },
};

export const RoleSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { managementRoles, hasMultipleManagementRoles } = useUserRole();
  const [selectedRole, setSelectedRole] = React.useState<string>(() => {
    return sessionStorage.getItem('selected_role_view') || managementRoles[0] || '';
  });

  if (!hasMultipleManagementRoles || managementRoles.length < 2) {
    return null;
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    sessionStorage.setItem('selected_role_view', role);
    const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
    if (config) {
      navigate(config.path);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground hidden md:inline">View as:</span>
      <Select value={selectedRole} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-[140px] md:w-[160px] h-9">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {managementRoles.map((role) => {
            const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
            const Icon = config?.icon || Shield;
            return (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{config?.label || role}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
