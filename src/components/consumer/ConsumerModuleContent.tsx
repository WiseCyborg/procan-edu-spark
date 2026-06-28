import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { useState, useMemo } from 'react';
import { EmailCaptureModal } from './EmailCaptureModal';
import { markdownToHtml } from '@/utils/markdown-to-html';
import { sanitizeHtml } from '@/utils/sanitize-html';

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

  const formattedContent = useMemo(() => {
    if (!module.content) return '';
    const html = markdownToHtml(module.content);
    return sanitizeHtml(html);
  }, [module.content]);

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
        {module.video_url ? (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <iframe
              src={module.video_url}
              title={module.title}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted/40 rounded-lg border border-border flex flex-col items-center justify-center gap-3 text-center p-6">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-foreground">Video Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-1">This module's video is being produced. The written content below covers all learning objectives.</p>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div 
          className="prose prose-sm md:prose-base max-w-none dark:prose-invert 
                     prose-p:mb-4 prose-p:leading-relaxed
                     prose-headings:mt-6 prose-headings:mb-3 prose-headings:font-semibold 
                     prose-h1:text-2xl prose-h1:text-primary prose-h2:text-xl prose-h3:text-lg
                     prose-li:my-1 prose-ul:my-4 prose-ol:my-4
                     prose-strong:text-foreground prose-strong:font-semibold
                     prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
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
