import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Users, Building2, X, Loader2 } from 'lucide-react';
import { useCreateRoleRequest, useHasPendingRequest } from '@/hooks/useRoleRequests';
import { useNavigate } from 'react-router-dom';
import type { MemberType } from '@/hooks/useOrganizationMembership';

interface RoleOption {
  id: string;
  memberType: MemberType;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  requiresApproval: boolean;
  path: string;
}

const roleOptions: RoleOption[] = [
  {
    id: 'student',
    memberType: 'employee',
    title: "I'm Ready to Get Certified",
    description: 'For individual students seeking Maryland RVT certification',
    icon: Award,
    iconBgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    requiresApproval: false,
    path: '/auth?role=student',
  },
  {
    id: 'coordinator',
    memberType: 'coordinator',
    title: 'I Manage a Team',
    description: 'For training coordinators tracking team progress',
    icon: Users,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    requiresApproval: true,
    path: '/auth?role=dispensary_manager&tab=accesskey',
  },
  {
    id: 'owner',
    memberType: 'owner',
    title: 'I Own/Operate a Dispensary',
    description: 'For business owners seeking compliance solutions',
    icon: Building2,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    requiresApproval: true,
    path: '/auth?role=dispensary_manager&tab=accesskey',
  },
];

interface RoleIntentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleSelected?: (memberType: MemberType) => void;
}

export const RoleIntentSelector: React.FC<RoleIntentSelectorProps> = ({
  open,
  onOpenChange,
  onRoleSelected,
}) => {
  const navigate = useNavigate();
  const createRequest = useCreateRoleRequest();
  
  const { hasPending: hasCoordinatorPending } = useHasPendingRequest('coordinator');
  const { hasPending: hasOwnerPending } = useHasPendingRequest('owner');

  if (!open) return null;

  const handleRoleSelect = async (option: RoleOption) => {
    // For employees, go straight to student registration
    if (!option.requiresApproval) {
      onOpenChange(false);
      navigate(option.path);
      onRoleSelected?.(option.memberType);
      return;
    }

    // For elevated roles, navigate to the appropriate auth flow
    // The approval request will be created after they register/login
    onOpenChange(false);
    navigate(option.path);
    onRoleSelected?.(option.memberType);
  };

  const isPending = (memberType: MemberType) => {
    if (memberType === 'coordinator') return hasCoordinatorPending;
    if (memberType === 'owner') return hasOwnerPending;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full p-6 relative">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Welcome! Tell us about yourself:
          </h2>
          <p className="text-muted-foreground mt-2">
            Choose the option that best describes your role
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roleOptions.map((option) => {
            const Icon = option.icon;
            const pending = isPending(option.memberType);

            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                  pending ? 'opacity-60' : ''
                }`}
                onClick={() => !pending && handleRoleSelect(option)}
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-14 h-14 rounded-full ${option.iconBgColor} flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon className={`h-7 w-7 ${option.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {option.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                  {pending && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center justify-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Request pending
                    </p>
                  )}
                  {option.requiresApproval && !pending && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Requires verification
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Not sure? Start with "Get Certified" – you can request elevated access later.
        </p>
      </div>
    </div>
  );
};

export default RoleIntentSelector;
