import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle2, Clock, CreditCard, UserCheck, Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type LockReason = 
  | 'prerequisite' 
  | 'payment' 
  | 'enrollment' 
  | 'date' 
  | 'quiz_required'
  | 'org_seat'
  | 'profile_incomplete';

interface ModuleLockExplainerProps {
  reason: LockReason;
  moduleNumber: number;
  moduleTitle?: string;
  prerequisiteModule?: number;
  prerequisiteTitle?: string;
  unlockDate?: string;
  requiredQuizModule?: number;
  onAction?: () => void;
  className?: string;
}

interface LockConfig {
  icon: React.ElementType;
  title: string;
  getMessage: (props: ModuleLockExplainerProps) => string;
  actionLabel: string;
  getActionRoute: (props: ModuleLockExplainerProps) => string;
  iconColor: string;
  bgColor: string;
}

const lockConfigs: Record<LockReason, LockConfig> = {
  prerequisite: {
    icon: Lock,
    title: 'Complete Previous Module First',
    getMessage: (props) => 
      `You need to complete Module ${props.prerequisiteModule}${props.prerequisiteTitle ? ` (${props.prerequisiteTitle})` : ''} before accessing this module.`,
    actionLabel: 'Go to Module',
    getActionRoute: (props) => `/course/part${props.prerequisiteModule}`,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  },
  payment: {
    icon: CreditCard,
    title: 'Payment Required',
    getMessage: () => 'This module requires payment or an organization seat to access.',
    actionLabel: 'View Options',
    getActionRoute: () => '/payment',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  },
  enrollment: {
    icon: UserCheck,
    title: 'Enrollment Required',
    getMessage: () => 'You need to enroll in this course before accessing modules.',
    actionLabel: 'Enroll Now',
    getActionRoute: () => '/auth?tab=code',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  },
  date: {
    icon: Calendar,
    title: 'Coming Soon',
    getMessage: (props) => 
      props.unlockDate 
        ? `This module unlocks on ${new Date(props.unlockDate).toLocaleDateString()}.`
        : 'This module is not yet available.',
    actionLabel: 'View Schedule',
    getActionRoute: () => '/course',
    iconColor: 'text-slate-600',
    bgColor: 'bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800',
  },
  quiz_required: {
    icon: CheckCircle2,
    title: 'Pass Quiz First',
    getMessage: (props) => 
      `You need to pass the quiz in Module ${props.requiredQuizModule} before continuing.`,
    actionLabel: 'Take Quiz',
    getActionRoute: (props) => `/course/part${props.requiredQuizModule}?tab=quiz`,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
  },
  org_seat: {
    icon: AlertCircle,
    title: 'Organization Seat Required',
    getMessage: () => 'Your organization needs to assign you a training seat.',
    actionLabel: 'Contact Manager',
    getActionRoute: () => '/auth?tab=code',
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
  },
  profile_incomplete: {
    icon: UserCheck,
    title: 'Complete Your Profile',
    getMessage: () => 'Please complete your profile information to continue training.',
    actionLabel: 'Complete Profile',
    getActionRoute: () => '/profile',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  },
};

export const ModuleLockExplainer: React.FC<ModuleLockExplainerProps> = (props) => {
  const navigate = useNavigate();
  const { reason, moduleNumber, moduleTitle, onAction, className = '' } = props;
  
  const config = lockConfigs[reason];
  if (!config) return null;
  
  const Icon = config.icon;
  const message = config.getMessage(props);
  const actionRoute = config.getActionRoute(props);

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      navigate(actionRoute);
    }
  };

  return (
    <Card className={`${config.bgColor} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full bg-background/80 ${config.iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Module {moduleNumber} {moduleTitle ? `• ${moduleTitle}` : ''}
              </span>
            </div>
            
            <h4 className="font-semibold text-foreground mb-1">
              {config.title}
            </h4>
            
            <p className="text-sm text-muted-foreground mb-3">
              {message}
            </p>
            
            <Button 
              size="sm" 
              onClick={handleAction}
              variant="outline"
              className="bg-background hover:bg-accent"
            >
              {config.actionLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleLockExplainer;
