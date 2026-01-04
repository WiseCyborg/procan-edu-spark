import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Play, 
  Award, 
  CheckCircle2, 
  BookOpen,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CourseProgressionCTAProps {
  completedModulesCount: number;
  requiredModulesCount: number;
  firstIncompleteModule: number;
  allModulesCompleted: boolean;
  isManagerRole?: boolean;
}

type NextAction = {
  type: 'CONTINUE_MODULE' | 'START_EXAM' | 'COURSE_COMPLETE';
  moduleNumber?: number;
  route: string;
  title: string;
  description: string;
  buttonText: string;
  icon: React.ReactNode;
};

const resolveNextAction = (
  completedCount: number,
  requiredCount: number,
  firstIncomplete: number,
  allComplete: boolean
): NextAction => {
  // Case 1: All required modules complete -> Ready for final exam
  if (allComplete) {
    return {
      type: 'START_EXAM',
      route: '/course/final-exam',
      title: 'Ready for Your Certification Exam!',
      description: "You've completed all required modules. Take the final exam to earn your official Maryland RVT Certificate.",
      buttonText: 'Start Final Exam',
      icon: <Award className="h-6 w-6" />,
    };
  }

  // Case 2: Still have modules to complete
  return {
    type: 'CONTINUE_MODULE',
    moduleNumber: firstIncomplete,
    route: `/course/part${firstIncomplete}`,
    title: completedCount === 0 
      ? 'Begin Your Training' 
      : `Continue to Module ${firstIncomplete}`,
    description: completedCount === 0
      ? 'Start with the Welcome & Platform Orientation module to begin your certification journey.'
      : `You're making great progress! ${completedCount} of ${requiredCount} modules completed.`,
    buttonText: completedCount === 0 ? 'Start Course' : 'Continue Learning',
    icon: completedCount === 0 ? <Play className="h-6 w-6" /> : <ArrowRight className="h-6 w-6" />,
  };
};

export const CourseProgressionCTA: React.FC<CourseProgressionCTAProps> = ({
  completedModulesCount,
  requiredModulesCount,
  firstIncompleteModule,
  allModulesCompleted,
}) => {
  const navigate = useNavigate();
  
  const nextAction = resolveNextAction(
    completedModulesCount,
    requiredModulesCount,
    firstIncompleteModule,
    allModulesCompleted
  );

  const progressPercent = requiredModulesCount > 0 
    ? Math.round((completedModulesCount / requiredModulesCount) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn(
        "border-2 transition-all duration-300",
        nextAction.type === 'START_EXAM' 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
          : "border-muted hover:border-primary/50"
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Icon */}
            <motion.div
              animate={nextAction.type === 'START_EXAM' ? {
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              } : {}}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className={cn(
                "flex-shrink-0 rounded-full p-4",
                nextAction.type === 'START_EXAM'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-primary"
              )}
            >
              {nextAction.icon}
            </motion.div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h3 className="text-xl font-bold text-foreground">
                  {nextAction.title}
                </h3>
                {nextAction.type === 'START_EXAM' && (
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Sparkles className="h-5 w-5 text-primary" />
                  </motion.div>
                )}
              </div>
              <p className="text-muted-foreground">
                {nextAction.description}
              </p>
              
              {/* Progress bar (only for continue module) */}
              {nextAction.type === 'CONTINUE_MODULE' && completedModulesCount > 0 && (
                <div className="pt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{progressPercent}% complete</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              )}
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              onClick={() => navigate(nextAction.route)}
              className={cn(
                "flex-shrink-0 gap-2 min-w-[180px]",
                nextAction.type === 'START_EXAM' && "animate-pulse"
              )}
            >
              {nextAction.type === 'CONTINUE_MODULE' && completedModulesCount === 0 ? (
                <Play className="h-5 w-5" />
              ) : nextAction.type === 'START_EXAM' ? (
                <Award className="h-5 w-5" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
              {nextAction.buttonText}
            </Button>
          </div>

          {/* Module indicators */}
          {nextAction.type === 'CONTINUE_MODULE' && requiredModulesCount <= 24 && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center gap-1 justify-center flex-wrap">
                {Array.from({ length: requiredModulesCount }).map((_, idx) => (
                  <motion.div
                    key={idx}
                    initial={false}
                    animate={idx < completedModulesCount ? { 
                      scale: [1, 1.2, 1],
                      backgroundColor: 'rgb(22, 163, 74)'
                    } : {}}
                    transition={{ delay: idx * 0.02, duration: 0.2 }}
                    className={cn(
                      "w-3 h-3 rounded-full transition-colors",
                      idx < completedModulesCount 
                        ? "bg-green-600" 
                        : idx === firstIncompleteModule
                          ? "bg-primary ring-2 ring-primary/50 ring-offset-1"
                          : "bg-muted-foreground/20"
                    )}
                    title={`Module ${idx}${idx < completedModulesCount ? ' (Completed)' : idx === firstIncompleteModule ? ' (Next)' : ''}`}
                  />
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                {completedModulesCount === 0 
                  ? "Complete each module to progress toward certification"
                  : `${requiredModulesCount - completedModulesCount} modules remaining`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
