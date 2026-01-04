import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Eye,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/utils/sanitize-html';

interface DocumentContent {
  id: string;
  title: string;
  category: string;
  version: string;
  content: string;
  lastUpdated: string;
  comarReferences?: string[];
}

interface DocumentReadTrackerProps {
  document: DocumentContent;
  isRead: boolean;
  onMarkAsRead: (docId: string) => void;
  required?: boolean;
}

// Minimum requirements to mark as read
const MIN_SCROLL_PERCENT = 90;
const MIN_TIME_SECONDS = 45;

export const DocumentReadTracker: React.FC<DocumentReadTrackerProps> = ({
  document,
  isRead,
  onMarkAsRead,
  required = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [canMarkAsRead, setCanMarkAsRead] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Determine state
  const getStatus = () => {
    if (isRead) return 'completed';
    if (isExpanded && (scrollPercent > 0 || timeSpent > 0)) return 'in-progress';
    return 'not-started';
  };

  const status = getStatus();

  // Handle scroll tracking
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const maxScroll = scrollHeight - clientHeight;
    const percent = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 100;
    setScrollPercent(Math.min(percent, 100));
  }, []);

  // Start timer when expanded
  useEffect(() => {
    if (isExpanded && !isRead) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setTimeSpent(elapsed);
        }
      }, 1000);
    } else if (!isExpanded && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isExpanded, isRead]);

  // Check if requirements met
  useEffect(() => {
    const meetsScrollReq = scrollPercent >= MIN_SCROLL_PERCENT;
    const meetsTimeReq = timeSpent >= MIN_TIME_SECONDS;
    setCanMarkAsRead(meetsScrollReq || meetsTimeReq);
  }, [scrollPercent, timeSpent]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 animate-pulse">
            <Eye className="h-3 w-3 mr-1" />
            Reading...
          </Badge>
        );
      default:
        return required ? (
          <Badge variant="destructive" className="animate-pulse">
            <BookOpen className="h-3 w-3 mr-1" />
            Must Read
          </Badge>
        ) : (
          <Badge variant="outline">
            <FileText className="h-3 w-3 mr-1" />
            Optional
          </Badge>
        );
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-300 overflow-hidden",
        status === 'not-started' && required && "ring-2 ring-primary/50 ring-offset-2",
        status === 'in-progress' && "ring-2 ring-amber-500/50",
        status === 'completed' && "opacity-90"
      )}
    >
      <button
        onClick={() => !isRead && setIsExpanded(!isExpanded)}
        className="w-full text-left"
        disabled={isRead}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <motion.div
                animate={status === 'completed' ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                ) : (
                  <FileText className={cn(
                    "h-6 w-6 flex-shrink-0",
                    status === 'in-progress' ? "text-amber-600" : "text-muted-foreground"
                  )} />
                )}
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground">{document.title}</h4>
                  {getStatusBadge()}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {document.category} • Version {document.version}
                </p>
                
                {/* Progress indicator when reading */}
                {status === 'in-progress' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 space-y-2"
                  >
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>Scrolled {scrollPercent}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(timeSpent)}</span>
                      </div>
                    </div>
                    <Progress 
                      value={Math.max(
                        (scrollPercent / MIN_SCROLL_PERCENT) * 100,
                        (timeSpent / MIN_TIME_SECONDS) * 100
                      )} 
                      className="h-1.5"
                    />
                    <p className="text-xs text-muted-foreground">
                      {canMarkAsRead 
                        ? "✓ Ready to mark complete" 
                        : `Scroll to ${MIN_SCROLL_PERCENT}% or read for ${MIN_TIME_SECONDS}s to unlock`
                      }
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
            
            {!isRead && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {isExpanded ? 'Click to collapse' : 'Click to read'}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </button>

      <AnimatePresence>
        {isExpanded && !isRead && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="border-t">
              {/* COMAR References */}
              {document.comarReferences && document.comarReferences.length > 0 && (
                <div className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                  <span>COMAR References: {document.comarReferences.join(', ')}</span>
                </div>
              )}
              
              {/* Scrollable content */}
              <div
                ref={contentRef}
                onScroll={handleScroll}
                className="max-h-[400px] overflow-y-auto px-4 py-4"
              >
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert
                             prose-p:mb-4 prose-headings:mt-6 prose-headings:mb-3 
                             prose-li:my-1 prose-ul:my-4 prose-ol:my-4"
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml(document.content) 
                  }}
                />
              </div>
              
              {/* Footer with Mark as Read button */}
              <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Last updated: {new Date(document.lastUpdated).toLocaleDateString()}
                </span>
                
                <Button
                  size="sm"
                  disabled={!canMarkAsRead}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(document.id);
                    setIsExpanded(false);
                  }}
                  className={cn(
                    "transition-all duration-300",
                    canMarkAsRead && "animate-pulse bg-green-600 hover:bg-green-700"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {canMarkAsRead ? 'Mark as Read' : 'Keep Reading...'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
