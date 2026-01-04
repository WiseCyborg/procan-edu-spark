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
  showMarkComplete?: boolean;
}

export function SectionNavButton({
  currentSection,
  nextSection,
  onContinue,
  canContinue,
  completionMessage,
  onMarkComplete,
  showMarkComplete = false
}: SectionNavButtonProps) {
  // Only show ONE primary action, never both buttons
  const showContinueButton = nextSection && canContinue;
  const showCompleteButton = showMarkComplete && onMarkComplete && !showContinueButton;

  return (
    <div className="mt-8 pt-6 border-t border-border/50">
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
        {/* Show Mark Complete only if explicitly requested AND can't continue yet */}
        {showCompleteButton && (
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

        {/* Show Continue button when ready to proceed */}
        {showContinueButton && (
          <Button
            onClick={onContinue}
            size="lg"
            className={cn(
              "w-full sm:w-auto font-semibold",
              "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
            )}
          >
            {completionMessage || `Continue to ${nextSection.label}`}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Guidance message when blocked */}
      {!canContinue && nextSection && (
        <p className="text-sm text-muted-foreground mt-3 text-center sm:text-right flex items-center justify-center sm:justify-end gap-2">
          <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          {completionMessage || "Complete this section to continue"}
        </p>
      )}
    </div>
  );
}
