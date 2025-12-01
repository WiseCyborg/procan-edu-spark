import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { ModuleSidebar } from './ModuleSidebar';

interface Module {
  id: string;
  number: number;
  title: string;
  tier: 'green' | 'yellow' | 'red';
  isCompleted: boolean;
}

interface MobileNavBarProps {
  modules: Module[];
  currentModuleNumber: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onModuleSelect: (moduleNumber: number) => void;
  previousTitle?: string;
  nextTitle?: string;
}

export const MobileNavBar = ({
  modules,
  currentModuleNumber,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onModuleSelect,
  previousTitle,
  nextTitle
}: MobileNavBarProps) => {
  // Hide entirely if no navigation is possible
  if (!canGoPrevious && !canGoNext) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t z-50">
      <div className="container py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Previous Button - conditionally render */}
          {canGoPrevious ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              className="flex-1 max-w-[120px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
          ) : (
            <div className="flex-1 max-w-[120px]" />
          )}

          {/* Module List Drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Menu className="h-4 w-4" />
                <span className="hidden sm:inline">Modules</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[300px]">
              <div className="py-4 border-b">
                <h2 className="text-lg font-semibold px-4">Course Modules</h2>
              </div>
              <ModuleSidebar
                modules={modules}
                currentModuleNumber={currentModuleNumber}
                onModuleSelect={onModuleSelect}
              />
            </SheetContent>
          </Sheet>

        {/* Next Button - conditionally render */}
        {canGoNext ? (
          <Button
            variant="default"
            size="sm"
            onClick={onNext}
            className="flex-1 max-w-[120px]"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <div className="flex-1 max-w-[120px]" />
        )}
        </div>

        {/* Module Titles (visible on larger mobile) */}
        <div className="hidden sm:flex items-center justify-between text-xs text-muted-foreground mt-2 gap-2">
          <div className="flex-1 text-left truncate">
            {canGoPrevious && previousTitle && (
              <span>{previousTitle}</span>
            )}
          </div>
          <div className="flex-1 text-right truncate">
            {canGoNext && nextTitle && (
              <span>{nextTitle}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
