import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { useState } from 'react';
import { EmailCaptureModal } from './EmailCaptureModal';

interface Module {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  module_number: number;
  estimated_minutes: number;
}

interface ConsumerModuleContentProps {
  module: Module;
  isComplete: boolean;
  onMarkComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  isLastModule: boolean;
  courseId: string;
  completedCount: number;
  totalCount: number;
}

export const ConsumerModuleContent = ({
  module,
  isComplete,
  onMarkComplete,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  isLastModule,
  courseId,
  completedCount,
  totalCount
}: ConsumerModuleContentProps) => {
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  const handleComplete = () => {
    onMarkComplete();
    
    // If this is the last module and all are now complete, show email capture
    if (isLastModule && completedCount + 1 === totalCount) {
      setShowEmailCapture(true);
    } else if (hasNext) {
      onNext();
    }
  };

  return (
    <>
      <Card className="p-6 md:p-8 space-y-6">
        {/* Module Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Module {module.module_number}</span>
            <span>•</span>
            <span>{module.estimated_minutes} minutes</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{module.title}</h1>
        </div>

        {/* Video Section */}
        {module.video_url && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <iframe
              src={module.video_url}
              title={module.title}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Content Section */}
        <div 
          className="prose prose-slate dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: module.content }}
        />

        {/* Completion Status */}
        {isComplete && (
          <div className="flex items-center gap-2 p-4 bg-primary/10 text-primary rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Module completed</span>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
          {hasPrevious && (
            <Button
              variant="outline"
              onClick={onPrevious}
              className="sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}

          <div className="flex-1" />

          {!isComplete && (
            <Button
              onClick={handleComplete}
              className="sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}

          {isComplete && hasNext && (
            <Button
              onClick={onNext}
              className="sm:w-auto"
            >
              Next Module
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {isComplete && isLastModule && (
            <Button
              onClick={() => setShowEmailCapture(true)}
              className="sm:w-auto"
            >
              <Award className="h-4 w-4 mr-2" />
              Get Certificate
            </Button>
          )}
        </div>
      </Card>

      <EmailCaptureModal
        open={showEmailCapture}
        onOpenChange={setShowEmailCapture}
        courseId={courseId}
      />
    </>
  );
};
