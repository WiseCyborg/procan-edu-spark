import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, CreditCard, UserPlus, Calendar, BookOpen, ArrowRight } from 'lucide-react';

export type LockReason = 'prerequisite' | 'payment' | 'enrollment' | 'date' | 'quiz_required';

interface LockedModuleCardProps {
  reason: LockReason;
  moduleTitle?: string;
  prerequisiteModule?: {
    number: number;
    title: string;
  };
  unlockDate?: Date;
  courseId?: string;
  onAction?: () => void;
}

const lockReasonConfig: Record<LockReason, {
  icon: typeof Lock;
  title: string;
  getMessage: (props: LockedModuleCardProps) => string;
  actionLabel: string;
  getRoute: (props: LockedModuleCardProps) => string;
}> = {
  prerequisite: {
    icon: BookOpen,
    title: 'Complete Previous Module',
    getMessage: (props) => 
      props.prerequisiteModule 
        ? `You need to complete Module ${props.prerequisiteModule.number}: "${props.prerequisiteModule.title}" before accessing this content.`
        : 'You need to complete the previous module first.',
    actionLabel: 'Go to Previous Module',
    getRoute: (props) => props.prerequisiteModule 
      ? `/course/part${props.prerequisiteModule.number}` 
      : '/course',
  },
  payment: {
    icon: CreditCard,
    title: 'Payment Required',
    getMessage: () => 'This module requires a valid payment to access. Complete your purchase to continue learning.',
    actionLabel: 'Complete Payment',
    getRoute: (props) => props.courseId ? `/checkout/${props.courseId}` : '/pricing',
  },
  enrollment: {
    icon: UserPlus,
    title: 'Enrollment Required',
    getMessage: () => 'You need to be enrolled in this course to access this module. Use your organization\'s join code to enroll.',
    actionLabel: 'Enter Join Code',
    getRoute: () => '/join',
  },
  date: {
    icon: Calendar,
    title: 'Not Yet Available',
    getMessage: (props) => 
      props.unlockDate 
        ? `This module will be available on ${props.unlockDate.toLocaleDateString()}.`
        : 'This module is not yet available.',
    actionLabel: 'View Course Dashboard',
    getRoute: () => '/course',
  },
  quiz_required: {
    icon: BookOpen,
    title: 'Quiz Completion Required',
    getMessage: (props) => 
      props.prerequisiteModule
        ? `Pass the quiz in Module ${props.prerequisiteModule.number} to unlock this content.`
        : 'Complete the previous quiz to continue.',
    actionLabel: 'Take Quiz',
    getRoute: (props) => props.prerequisiteModule 
      ? `/course/part${props.prerequisiteModule.number}?tab=quiz` 
      : '/course',
  },
};

export const LockedModuleCard = ({ 
  reason, 
  moduleTitle,
  prerequisiteModule,
  unlockDate,
  courseId,
  onAction 
}: LockedModuleCardProps) => {
  const navigate = useNavigate();
  const config = lockReasonConfig[reason];
  const Icon = config.icon;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      const route = config.getRoute({ reason, prerequisiteModule, unlockDate, courseId });
      navigate(route);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
              {moduleTitle ? `${moduleTitle} - Locked` : 'Module Locked'}
            </CardTitle>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              {config.title}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-white/60 dark:bg-background/40 rounded-lg">
          <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {config.getMessage({ reason, prerequisiteModule, unlockDate, courseId })}
          </p>
        </div>
        
        <Button 
          onClick={handleAction}
          className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
        >
          {config.actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
