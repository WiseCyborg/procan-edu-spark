import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronRight, X, Award, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Module {
  id: string;
  number: number;
  title: string;
  tier: 'green' | 'yellow' | 'red';
  isCompleted: boolean;
}

// RVT Required modules are 0-18 (19 total)
const RVT_REQUIRED_MAX = 18;
const RVT_MODULE_COUNT = 19; // Modules 0-18

interface CourseNavigationHeaderProps {
  currentModuleNumber: number;
  currentModuleTitle: string;
  totalModules: number;
  completedCount: number;
  modules: Module[];
  onModuleSelect: (moduleNumber: number) => void;
  onClose: () => void;
}

export const CourseNavigationHeader = ({
  currentModuleNumber,
  currentModuleTitle,
  totalModules,
  completedCount,
  modules,
  onModuleSelect,
  onClose
}: CourseNavigationHeaderProps) => {
  // Split modules into RVT and Manager tracks
  const rvtModules = modules.filter(m => m.number <= RVT_REQUIRED_MAX);
  const managerModules = modules.filter(m => m.number > RVT_REQUIRED_MAX);
  
  // Calculate RVT-specific progress
  const rvtCompletedCount = rvtModules.filter(m => m.isCompleted).length;
  const managerCompletedCount = managerModules.filter(m => m.isCompleted).length;
  
  // Determine if current module is RVT or Manager track
  const isManagerModule = currentModuleNumber > RVT_REQUIRED_MAX;
  
  // Progress bar shows RVT progress (the required certification path)
  const rvtProgressPercentage = (rvtCompletedCount / RVT_MODULE_COUNT) * 100;
  const isRvtComplete = rvtCompletedCount === RVT_MODULE_COUNT;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="container py-3 space-y-2">
        {/* Breadcrumb Row */}
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Link 
              to="/course" 
              className="hover:text-foreground transition-colors"
            >
              Course
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">
              Module {currentModuleNumber}: {currentModuleTitle}
            </span>
            {isManagerModule && (
              <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
                <Users className="h-3 w-3 mr-1" />
                Manager Track
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-[160px]">
            {isManagerModule ? (
              <span className="text-sm font-medium text-amber-600">
                Manager {currentModuleNumber - RVT_REQUIRED_MAX} of {managerModules.length}
              </span>
            ) : (
              <span className="text-sm font-medium">
                RVT Module {currentModuleNumber === 0 ? 'Intro' : currentModuleNumber} of {RVT_REQUIRED_MAX}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Progress value={rvtProgressPercentage} className="h-2" />
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4 text-primary" />
              <span className={isRvtComplete ? 'text-green-600 font-medium' : ''}>
                RVT: {rvtCompletedCount}/{RVT_MODULE_COUNT}
              </span>
            </div>
            {managerModules.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-amber-600" />
                <span>Mgr: {managerCompletedCount}/{managerModules.length}</span>
              </div>
            )}
          </div>

          <Select
            value={`${currentModuleNumber}`}
            onValueChange={(value) => onModuleSelect(parseInt(value))}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Jump to module..." />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {/* RVT Modules */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                RVT Required ({rvtCompletedCount}/{RVT_MODULE_COUNT})
              </div>
              {rvtModules.map((module) => (
                <SelectItem 
                  key={module.id} 
                  value={`${module.number}`}
                  className="flex items-center"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xs">
                      {module.tier === 'green' && '🟢'}
                      {module.tier === 'yellow' && '🟡'}
                      {module.tier === 'red' && '🔴'}
                    </span>
                    <span className={module.isCompleted ? 'line-through text-muted-foreground' : ''}>
                      {module.number}: {module.title}
                    </span>
                  </div>
                </SelectItem>
              ))}
              
              {/* Manager Track Modules */}
              {managerModules.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 mt-1">
                    Manager Track - Optional ({managerCompletedCount}/{managerModules.length})
                  </div>
                  {managerModules.map((module) => (
                    <SelectItem 
                      key={module.id} 
                      value={`${module.number}`}
                      className="flex items-center"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs">👔</span>
                        <span className={module.isCompleted ? 'line-through text-muted-foreground' : ''}>
                          {module.number}: {module.title}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
};
