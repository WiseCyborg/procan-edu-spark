import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionNavButtonProps {
  currentSection: string;
  nextSection?: {
    id: string;
    label: string;
  };
  onContinue: () => void;
  canContinue: boolean;
  completionMessage?: string;
  onMarkComplete?: () => void;
}

export function SectionNavButton({
  currentSection,
  nextSection,
  onContinue,
  canContinue,
  completionMessage,
  onMarkComplete
}: SectionNavButtonProps) {
  return (
    <div className="mt-8 pt-6 border-t border-border/50">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {onMarkComplete && (
          <Button
            variant="outline"
            size="lg"
            onClick={onMarkComplete}
            className="w-full sm:w-auto border-2"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {completionMessage || "Mark as Complete"}
          </Button>
        )}

        {nextSection && (
          <Button
            onClick={onContinue}
            disabled={!canContinue}
            size="lg"
            className={cn(
              "w-full sm:w-auto sm:ml-auto font-semibold",
              canContinue && "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
            )}
          >
            Continue to {nextSection.label}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>

      {!canContinue && nextSection && (
        <p className="text-sm text-muted-foreground mt-3 text-center sm:text-right flex items-center justify-center sm:justify-end gap-2">
          <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Complete this section to continue
        </p>
      )}
    </div>
  );
}
