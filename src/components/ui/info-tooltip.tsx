import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  children,
  className = '',
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children || (
            <button
              type="button"
              className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="sr-only">More information</span>
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
