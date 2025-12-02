import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

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

  const getCalloutPosition = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const position = current.position || 'bottom';
    const padding = 20;

    switch (position) {
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
        
        {/* Spotlight cutout */}
        {targetRect && (
          <div
            className="absolute bg-transparent border-4 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] animate-pulse"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              pointerEvents: 'auto'
            }}
          />
        )}
      </div>

      {/* Tour Callout */}
      <div 
        className="fixed z-[70] w-full max-w-md px-4"
        style={getCalloutPosition()}
      >
        <Card>
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
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentStep
                        ? 'bg-primary w-6'
                        : 'bg-muted w-1.5'
                    }`}
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
      </div>
    </>
  );
};
