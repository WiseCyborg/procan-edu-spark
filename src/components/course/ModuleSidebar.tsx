import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  number: number;
  title: string;
  tier: 'green' | 'yellow' | 'red';
  isCompleted: boolean;
}

interface ModuleSidebarProps {
  modules: Module[];
  currentModuleNumber: number;
  onModuleSelect: (moduleNumber: number) => void;
}

export const ModuleSidebar = ({
  modules,
  currentModuleNumber,
  onModuleSelect
}: ModuleSidebarProps) => {
  const greenModules = modules.filter(m => m.tier === 'green');
  const yellowModules = modules.filter(m => m.tier === 'yellow');
  const redModules = modules.filter(m => m.tier === 'red');

  const renderModuleItem = (module: Module) => {
    const isCurrent = module.number === currentModuleNumber;
    
    return (
      <Button
        key={module.id}
        variant={isCurrent ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start text-left h-auto py-3 px-3',
          isCurrent && 'bg-primary/10 border-l-2 border-primary'
        )}
        onClick={() => onModuleSelect(module.number)}
      >
        <div className="flex items-start gap-3 w-full">
          <div className="mt-0.5">
            {module.isCompleted ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : isCurrent ? (
              <Play className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium mb-1">
              Module {module.number}
            </div>
            <div className={cn(
              'text-sm',
              module.isCompleted && 'text-green-700 dark:text-green-400',
              isCurrent && 'font-medium'
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
        <div className="p-4 space-y-6">
          {/* Green Tier */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-lg">🟢</span>
              <h3 className="font-semibold text-sm">Green Tier</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {greenModules.filter(m => m.isCompleted).length}/{greenModules.length}
              </span>
            </div>
            <div className="space-y-1">
              {greenModules.map(renderModuleItem)}
            </div>
          </div>

          {/* Yellow Tier */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-lg">🟡</span>
              <h3 className="font-semibold text-sm">Yellow Tier</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {yellowModules.filter(m => m.isCompleted).length}/{yellowModules.length}
              </span>
            </div>
            <div className="space-y-1">
              {yellowModules.map(renderModuleItem)}
            </div>
          </div>

          {/* Red Tier */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-lg">🔴</span>
              <h3 className="font-semibold text-sm">Red Tier</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {redModules.filter(m => m.isCompleted).length}/{redModules.length}
              </span>
            </div>
            <div className="space-y-1">
              {redModules.map(renderModuleItem)}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
};
