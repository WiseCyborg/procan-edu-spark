import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ShoppingBag, 
  Shield, 
  ClipboardList, 
  Settings, 
  Users, 
  Building2,
  GraduationCap,
  CheckCircle
} from 'lucide-react';

export type JobRoleType = 'budtender' | 'security' | 'intake' | 'operations' | 'manager' | 'owner' | 'trainer';

interface JobRoleOption {
  value: JobRoleType;
  label: string;
  description: string;
  icon: React.ElementType;
  requiredModules: string;
}

const jobRoles: JobRoleOption[] = [
  {
    value: 'budtender',
    label: 'Budtender / Patient Consultant',
    description: 'Direct customer/patient interaction, product recommendations, sales',
    icon: ShoppingBag,
    requiredModules: 'Full 24-module curriculum',
  },
  {
    value: 'security',
    label: 'Security',
    description: 'Facility security, access control, incident response',
    icon: Shield,
    requiredModules: 'Security-focused modules + compliance basics',
  },
  {
    value: 'intake',
    label: 'Intake / Reception',
    description: 'Patient check-in, ID verification, registration',
    icon: ClipboardList,
    requiredModules: 'ID verification + compliance modules',
  },
  {
    value: 'operations',
    label: 'Operations / Inventory',
    description: 'Inventory management, receiving, compliance documentation',
    icon: Settings,
    requiredModules: 'Inventory + diversion prevention modules',
  },
  {
    value: 'manager',
    label: 'Manager / Supervisor',
    description: 'Team supervision, compliance oversight, training coordination',
    icon: Users,
    requiredModules: 'Full curriculum + manager-only modules',
  },
  {
    value: 'owner',
    label: 'Owner / License Holder',
    description: 'Business ownership, regulatory responsibility',
    icon: Building2,
    requiredModules: 'Full curriculum + manager-only modules',
  },
  {
    value: 'trainer',
    label: 'Trainer / Educator',
    description: 'Internal training delivery, curriculum support',
    icon: GraduationCap,
    requiredModules: 'Full curriculum + trainer certification',
  },
];

interface JobRoleSelectorProps {
  currentRole?: JobRoleType | null;
  onRoleSelected?: (role: JobRoleType) => void;
  showSubmitButton?: boolean;
  compact?: boolean;
}

export const JobRoleSelector: React.FC<JobRoleSelectorProps> = ({
  currentRole,
  onRoleSelected,
  showSubmitButton = true,
  compact = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<JobRoleType | null>(currentRole || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = (value: string) => {
    setSelectedRole(value as JobRoleType);
    if (!showSubmitButton) {
      onRoleSelected?.(value as JobRoleType);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedRole) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ job_role: selectedRole })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: `Your job role has been set to ${jobRoles.find(r => r.value === selectedRole)?.label}`,
      });
      onRoleSelected?.(selectedRole);
    } catch (error: any) {
      console.error('Error updating job role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update job role',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <RadioGroup value={selectedRole || ''} onValueChange={handleRoleChange}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobRoles.map((role) => {
              const Icon = role.icon;
              return (
                <div key={role.value} className="relative">
                  <RadioGroupItem
                    value={role.value}
                    id={role.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={role.value}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{role.label}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>
        {showSubmitButton && (
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Saving...' : 'Save Job Role'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Select Your Job Role
        </CardTitle>
        <CardDescription>
          Your job role determines which training modules are prioritized for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={selectedRole || ''} onValueChange={handleRoleChange}>
          <div className="space-y-3">
            {jobRoles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.value;
              return (
                <div key={role.value} className="relative">
                  <RadioGroupItem
                    value={role.value}
                    id={role.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={role.value}
                    className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors
                      hover:bg-accent/50
                      ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}
                    `}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{role.label}</span>
                        {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {role.requiredModules}
                      </Badge>
                    </div>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>

        {showSubmitButton && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={!selectedRole || isSubmitting}
              size="lg"
            >
              {isSubmitting ? 'Saving...' : 'Confirm Job Role'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
