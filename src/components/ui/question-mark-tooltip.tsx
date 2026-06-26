import React, { useState } from 'react';
import { HelpCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface QuestionMarkTooltipProps {
  helpKey: string;
  content: string;
  onAskCharm?: (helpKey: string, content: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const QuestionMarkTooltip = ({ 
  helpKey, 
  content, 
  onAskCharm, 
  className,
  size = 'md' 
}: QuestionMarkTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAskCharm = () => {
    onAskCharm?.(helpKey, content);
    setIsOpen(false);
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "p-1 rounded-full hover:bg-muted/50 transition-colors",
              sizeClasses[size],
              className
            )}
          >
            <HelpCircle className={cn("text-muted-foreground", sizeClasses[size])} />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-4 space-y-3">
          <p className="text-sm leading-relaxed">{content}</p>
          {onAskCharm && (
            <Button 
              onClick={handleAskCharm}
              size="sm"
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Ask AiLean
            </Button>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};