import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, List, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContinueTraining } from '@/hooks/useContinueTraining';

interface ResumeTrainingButtonsProps {
  showModuleListButton?: boolean;
  variant?: 'default' | 'compact' | 'hero';
  className?: string;
}

/**
 * Two distinct buttons:
 * 1. "Resume where I left off" - navigates to exact position (tab + page)
 * 2. "Go to module list" - navigates to course overview
 * 
 * This prevents confusion between resuming and browsing.
 */
export const ResumeTrainingButtons: React.FC<ResumeTrainingButtonsProps> = ({
  showModuleListButton = true,
  variant = 'default',
  className = '',
}) => {
  const navigate = useNavigate();
  const { 
    continueTraining, 
    continueUrl, 
    ctaLabel, 
    ctaDescription, 
    status, 
    rvtProgress,
    isLoading 
  } = useContinueTraining();

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button disabled variant="outline">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </Button>
      </div>
    );
  }

  const handleResumeClick = () => {
    continueTraining();
  };

  const handleModuleListClick = () => {
    navigate('/course');
  };

  // Determine button labels based on status
  const getResumeLabel = () => {
    if (status === 'not_started') return 'Start Training';
    if (status === 'all_complete') return 'View Certificates';
    if (status === 'rvt_complete') return 'Take RVT Exam';
    return 'Resume where I left off';
  };

  const getResumeIcon = () => {
    if (status === 'not_started') return PlayCircle;
    return PlayCircle;
  };

  const ResumeIcon = getResumeIcon();

  if (variant === 'hero') {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <Button 
          size="lg" 
          onClick={handleResumeClick}
          className="w-full md:w-auto shadow-lg"
        >
          <ResumeIcon className="h-5 w-5 mr-2" />
          {getResumeLabel()}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
        
        {showModuleListButton && status !== 'all_complete' && (
          <Button 
            size="lg" 
            variant="outline" 
            onClick={handleModuleListClick}
            className="w-full md:w-auto"
          >
            <List className="h-5 w-5 mr-2" />
            Go to module list
          </Button>
        )}
        
        {status !== 'not_started' && status !== 'all_complete' && (
          <p className="text-sm text-muted-foreground text-center md:text-left">
            {ctaDescription}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button size="sm" onClick={handleResumeClick}>
          <ResumeIcon className="h-4 w-4 mr-1" />
          {status === 'not_started' ? 'Start' : 'Resume'}
        </Button>
        {showModuleListButton && status !== 'all_complete' && (
          <Button size="sm" variant="ghost" onClick={handleModuleListClick}>
            <List className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${className}`}>
      <Button 
        onClick={handleResumeClick}
        className="flex-1 sm:flex-none"
      >
        <ResumeIcon className="h-4 w-4 mr-2" />
        {getResumeLabel()}
        {rvtProgress.percentage > 0 && rvtProgress.percentage < 100 && (
          <Badge variant="secondary" className="ml-2">
            {rvtProgress.percentage}%
          </Badge>
        )}
      </Button>
      
      {showModuleListButton && status !== 'all_complete' && status !== 'not_started' && (
        <Button 
          variant="outline" 
          onClick={handleModuleListClick}
          className="flex-1 sm:flex-none"
        >
          <List className="h-4 w-4 mr-2" />
          Go to module list
        </Button>
      )}
    </div>
  );
};

export default ResumeTrainingButtons;
