import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EnhancedScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  showUnreadCount?: number;
  autoScroll?: boolean;
}

export const EnhancedScrollArea: React.FC<EnhancedScrollAreaProps> = ({
  children,
  className,
  onScroll,
  showUnreadCount = 0,
  autoScroll = true
}) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const checkScrollPosition = () => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottomNow = scrollTop + clientHeight >= scrollHeight - 10;
    const isAtTopNow = scrollTop <= 10;
    
    setIsAtBottom(isAtBottomNow);
    setIsAtTop(isAtTopNow);
    setShowScrollButtons(scrollHeight > clientHeight + 20);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      checkScrollPosition();
    };

    scrollElement.addEventListener('scroll', handleScroll);
    
    // Check initial position
    checkScrollPosition();
    
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (autoScroll && isAtBottom) {
      scrollToBottom();
    }
  }, [children, autoScroll, isAtBottom]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handleScrollEvent = (event: React.UIEvent<HTMLDivElement>) => {
    checkScrollPosition();
    onScroll?.(event);
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <ScrollArea className={className} ref={scrollRef} onScroll={handleScrollEvent}>
        <div ref={contentRef}>
          {children}
        </div>
      </ScrollArea>
      
      {/* Scroll Controls */}
      {showScrollButtons && (
        <div className="absolute right-2 top-2 flex flex-col gap-1 z-10">
          {!isAtTop && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
              onClick={scrollToTop}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
          {!isAtBottom && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm relative"
              onClick={scrollToBottom}
            >
              <ChevronDown className="h-4 w-4" />
              {showUnreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {showUnreadCount > 9 ? '9+' : showUnreadCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      )}
      
      {/* Scroll Position Indicator */}
      {showScrollButtons && (
        <div className="absolute right-2 bottom-2">
          <div className="w-1 h-8 bg-border rounded-full overflow-hidden">
            <div 
              className="bg-primary rounded-full transition-all duration-150"
              style={{
                height: `${Math.min(100, (scrollRef.current?.scrollTop || 0) / Math.max(1, (scrollRef.current?.scrollHeight || 1) - (scrollRef.current?.clientHeight || 0)) * 100)}%`,
                width: '100%'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};