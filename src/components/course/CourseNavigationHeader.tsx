import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronRight, X } from 'lucide-react';
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
  const progressPercentage = (completedCount / totalModules) * 100;

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
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-sm font-medium">
              Module {currentModuleNumber === 0 ? 'Intro' : currentModuleNumber} of {totalModules - 1}
            </span>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="text-sm text-muted-foreground min-w-[100px] text-right">
            {completedCount} completed
          </div>

          <Select
            value={`${currentModuleNumber}`}
            onValueChange={(value) => onModuleSelect(parseInt(value))}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Jump to module..." />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {modules.map((module) => (
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
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
};
