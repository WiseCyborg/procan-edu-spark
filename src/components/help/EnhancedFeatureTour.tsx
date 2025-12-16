import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  position?: 'top' | 'right' | 'bottom' | 'left';
}

interface EnhancedFeatureTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export const EnhancedFeatureTour: React.FC<EnhancedFeatureTourProps> = ({
  steps,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const current = steps[currentStep];

  // Calculate smart position to avoid overlapping target
  const getSmartPosition = useCallback((rect: DOMRect | null, preferredPosition: string) => {
    if (!rect) return preferredPosition;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = 400;
    const cardHeight = 250;
    const padding = 24;
    
    // Check if preferred position would cause overlap or go off-screen
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

  useEffect(() => {
    if (!isActive || !current.target) return;

    const element = document.querySelector(current.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      
      // Scroll element into view if not visible
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, current.target, isActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep]);

  if (!isActive || steps.length === 0) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
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

  const smartPosition = getSmartPosition(targetRect, current.position || 'bottom');

  const getCalloutPosition = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
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

  return (
    <>
      {/* Backdrop with spotlight effect */}
      <div className="fixed inset-0 z-[60]" style={{ pointerEvents: 'none' }}>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Animated Spotlight cutout */}
        <AnimatePresence mode="wait">
          {targetRect && (
            <motion.div
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                duration: 0.4 
              }}
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
              {/* Animated pulse border */}
              <motion.div
                className="absolute inset-0 rounded-lg border-2 border-primary"
                animate={{ 
                  boxShadow: [
                    '0 0 0 0 hsl(var(--primary) / 0.4)',
                    '0 0 0 8px hsl(var(--primary) / 0)',
                    '0 0 0 0 hsl(var(--primary) / 0)'
                  ]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeOut"
                }}
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
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30 
          }}
          className="fixed z-[70] w-full max-w-md px-4"
          style={getCalloutPosition()}
        >
          <Card className="shadow-xl border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{current.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSkip}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-muted-foreground mb-6">{current.description}</p>

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
                  {steps.map((_, index) => (
                    <motion.div
                      key={index}
                      className="h-1.5 rounded-full"
                      initial={false}
                      animate={{
                        width: index === currentStep ? 24 : 6,
                        backgroundColor: index === currentStep 
                          ? 'hsl(var(--primary))' 
                          : 'hsl(var(--muted))'
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>

                <Button onClick={handleNext} size="sm">
                  {currentStep === steps.length - 1 ? (
                    'Finish'
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-4">
                Use arrow keys or Escape to navigate
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
};