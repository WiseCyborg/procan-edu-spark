import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronRight, ChevronLeft, CheckCircle, Loader2, Hand } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type StepType = 'highlight' | 'action' | 'observation';

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element
  position?: 'top' | 'right' | 'bottom' | 'left';
  type: StepType;
  // For 'action' type - what action must be completed
  actionType?: 'click' | 'type' | 'select' | 'upload';
  // For 'observation' type - what state to wait for
  observationCheck?: () => boolean;
  // Custom validator function
  validateAction?: () => Promise<boolean> | boolean;
  // Hint for the user
  actionHint?: string;
  // Is this step optional/skippable?
  skippable?: boolean;
}

interface InteractiveWalkthroughProps {
  steps: WalkthroughStep[];
  onComplete: () => void;
  onSkip: () => void;
  walkthroughId: string; // For persistence
}

export const InteractiveWalkthrough: React.FC<InteractiveWalkthroughProps> = ({
  steps,
  onComplete,
  onSkip,
  walkthroughId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const current = steps[currentStep];

  // Track target element position
  useEffect(() => {
    if (!isActive || !current?.target) return;

    const updateTargetRect = () => {
      const element = document.querySelector(current.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateTargetRect();
    const interval = setInterval(updateTargetRect, 500);
    window.addEventListener('resize', updateTargetRect);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [currentStep, current?.target, isActive]);

  // Listen for user actions on target element
  useEffect(() => {
    if (!isActive || !current?.target || current.type !== 'action') return;

    const element = document.querySelector(current.target);
    if (!element) return;

    const handleAction = async (e: Event) => {
      // For click actions
      if (current.actionType === 'click') {
        setIsValidating(true);
        
        // If custom validator exists, use it
        if (current.validateAction) {
          // Wait a bit for state to update
          setTimeout(async () => {
            const isValid = await current.validateAction!();
            if (isValid) {
              setActionCompleted(true);
            }
            setIsValidating(false);
          }, 300);
        } else {
          setActionCompleted(true);
          setIsValidating(false);
        }
      }
    };

    const handleInput = async (e: Event) => {
      if (current.actionType === 'type') {
        const input = e.target as HTMLInputElement;
        if (input.value.length > 0) {
          if (current.validateAction) {
            const isValid = await current.validateAction();
            setActionCompleted(isValid);
          } else {
            setActionCompleted(true);
          }
        }
      }
    };

    element.addEventListener('click', handleAction);
    element.addEventListener('input', handleInput);
    element.addEventListener('change', handleAction);

    return () => {
      element.removeEventListener('click', handleAction);
      element.removeEventListener('input', handleInput);
      element.removeEventListener('change', handleAction);
    };
  }, [currentStep, current, isActive]);

  // For observation steps, poll the check function
  useEffect(() => {
    if (!isActive || current?.type !== 'observation' || !current.observationCheck) return;

    const checkObservation = () => {
      if (current.observationCheck!()) {
        setActionCompleted(true);
      }
    };

    checkObservation();
    const interval = setInterval(checkObservation, 500);
    return () => clearInterval(interval);
  }, [currentStep, current, isActive]);

  // Reset action completed when step changes
  useEffect(() => {
    setActionCompleted(false);
  }, [currentStep]);

  // Keyboard navigation (limited based on step type)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' && canAdvance) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, actionCompleted]);

  const canAdvance = current?.type === 'highlight' || actionCompleted || current?.skippable;

  const handleNext = () => {
    if (!canAdvance) return;
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark walkthrough as completed
      localStorage.setItem(`walkthrough-${walkthroughId}`, 'completed');
      setIsActive(false);
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsActive(false);
    onSkip();
  };

  const getSmartPosition = useCallback((rect: DOMRect | null, preferredPosition: string) => {
    if (!rect) return preferredPosition;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = 400;
    const cardHeight = 280;
    const padding = 24;
    
    switch (preferredPosition) {
      case 'bottom':
        if (rect.bottom + cardHeight + padding > viewportHeight) return 'top';
        break;
      case 'top':
        if (rect.top - cardHeight - padding < 0) return 'bottom';
        break;
      case 'right':
        if (rect.right + cardWidth + padding > viewportWidth) return 'left';
        break;
      case 'left':
        if (rect.left - cardWidth - padding < 0) return 'right';
        break;
    }
    
    return preferredPosition;
  }, []);

  if (!isActive || steps.length === 0) return null;

  const smartPosition = getSmartPosition(targetRect, current.position || 'bottom');

  const getCalloutPosition = () => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const padding = 24;

    switch (smartPosition) {
      case 'top':
        return {
          top: `${targetRect.top - padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translate(-50%, -100%)'
        };
      case 'right':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: 'translateY(-50%)'
        };
      case 'bottom':
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - padding}px`,
          transform: 'translate(-100%, -50%)'
        };
      default:
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
    }
  };

  const getStepTypeLabel = () => {
    switch (current.type) {
      case 'action':
        return actionCompleted ? (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" /> Action completed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600">
            <Hand className="h-3 w-3" /> Action required
          </span>
        );
      case 'observation':
        return actionCompleted ? (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" /> Detected
          </span>
        ) : (
          <span className="text-muted-foreground">Waiting...</span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop with spotlight */}
      <div className="fixed inset-0 z-[60]" style={{ pointerEvents: 'none' }}>
        <div className="absolute inset-0 bg-black/60" />
        
        <AnimatePresence mode="wait">
          {targetRect && (
            <motion.div
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bg-transparent rounded-lg"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                pointerEvents: 'auto'
              }}
            >
              <motion.div
                className={`absolute inset-0 rounded-lg border-2 ${
                  current.type === 'action' && !actionCompleted 
                    ? 'border-amber-500' 
                    : actionCompleted 
                      ? 'border-green-500' 
                      : 'border-primary'
                }`}
                animate={{ 
                  boxShadow: [
                    `0 0 0 0 ${current.type === 'action' && !actionCompleted ? 'rgba(245, 158, 11, 0.4)' : 'hsl(var(--primary) / 0.4)'}`,
                    `0 0 0 8px ${current.type === 'action' && !actionCompleted ? 'rgba(245, 158, 11, 0)' : 'hsl(var(--primary) / 0)'}`,
                    `0 0 0 0 ${current.type === 'action' && !actionCompleted ? 'rgba(245, 158, 11, 0)' : 'hsl(var(--primary) / 0)'}`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tour Callout */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed z-[70] w-full max-w-md px-4"
          style={getCalloutPosition()}
        >
          <Card className="shadow-xl border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{current.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSkip}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-muted-foreground mb-3">{current.description}</p>

              {/* Action hint */}
              {current.actionHint && current.type === 'action' && !actionCompleted && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    👉 {current.actionHint}
                  </p>
                </div>
              )}

              {/* Step type indicator */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm">{getStepTypeLabel()}</div>
                {isValidating && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>

                <div className="flex gap-1">
                  {steps.map((step, index) => (
                    <motion.div
                      key={index}
                      className="h-1.5 rounded-full"
                      initial={false}
                      animate={{
                        width: index === currentStep ? 24 : 6,
                        backgroundColor: index < currentStep 
                          ? 'hsl(var(--primary))' 
                          : index === currentStep 
                            ? 'hsl(var(--primary))' 
                            : 'hsl(var(--muted))'
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>

                <Button 
                  onClick={handleNext} 
                  size="sm"
                  disabled={!canAdvance}
                  className={!canAdvance ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentStep === steps.length - 1 ? (
                    'Finish'
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
              
              {!canAdvance && current.type === 'action' && (
                <p className="text-xs text-amber-600 text-center mt-3">
                  Complete the action above to continue
                </p>
              )}
              
              {current.skippable && !actionCompleted && (
                <button 
                  onClick={handleNext}
                  className="text-xs text-muted-foreground hover:text-foreground text-center mt-2 w-full underline"
                >
                  Skip this step
                </button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
