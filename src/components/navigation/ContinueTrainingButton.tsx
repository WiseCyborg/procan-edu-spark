import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Award, CheckCircle2 } from 'lucide-react';
import { useContinueTraining } from '@/hooks/useContinueTraining';
import { cn } from '@/lib/utils';

interface ContinueTrainingButtonProps {
  variant?: 'default' | 'hero' | 'compact';
  className?: string;
  showDescription?: boolean;
}

export const ContinueTrainingButton: React.FC<ContinueTrainingButtonProps> = ({
  variant = 'default',
  className,
  showDescription = true
}) => {
  const { 
    continueTraining, 
    ctaLabel, 
    ctaDescription, 
    status, 
    isLoading,
    rvtProgress 
  } = useContinueTraining();

  if (isLoading) {
    return (
      <Button disabled className={cn('animate-pulse', className)}>
        Loading...
      </Button>
    );
  }

  const getIcon = () => {
    switch (status) {
      case 'not_started':
        return <Play className="h-5 w-5" />;
      case 'rvt_complete':
      case 'all_complete':
        return <Award className="h-5 w-5" />;
      default:
        return <ArrowRight className="h-5 w-5" />;
    }
  };

  if (variant === 'hero') {
    return (
      <div className={cn('text-center', className)}>
        <Button 
          onClick={continueTraining}
          size="lg"
          className="px-8 py-6 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
        >
          {getIcon()}
          <span className="ml-2">{ctaLabel}</span>
        </Button>
        {showDescription && (
          <p className="text-sm text-muted-foreground mt-3">
            {ctaDescription}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Button 
        onClick={continueTraining}
        size="sm"
        className={className}
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    );
  }

  // Default variant
  return (
    <div className={cn('space-y-2', className)}>
      <Button 
        onClick={continueTraining}
        className="w-full"
        size="lg"
      >
        {getIcon()}
        <span className="ml-2">{ctaLabel}</span>
      </Button>
      {showDescription && (
        <p className="text-xs text-center text-muted-foreground">
          {ctaDescription}
        </p>
      )}
      {status === 'in_progress' && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-primary" />
          <span>{rvtProgress.completed}/{rvtProgress.total} RVT modules complete</span>
        </div>
      )}
    </div>
  );
};

export default ContinueTrainingButton;
