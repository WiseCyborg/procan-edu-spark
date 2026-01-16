import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Lock, BookOpen, ClipboardCheck, Award, ChevronRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStepsPanelProps {
  completedModules: number;
  totalModules: number;
  hasPassedExam: boolean;
  hasCertificate: boolean;
  onResumeTraining: () => void;
  onViewModules: () => void;
  onTakeExam: () => void;
  onViewCertificate: () => void;
  isLoading?: boolean;
  className?: string;
}

type StepStatus = 'completed' | 'current' | 'locked';

interface Step {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  icon: React.ElementType;
  action?: () => void;
  actionLabel?: string;
  progress?: string;
}

export const ProgressStepsPanel: React.FC<ProgressStepsPanelProps> = ({
  completedModules,
  totalModules,
  hasPassedExam,
  hasCertificate,
  onResumeTraining,
  onViewModules,
  onTakeExam,
  onViewCertificate,
  isLoading = false,
  className = '',
}) => {
  // Determine step statuses
  const allModulesComplete = completedModules >= totalModules;
  
  const getModulesStatus = (): StepStatus => {
    if (allModulesComplete) return 'completed';
    return 'current';
  };
  
  const getExamStatus = (): StepStatus => {
    if (hasPassedExam) return 'completed';
    if (allModulesComplete) return 'current';
    return 'locked';
  };
  
  const getCertificateStatus = (): StepStatus => {
    if (hasCertificate) return 'completed';
    if (hasPassedExam) return 'current';
    return 'locked';
  };

  const steps: Step[] = [
    {
      id: 'modules',
      label: 'Step 1: Complete Modules',
      description: allModulesComplete 
        ? 'All modules completed!' 
        : `${completedModules} of ${totalModules} modules complete`,
      status: getModulesStatus(),
      icon: BookOpen,
      action: allModulesComplete ? onViewModules : onResumeTraining,
      actionLabel: allModulesComplete ? 'Review Modules' : 'Resume Training',
      progress: `${completedModules}/${totalModules}`,
    },
    {
      id: 'exam',
      label: 'Step 2: Pass Final Exam',
      description: hasPassedExam 
        ? 'Exam passed with 80%+!' 
        : allModulesComplete 
          ? 'Ready to take exam' 
          : 'Complete all modules first',
      status: getExamStatus(),
      icon: ClipboardCheck,
      action: allModulesComplete && !hasPassedExam ? onTakeExam : undefined,
      actionLabel: hasPassedExam ? 'Passed ✓' : 'Take Exam',
    },
    {
      id: 'certificate',
      label: 'Step 3: Get Certificate',
      description: hasCertificate 
        ? 'Certificate issued!' 
        : hasPassedExam 
          ? 'Generate your certificate' 
          : 'Pass exam to unlock',
      status: getCertificateStatus(),
      icon: Award,
      action: hasPassedExam ? onViewCertificate : undefined,
      actionLabel: hasCertificate ? 'View Certificate' : 'Get Certificate',
    },
  ];

  const getStatusIcon = (status: StepStatus, Icon: React.ElementType) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'current':
        return <Icon className="h-6 w-6 text-primary" />;
      case 'locked':
        return <Lock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStepStyles = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800';
      case 'current':
        return 'border-primary/30 bg-primary/5 ring-2 ring-primary/20';
      case 'locked':
        return 'border-muted bg-muted/30 opacity-60';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Your Certification Journey
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg border transition-all',
              getStepStyles(step.status)
            )}
          >
            <div className="flex-shrink-0">
              {getStatusIcon(step.status, step.icon)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{step.label}</h4>
                {step.progress && step.status !== 'completed' && (
                  <Badge variant="secondary" className="text-xs">
                    {step.progress}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {step.description}
              </p>
            </div>

            {step.action && step.status !== 'locked' && (
              <Button
                size="sm"
                variant={step.status === 'current' ? 'default' : 'outline'}
                onClick={step.action}
                disabled={isLoading}
                className="flex-shrink-0"
              >
                {step.actionLabel}
                {step.status === 'current' && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ProgressStepsPanel;
