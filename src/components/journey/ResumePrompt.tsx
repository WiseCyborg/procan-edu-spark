import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useCourseState, getResumeMessageFromState } from '@/hooks/useCourseState';
import { Skeleton } from '@/components/ui/skeleton';

const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

export const ResumePrompt = () => {
  const navigate = useNavigate();
  const { courseState, isLoading, isError } = useCourseState(COURSE_ID);
  
  // Safe: getResumeMessageFromState handles null/undefined/error states
  const resumeInfo = getResumeMessageFromState(courseState);

  // Show loading skeleton while fetching
  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-32 mt-4" />
          </div>
        </div>
      </Card>
    );
  }

  // Don't crash on error - just hide the component
  if (isError || !resumeInfo) {
    console.log('[ResumePrompt] No resume info available', { isError, hasResumeInfo: !!resumeInfo });
    return null;
  }

  const handleResume = () => {
    console.log('[ResumePrompt] Navigating to:', resumeInfo.route);
    navigate(resumeInfo.route);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <RefreshCw className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {resumeInfo.title}
          </h3>
          <p className="text-muted-foreground mb-4">
            {resumeInfo.message}
          </p>
          <Button onClick={handleResume} className="gap-2">
            {resumeInfo.action}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
