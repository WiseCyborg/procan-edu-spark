import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Course {
  title: string;
  completion_badge_name: string;
}

interface Module {
  id: string;
  title: string;
  module_number: number;
}

interface ModuleNavigationProps {
  course: Course;
  modules: Module[];
  currentModuleIndex: number;
  completedModules: string[];
  onModuleSelect: (index: number) => void;
}

export const ModuleNavigation = ({
  course,
  modules,
  currentModuleIndex,
  completedModules,
  onModuleSelect
}: ModuleNavigationProps) => {
  const completedCount = completedModules.length;
  const totalCount = modules.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <Card className="p-4 space-y-4">
      {/* Course Header */}
      <div className="space-y-2 pb-4 border-b border-border">
        <h2 className="font-semibold text-foreground">{course.title}</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="h-4 w-4 text-primary" />
          <span className="text-xs">{course.completion_badge_name}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Your Progress</span>
          <span className="font-medium text-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Module List */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Modules</h3>
        {modules.map((module, index) => {
          const isComplete = completedModules.includes(module.id);
          const isCurrent = index === currentModuleIndex;

          return (
            <button
              key={module.id}
              onClick={() => onModuleSelect(index)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                isCurrent
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-foreground'
              )}
            >
              <div className="flex-shrink-0 pt-0.5">
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className={cn(
                    'h-5 w-5',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-0.5">
                  Module {module.module_number}
                </div>
                <div className={cn(
                  'text-sm font-medium line-clamp-2',
                  isCurrent ? 'text-primary' : 'text-foreground'
                )}>
                  {module.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
