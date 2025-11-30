import { CheckCircle2, Circle, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  lockReason?: string;
}

interface SectionProgressNavProps {
  sections: Section[];
  onSectionClick: (sectionId: string) => void;
  completedPercentage: number;
  moduleTitle: string;
}

export function SectionProgressNav({ 
  sections, 
  onSectionClick, 
  completedPercentage,
  moduleTitle 
}: SectionProgressNavProps) {
  return (
    <aside className="hidden lg:block w-64 sticky top-24 h-fit">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2">Module Progress</h3>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{moduleTitle}</p>
          <Progress value={completedPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{completedPercentage}% Complete</p>
        </div>

        <div className="space-y-1">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => !section.isLocked && onSectionClick(section.id)}
              disabled={section.isLocked}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors",
                section.isCurrent && "bg-primary/10 border border-primary/20",
                section.isCompleted && !section.isCurrent && "bg-muted/50",
                !section.isLocked && !section.isCurrent && "hover:bg-muted/50 cursor-pointer",
                section.isLocked && "opacity-50 cursor-not-allowed"
              )}
              title={section.isLocked ? section.lockReason : undefined}
            >
              {section.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : section.isCurrent ? (
                <ChevronRight className="h-5 w-5 text-primary flex-shrink-0" />
              ) : section.isLocked ? (
                <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{index + 1}.</span>
                  <span className={cn(
                    "text-sm",
                    section.isCurrent && "font-semibold text-foreground",
                    section.isCompleted && "text-foreground/80",
                    !section.isCompleted && !section.isCurrent && "text-muted-foreground"
                  )}>
                    {section.label}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                {section.icon}
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
