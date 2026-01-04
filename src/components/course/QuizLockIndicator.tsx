import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizLockIndicatorProps {
  isLocked: boolean;
  documentsRequired: number;
  documentsCompleted: number;
  lockReason?: string;
}

export const QuizLockIndicator: React.FC<QuizLockIndicatorProps> = ({
  isLocked,
  documentsRequired,
  documentsCompleted,
  lockReason = "Complete all required documents",
}) => {
  const justUnlocked = !isLocked && documentsCompleted === documentsRequired;

  return (
    <div className={cn(
      "rounded-lg p-4 transition-all duration-500",
      isLocked 
        ? "bg-muted/50 border border-muted" 
        : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
    )}>
      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait">
          {isLocked ? (
            <motion.div
              key="locked"
              initial={{ scale: 0 }}
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ 
                scale: { duration: 2, repeat: Infinity },
                rotate: { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-muted rounded-full p-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="unlocked"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative"
            >
              {justUnlocked && (
                <motion.div
                  className="absolute -inset-2"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 1 }}
                >
                  <Sparkles className="h-full w-full text-green-500" />
                </motion.div>
              )}
              <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-2">
                <Unlock className="h-5 w-5 text-green-600" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium",
              isLocked ? "text-muted-foreground" : "text-green-700 dark:text-green-400"
            )}>
              {isLocked ? 'Quiz Locked' : 'Quiz Unlocked'}
            </span>
            {!isLocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </motion.div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLocked 
              ? `${lockReason} (${documentsCompleted}/${documentsRequired})`
              : "Ready to test your knowledge"
            }
          </p>
        </div>
      </div>

      {/* Progress dots */}
      {documentsRequired > 0 && (
        <div className="flex items-center gap-1 mt-3">
          {Array.from({ length: documentsRequired }).map((_, idx) => (
            <motion.div
              key={idx}
              initial={false}
              animate={idx < documentsCompleted ? {
                scale: [1, 1.3, 1],
                backgroundColor: 'rgb(22, 163, 74)'
              } : {}}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                idx < documentsCompleted 
                  ? "bg-green-600" 
                  : "bg-muted-foreground/20"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
