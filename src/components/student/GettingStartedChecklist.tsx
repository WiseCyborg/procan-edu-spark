import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: string;
  route: string;
  estimatedMinutes?: number;
}

interface GettingStartedChecklistProps {
  profileComplete: boolean;
  hasWatchedWelcome: boolean;
  hasStartedCourse: boolean;
  hasPassedExam: boolean;
  hasCertificate: boolean;
}

export const GettingStartedChecklist: React.FC<GettingStartedChecklistProps> = ({
  profileComplete,
  hasWatchedWelcome,
  hasStartedCourse,
  hasPassedExam,
  hasCertificate,
}) => {
  const navigate = useNavigate();

  const steps: Step[] = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your basic information to get started',
      completed: profileComplete,
      action: 'Complete Profile',
      route: '/profile',
      estimatedMinutes: 2,
    },
    {
      id: 'welcome',
      title: 'Watch Welcome Video',
      description: 'Learn about the RVT training program',
      completed: hasWatchedWelcome,
      action: 'Watch Video',
      route: '/welcome',
      estimatedMinutes: 3,
    },
    {
      id: 'course',
      title: 'Start Module 1',
      description: 'Begin your COMAR-aligned training',
      completed: hasStartedCourse,
      action: 'Start Learning',
      route: '/course',
      estimatedMinutes: 240, // 4 hours
    },
    {
      id: 'exam',
      title: 'Pass Final Exam',
      description: '80% score required for certification',
      completed: hasPassedExam,
      action: 'Take Exam',
      route: '/exam',
      estimatedMinutes: 45,
    },
    {
      id: 'certificate',
      title: 'Download Certificate',
      description: 'Get your official RVT certificate',
      completed: hasCertificate,
      action: 'Get Certificate',
      route: '/certificates',
      estimatedMinutes: 1,
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;
  const currentStep = steps.find(s => !s.completed) || steps[steps.length - 1];

  const totalTimeRemaining = steps
    .filter(s => !s.completed)
    .reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (completedSteps === steps.length) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Congratulations! You're Certified! 🎉</h3>
          <p className="text-muted-foreground mb-4">
            You've completed all requirements for your RVT certification.
          </p>
          <Button onClick={() => navigate('/certificates')}>
            View Your Certificate
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Certification Journey</CardTitle>
        <CardDescription>
          {completedSteps} of {steps.length} steps completed
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time to Certificate Widget */}
        {totalTimeRemaining > 0 && (
          <div className="bg-primary/5 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Time to Certificate</p>
                <p className="text-xs text-muted-foreground">Estimated time remaining</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatTime(totalTimeRemaining)}
            </div>
          </div>
        )}

        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStep.id;
            
            return (
              <div
                key={step.id}
                className={`
                  border rounded-lg p-4 transition-all
                  ${step.completed ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : ''}
                  ${isCurrent ? 'border-primary shadow-sm' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-semibold ${isCurrent ? 'text-primary' : ''}`}>
                        Step {index + 1}: {step.title}
                      </h4>
                      {step.estimatedMinutes && !step.completed && (
                        <span className="text-xs text-muted-foreground">
                          Est. {formatTime(step.estimatedMinutes)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {step.description}
                    </p>
                    
                    {!step.completed && (
                      <Button
                        size="sm"
                        variant={isCurrent ? 'default' : 'outline'}
                        onClick={() => navigate(step.route)}
                      >
                        {step.action}
                      </Button>
                    )}
                    
                    {step.completed && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Next Step CTA */}
        {currentStep && !currentStep.completed && (
          <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center">
            <p className="font-semibold mb-2">Ready to continue?</p>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => navigate(currentStep.route)}
            >
              {currentStep.action}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
