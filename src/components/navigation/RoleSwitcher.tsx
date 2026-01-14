import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
    path: '/admin',
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
  const { user } = useAuth();
  const { managementRoles, hasMultipleManagementRoles } = useUserRole();
  const [selectedRole, setSelectedRole] = React.useState<string>(() => {
    return sessionStorage.getItem('selected_role_view') || managementRoles[0] || '';
  });

  if (!hasMultipleManagementRoles || managementRoles.length < 2) {
    return null;
  }

  const logRoleSwitch = async (fromRole: string, toRole: string) => {
    try {
      await supabase.from('security_audit_log').insert({
        user_id: user?.id,
        action_type: 'role_switch',
        table_name: 'role_simulation',
        old_values: { role: fromRole },
        new_values: { role: toRole },
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to log role switch:', error);
    }
  };

  const handleRoleChange = async (role: string) => {
    const previousRole = selectedRole;
    setSelectedRole(role);
    sessionStorage.setItem('selected_role_view', role);
    
    // Log the role switch for MCA audit compliance
    await logRoleSwitch(previousRole, role);
    
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
