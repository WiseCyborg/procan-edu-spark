import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Award, Users, Lock, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  module_number: number;
}

interface TrackSidebarProps {
  modules: Module[];
  currentModuleIndex: number;
  completedModules: string[];
  onModuleSelect: (index: number) => void;
  courseBadgeName?: string;
  courseTitle?: string;
}

// RVT Required modules are 0-18 (19 total)
const RVT_REQUIRED_MAX = 18;
const RVT_MODULE_COUNT = 19;
const MANAGER_MODULE_COUNT = 5;

export const TrackSidebar = ({
  modules,
  currentModuleIndex,
  completedModules,
  onModuleSelect,
  courseBadgeName = 'RVT Certified',
  courseTitle = 'Maryland RVT Training'
}: TrackSidebarProps) => {
  // Split modules into tracks
  const rvtModules = modules.filter(m => m.module_number <= RVT_REQUIRED_MAX);
  const managerModules = modules.filter(m => m.module_number > RVT_REQUIRED_MAX && m.module_number <= 23);
  
  // Calculate progress for each track
  const rvtCompleted = rvtModules.filter(m => completedModules.includes(m.id)).length;
  const managerCompleted = managerModules.filter(m => completedModules.includes(m.id)).length;
  
  const rvtProgress = (rvtCompleted / RVT_MODULE_COUNT) * 100;
  const managerProgress = managerModules.length > 0 
    ? (managerCompleted / MANAGER_MODULE_COUNT) * 100 
    : 0;
  
  const isRvtComplete = rvtCompleted === RVT_MODULE_COUNT;

  const renderModuleItem = (module: Module, index: number, track: 'rvt' | 'manager') => {
    const isComplete = completedModules.includes(module.id);
    const actualIndex = modules.findIndex(m => m.id === module.id);
    const isCurrent = actualIndex === currentModuleIndex;
    
    // For manager modules, check if RVT is complete
    const isLocked = track === 'manager' && !isRvtComplete;

    return (
      <button
        key={module.id}
        onClick={() => !isLocked && onModuleSelect(actualIndex)}
        disabled={isLocked}
        className={cn(
          'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
          isLocked && 'opacity-50 cursor-not-allowed',
          isCurrent
            ? track === 'manager' 
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-primary/10 text-primary'
            : 'hover:bg-muted text-foreground'
        )}
      >
        <div className="flex-shrink-0 pt-0.5">
          {isLocked ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : isComplete ? (
            <CheckCircle2 className={cn(
              'h-5 w-5',
              track === 'manager' ? 'text-amber-600' : 'text-primary'
            )} />
          ) : (
            <Circle className={cn(
              'h-5 w-5',
              isCurrent 
                ? track === 'manager' ? 'text-amber-600' : 'text-primary' 
                : 'text-muted-foreground'
            )} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-0.5">
            {track === 'manager' ? `Mgr ${module.module_number - RVT_REQUIRED_MAX}` : `Module ${module.module_number}`}
          </div>
          <div className={cn(
            'text-sm font-medium line-clamp-2',
            isCurrent 
              ? track === 'manager' ? 'text-amber-700 dark:text-amber-300' : 'text-primary'
              : 'text-foreground'
          )}>
            {module.title}
          </div>
        </div>
      </button>
    );
  };

  return (
    <Card className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* Course Header */}
      <div className="space-y-2 pb-4 border-b border-border">
        <h2 className="font-semibold text-foreground">{courseTitle}</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="h-4 w-4 text-primary" />
          <span className="text-xs">{courseBadgeName}</span>
        </div>
      </div>

      {/* RVT Core Track */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">RVT Core</span>
            <Badge variant="secondary" className="text-xs">Required</Badge>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {rvtCompleted}/{RVT_MODULE_COUNT}
          </span>
        </div>
        
        <div className="space-y-1">
          <Progress value={rvtProgress} className="h-2" />
          {isRvtComplete && (
            <p className="text-xs text-primary font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              RVT Complete — Ready for Exam
            </p>
          )}
        </div>

        <div className="space-y-1">
          {rvtModules.map((module, idx) => renderModuleItem(module, idx, 'rvt'))}
        </div>
      </div>

      {/* Manager Track */}
      {managerModules.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Manager Track</span>
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Optional</Badge>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {managerCompleted}/{MANAGER_MODULE_COUNT}
            </span>
          </div>
          
          {!isRvtComplete && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Complete RVT Core to unlock Manager Track
            </p>
          )}
          
          <div className="space-y-1">
            <Progress 
              value={managerProgress} 
              className="h-2 [&>div]:bg-amber-500" 
            />
          </div>

          <div className="space-y-1">
            {managerModules.map((module, idx) => renderModuleItem(module, idx, 'manager'))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TrackSidebar;
