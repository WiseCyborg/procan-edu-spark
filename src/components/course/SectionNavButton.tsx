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
    <div className="mt-8 pt-6 border-t">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {onMarkComplete && (
          <Button
            variant="outline"
            onClick={onMarkComplete}
            className="w-full sm:w-auto"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {completionMessage || "Mark as Complete"}
          </Button>
        )}

        {nextSection && (
          <Button
            onClick={onContinue}
            disabled={!canContinue}
            className={cn(
              "w-full sm:w-auto sm:ml-auto",
              canContinue && "bg-primary hover:bg-primary/90"
            )}
          >
            Continue to {nextSection.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {!canContinue && nextSection && (
        <p className="text-sm text-muted-foreground mt-2 text-center sm:text-right">
          Complete this section to continue
        </p>
      )}
    </div>
  );
}
