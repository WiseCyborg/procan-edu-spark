import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useJourneyState } from '@/hooks/useJourneyState';

export const ResumePrompt = () => {
  const navigate = useNavigate();
  const { getResumeMessage, incrementResumePrompt } = useJourneyState();
  
  const resumeInfo = getResumeMessage();

  if (!resumeInfo) return null;

  const handleResume = () => {
    incrementResumePrompt();
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
