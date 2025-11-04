import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, BarChart3, Loader2 } from 'lucide-react';

const ROLE_CONFIG = {
  admin: {
    label: 'Admin Dashboard',
    path: '/enhanced-admin-dashboard',
    icon: Shield,
    description: 'System administration and oversight',
    color: 'border-destructive/20 hover:bg-destructive/5'
  },
  dispensary_manager: {
    label: 'Dispensary Manager',
    path: '/dispensary-manager-dashboard',
    icon: Users,
    description: 'Manage your team and training programs',
    color: 'border-primary/20 hover:bg-primary/5'
  },
  training_coordinator: {
    label: 'Training Coordinator',
    path: '/training-coordinator-dashboard',
    icon: BarChart3,
    description: 'Monitor and coordinate team training',
    color: 'border-accent/20 hover:bg-accent/5'
  }
};

export default function RoleSelectionDashboard() {
  const navigate = useNavigate();
  const { managementRoles, hasMultipleManagementRoles, isLoading } = useUserRole();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !hasMultipleManagementRoles) {
      if (managementRoles.length === 1) {
        const config = ROLE_CONFIG[managementRoles[0] as keyof typeof ROLE_CONFIG];
        navigate(config.path, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isLoading, hasMultipleManagementRoles, managementRoles, navigate]);

  const handleRoleSelect = (role: string) => {
    const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
    sessionStorage.setItem('selected_role_view', role);
    navigate(config.path);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome! Choose Your View</h1>
        <p className="text-muted-foreground">
          You have multiple management roles. Select how you'd like to proceed.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {managementRoles.map(role => {
          const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
          const Icon = config.icon;
          
          return (
            <Card 
              key={role}
              className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                selectedRole === role ? 'ring-2 ring-primary' : ''
              } ${config.color}`}
              onClick={() => handleRoleSelect(role)}
            >
              <CardHeader>
                <Icon className="w-12 h-12 mb-4" />
                <CardTitle className="text-lg">{config.label}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant={selectedRole === role ? 'default' : 'outline'}
                >
                  Enter Dashboard
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          You can switch between roles anytime from the header menu.
        </p>
      </div>
    </div>
  );
}
