import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HoverCalloutProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  delay?: number;
}

export const HoverCallout: React.FC<HoverCalloutProps> = ({
  children,
  content,
  side = 'top',
  className,
  delay = 300
}) => {
  return (
    <TooltipProvider delayDuration={delay}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className={cn(
            "max-w-xs p-3 text-sm leading-relaxed",
            "bg-background border border-border shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
            className
          )}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const QuickActionCallout: React.FC<{
  children: React.ReactNode;
  title: string;
  description: string;
  shortcut?: string;
}> = ({ children, title, description, shortcut }) => {
  return (
    <HoverCallout
      content={
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{title}</span>
            {shortcut && (
              <kbd className="px-2 py-1 text-xs bg-muted rounded">
                {shortcut}
              </kbd>
            )}
          </div>
          <p className="text-muted-foreground">{description}</p>
        </div>
      }
    >
      {children}
    </HoverCallout>
  );
};