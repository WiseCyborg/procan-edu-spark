import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaptionBubbleProps {
  content: string;
  isVisible: boolean;
  onClose: () => void;
  onAskMore?: () => void;
  position?: { x: number; y: number };
  className?: string;
}

export const CaptionBubble: React.FC<CaptionBubbleProps> = ({
  content,
  isVisible,
  onClose,
  onAskMore,
  position = { x: 50, y: 50 },
  className
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed z-50 pointer-events-auto transition-all duration-300",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <Card className="max-w-xs shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm leading-relaxed text-foreground">
              {content}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-muted/50"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          {onAskMore && (
            <Button
              onClick={onAskMore}
              size="sm"
              variant="outline"
              className="w-full flex items-center gap-2 h-8"
            >
              <MessageCircle className="h-3 w-3" />
              Ask Charm
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Speech bubble tail */}
      <div className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-border" />
      <div className="absolute left-1/2 top-full -translate-x-1/2 translate-y-[-1px] w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-card" />
    </div>
  );
};