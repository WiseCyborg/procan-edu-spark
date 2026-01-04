import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle2, Lock, Unlock, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DocumentsProgressHeaderProps {
  totalDocuments: number;
  completedDocuments: number;
  quizUnlocked: boolean;
}

export const DocumentsProgressHeader: React.FC<DocumentsProgressHeaderProps> = ({
  totalDocuments,
  completedDocuments,
  quizUnlocked,
}) => {
  const progressPercent = totalDocuments > 0 
    ? Math.round((completedDocuments / totalDocuments) * 100) 
    : 100;
  
  const allComplete = completedDocuments === totalDocuments;

  return (
    <div className="space-y-4">
      {/* Progress bar section */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-medium">Documents Required</span>
        </div>
        <Badge 
          variant={allComplete ? "default" : "secondary"}
          className={cn(
            "transition-all duration-300",
            allComplete && "bg-green-600"
          )}
        >
          {completedDocuments} / {totalDocuments}
        </Badge>
      </div>
      
      <div className="relative">
        <Progress 
          value={progressPercent} 
          className={cn(
            "h-3 transition-all duration-500",
            allComplete && "bg-green-100 dark:bg-green-900/30"
          )}
        />
        
        {/* Animated checkmarks along progress */}
        <div className="absolute inset-0 flex items-center">
          {Array.from({ length: totalDocuments }).map((_, idx) => {
            const position = ((idx + 1) / totalDocuments) * 100;
            const isComplete = idx < completedDocuments;
            
            return (
              <motion.div
                key={idx}
                className="absolute"
                style={{ left: `calc(${position}% - 8px)` }}
                initial={false}
                animate={isComplete ? { scale: [0, 1.3, 1], opacity: 1 } : { scale: 1, opacity: 0.3 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center",
                  isComplete 
                    ? "bg-green-600 text-white" 
                    : "bg-muted border-2 border-muted-foreground/20"
                )}>
                  {isComplete && <CheckCircle2 className="h-3 w-3" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quiz unlock status */}
      <AnimatePresence mode="wait">
        {allComplete ? (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <Unlock className="h-5 w-5 text-green-600" />
            </motion.div>
            <span className="font-medium text-green-800 dark:text-green-400">
              Documents complete — Quiz unlocked!
            </span>
            <Sparkles className="h-4 w-4 text-green-600" />
          </motion.div>
        ) : (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50 border border-muted"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Lock className="h-5 w-5 text-muted-foreground" />
            </motion.div>
            <span className="text-sm text-muted-foreground">
              Complete all documents to unlock the Quiz
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
