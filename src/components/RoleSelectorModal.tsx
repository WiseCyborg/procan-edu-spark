import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Award, UserCog, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RoleSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();

  const roles = [
    {
      icon: Award,
      title: "I'm Ready to Get Certified",
      description: 'For individual students seeking Maryland RVT certification',
      path: '/auth?role=student',
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      icon: UserCog,
      title: 'I Manage a Team',
      description: 'For training coordinators tracking team progress',
      path: '/auth?role=training_coordinator',
      gradient: 'from-blue-500 to-cyan-600',
    },
    {
      icon: Building2,
      title: 'I Own/Operate a Dispensary',
      description: 'For business owners seeking compliance solutions',
      path: '/org/apply',
      gradient: 'from-purple-500 to-indigo-600',
    },
  ];

  const handleRoleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Welcome! Tell us about yourself:
          </DialogTitle>
          <DialogDescription className="text-center">
            Choose the option that best describes your role
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 group"
                onClick={() => handleRoleSelect(role.path)}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${role.gradient} flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {role.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
