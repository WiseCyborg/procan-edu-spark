import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Play, Lock, Award, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Module {
  id: string;
  number: number;
  title: string;
  tier: 'green' | 'yellow' | 'red';
  isCompleted: boolean;
  isLocked?: boolean;
}

interface ModuleSidebarProps {
  modules: Module[];
  currentModuleNumber: number;
  onModuleSelect: (moduleNumber: number) => void;
}

// RVT Required modules are 0-18 (19 total)
const RVT_REQUIRED_MAX = 18;

export const ModuleSidebar = ({
  modules,
  currentModuleNumber,
  onModuleSelect
}: ModuleSidebarProps) => {
  // Split into RVT Required vs Manager Track
  const rvtRequiredModules = modules.filter(m => m.number <= RVT_REQUIRED_MAX);
  const managerModules = modules.filter(m => m.number > RVT_REQUIRED_MAX);

  const rvtCompletedCount = rvtRequiredModules.filter(m => m.isCompleted).length;
  const managerCompletedCount = managerModules.filter(m => m.isCompleted).length;
  
  const isRvtComplete = rvtCompletedCount === rvtRequiredModules.length;

  const handleModuleClick = (module: Module) => {
    if (module.isLocked) {
      const firstIncomplete = modules.find(m => !m.isCompleted);
      toast.error(
        `Complete Module ${firstIncomplete?.number || module.number - 1} first before accessing this module.`
      );
      return;
    }
    onModuleSelect(module.number);
  };

  const renderModuleItem = (module: Module) => {
    const isCurrent = module.number === currentModuleNumber;
    const isLocked = module.isLocked && !module.isCompleted;
    
    return (
      <Button
        key={module.id}
        variant={isCurrent ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start text-left h-auto py-3 px-3',
          isCurrent && 'bg-primary/10 border-l-2 border-primary',
          isLocked && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => handleModuleClick(module)}
        disabled={isLocked}
      >
        <div className="flex items-start gap-3 w-full">
          <div className="mt-0.5">
            {module.isCompleted ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : isCurrent ? (
              <Play className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium mb-1">
              Module {module.number}
              {isLocked && <span className="ml-1 text-muted-foreground">(Locked)</span>}
            </div>
            <div className={cn(
              'text-sm truncate',
              module.isCompleted && 'text-green-700 dark:text-green-400',
              isCurrent && 'font-medium',
              isLocked && 'text-muted-foreground'
            )}>
              {module.title}
            </div>
          </div>
        </div>
      </Button>
    );
  };

  return (
    <aside className="hidden lg:block w-72 border-r bg-muted/5">
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-4 space-y-4">
          {/* RVT Required Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
              <Award className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm">RVT Required</h3>
                <p className="text-xs text-muted-foreground">Complete for certification</p>
              </div>
              <Badge variant={isRvtComplete ? 'default' : 'secondary'} className="text-xs">
                {rvtCompletedCount}/{rvtRequiredModules.length}
              </Badge>
            </div>
            
            {/* Green Tier */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-sm">🟢</span>
                <span className="text-xs font-medium text-muted-foreground">Green Tier</span>
              </div>
              {rvtRequiredModules.filter(m => m.tier === 'green').map(renderModuleItem)}
            </div>

            {/* Yellow Tier */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-sm">🟡</span>
                <span className="text-xs font-medium text-muted-foreground">Yellow Tier</span>
              </div>
              {rvtRequiredModules.filter(m => m.tier === 'yellow').map(renderModuleItem)}
            </div>

            {/* Red Tier (RVT only) */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-sm">🔴</span>
                <span className="text-xs font-medium text-muted-foreground">Red Tier</span>
              </div>
              {rvtRequiredModules.filter(m => m.tier === 'red').map(renderModuleItem)}
            </div>
          </div>

          {/* Separator between tracks */}
          {managerModules.length > 0 && (
            <>
              <Separator className="my-4" />
              
              {/* Manager Track Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Manager Track</h3>
                    <p className="text-xs text-muted-foreground">Optional leadership training</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {managerCompletedCount}/{managerModules.length}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  {managerModules.map(renderModuleItem)}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};
