import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  completed: boolean;
  current: boolean;
}

interface ProgressTrackerProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
}) => {
  const steps: Step[] = stepTitles.map((title, index) => ({
    number: index + 1,
    title,
    completed: index + 1 < currentStep,
    current: index + 1 === currentStep,
  }));

  return (
    <div className="mb-8">
      {/* Desktop Progress Bar */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                    ${step.completed ? 'bg-green-500 border-green-500 text-white' : ''}
                    ${step.current ? 'bg-primary border-primary text-primary-foreground' : ''}
                    ${!step.completed && !step.current ? 'bg-background border-border text-muted-foreground' : ''}
                  `}
                >
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{step.number}</span>
                  )}
                </div>
                <p
                  className={`
                    mt-2 text-sm text-center max-w-[100px]
                    ${step.current ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                  `}
                >
                  {step.title}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-border relative top-[-20px]">
                  <div
                    className={`h-full transition-all ${step.completed ? 'bg-green-500' : 'bg-border'}`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile Progress Dots */}
      <div className="md:hidden">
        <div className="flex items-center justify-center gap-2 mb-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`
                w-2 h-2 rounded-full transition-all
                ${step.completed ? 'bg-green-500 w-3 h-3' : ''}
                ${step.current ? 'bg-primary w-4 h-4' : ''}
                ${!step.completed && !step.current ? 'bg-border' : ''}
              `}
            />
          ))}
        </div>
        <p className="text-center text-sm font-semibold">
          Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
        </p>
      </div>
    </div>
  );
};
