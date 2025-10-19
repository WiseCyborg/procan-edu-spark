import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/hooks/useUserRole';
import { Shield, Users, GraduationCap, Crown } from 'lucide-react';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; className: string }> = {
  student: {
    label: 'Student',
    icon: GraduationCap,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
  },
  training_coordinator: {
    label: 'Training Coordinator',
    icon: Users,
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
  },
  dispensary_manager: {
    label: 'Dispensary Manager',
    icon: Shield,
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
  },
  admin: {
    label: 'Admin',
    icon: Crown,
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
  }
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className }) => {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} ${className || ''}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

interface RoleBadgesProps {
  roles: UserRole[];
  className?: string;
}

export const RoleBadges: React.FC<RoleBadgesProps> = ({ roles, className }) => {
  if (roles.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {roles.map(role => (
        <RoleBadge key={role} role={role} />
      ))}
    </div>
  );
};
