import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, Video as VideoIcon, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import DOMPurify from 'dompurify';
import { PaginatedContent } from './PaginatedContent';

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoType: 'embed' | 'file' | 'none';
  videoUrl?: string;
  htmlSummary: string;
  markdownContent?: string; // Raw markdown for paginated display
  resourceLinks: { label: string; href: string }[];
}

export interface CourseConfig {
  id: string;
  title: string;
  tagLabel: string;
  estimatedMinutes: number;
  lessons: Lesson[];
}

interface SCORMStylePlayerProps {
  config: CourseConfig;
  onCourseComplete?: () => void;
  onLessonComplete?: (lessonId: string) => void;
  onDocumentOpen?: (docId: string) => void;
}

export const SCORMStylePlayer: React.FC<SCORMStylePlayerProps> = ({
  config,
  onCourseComplete,
  onLessonComplete,
  onDocumentOpen,
}) => {
  const storageKey = `procan-course-progress:${config.id}`;
  const sectionStorageKey = `procan-section-progress:${config.id}`;
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [sectionByLesson, setSectionByLesson] = useState<Record<string, number>>({});

  // Load progress from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setCompletedLessonIds(JSON.parse(raw));
      }
      // Load section progress
      const sectionRaw = localStorage.getItem(sectionStorageKey);
      if (sectionRaw) {
        setSectionByLesson(JSON.parse(sectionRaw));
      }
    } catch (e) {
      console.warn('Course progress load failed', e);
    }
  }, [storageKey, sectionStorageKey]);

  // Save progress to localStorage
  const saveProgress = (lessonIds: string[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(lessonIds));
    } catch (e) {
      console.warn('Course progress save failed', e);
    }
  };

  // Save section progress
  const saveSectionProgress = (sections: Record<string, number>) => {
    try {
      localStorage.setItem(sectionStorageKey, JSON.stringify(sections));
    } catch (e) {
      console.warn('Section progress save failed', e);
    }
  };

  // Handle section change within a lesson
  const handleSectionChange = (lessonId: string, page: number) => {
    const newSections = { ...sectionByLesson, [lessonId]: page };
    setSectionByLesson(newSections);
    saveSectionProgress(newSections);
  };

  // Calculate progress percentage
  const getProgressPercent = () => {
    if (!config.lessons.length) return 0;
    const completedCount = config.lessons.filter(l => 
      completedLessonIds.includes(l.id)
    ).length;
    return Math.round((completedCount / config.lessons.length) * 100);
  };

  // Convert Vimeo URL to embeddable format
  const getVimeoEmbedUrl = (url: string): string => {
    // Extract video ID: matches vimeo.com/12345 or vimeo.com/video/12345
    const idMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (!idMatch) return url;
    
    const videoId = idMatch[1];
    
    // Extract hash parameter if present: ?h=abc123
    const hashMatch = url.match(/[?&]h=([a-zA-Z0-9]+)/);
    const hash = hashMatch ? hashMatch[1] : null;
    
    // Build embed URL with hash if available
    return `https://player.vimeo.com/video/${videoId}${hash ? `?h=${hash}&` : '?'}badge=0&autopause=0&player_id=0&app_id=58479`;
  };

  // Mark lesson as completed
  const markLessonCompleted = (lessonId: string) => {
    if (!completedLessonIds.includes(lessonId)) {
      const newCompleted = [...completedLessonIds, lessonId];
      setCompletedLessonIds(newCompleted);
      saveProgress(newCompleted);
      
      if (onLessonComplete) {
        onLessonComplete(lessonId);
      }

      toast({
        title: "Lesson Complete!",
        description: "Progress saved. Continue to the next lesson.",
      });
    }
  };

  // Check if all lessons are complete
  useEffect(() => {
    const progress = getProgressPercent();
    if (progress === 100 && onCourseComplete) {
      onCourseComplete();
    }
  }, [completedLessonIds, config.lessons.length]);

  const activeLesson = config.lessons[activeLessonIndex];
  const progress = getProgressPercent();
  const isLessonCompleted = (lessonId: string) => completedLessonIds.includes(lessonId);

  // Handle document link clicks
  const handleResourceClick = (href: string) => {
    if (href.startsWith('/docs/')) {
      const docId = href.replace('/docs/', '');
      if (onDocumentOpen) {
        onDocumentOpen(docId);
      }
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 max-w-7xl mx-auto p-4 bg-background rounded-2xl border shadow-lg">
      {/* Sidebar */}
      <aside className="bg-card rounded-xl p-4 border shadow-sm lg:max-h-[640px] lg:overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">{config.title}</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Approx. {config.estimatedMinutes} minutes · {config.lessons.length} lesson(s)
        </p>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progress}% complete</p>
        </div>

        {/* Lesson List */}
        <ul className="space-y-1">
          {config.lessons.map((lesson, idx) => {
            const isActive = idx === activeLessonIndex;
            const completed = isLessonCompleted(lesson.id);
            
            return (
              <li
                key={lesson.id}
                onClick={() => setActiveLessonIndex(idx)}
                className={`
                  p-2 rounded-lg cursor-pointer transition-colors border
                  ${isActive ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-muted'}
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm flex-1">{lesson.title}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                    {completed && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Main Content */}
      <section className="bg-card rounded-xl p-4 border shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{activeLesson.title}</h1>
            <span className="text-sm text-muted-foreground">
              Lesson {activeLessonIndex + 1} of {config.lessons.length}
            </span>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {config.tagLabel}
          </Badge>
        </div>

        {/* Video Player */}
        <div className="relative rounded-xl overflow-hidden bg-muted border aspect-video flex items-center justify-center">
          {activeLesson.videoType === 'embed' && activeLesson.videoUrl ? (
            <iframe
              src={activeLesson.videoUrl.includes('vimeo.com') 
                ? getVimeoEmbedUrl(activeLesson.videoUrl)
                : activeLesson.videoUrl}
              title={activeLesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : activeLesson.videoType === 'file' && activeLesson.videoUrl ? (
            <video controls className="w-full h-full">
              <source src={activeLesson.videoUrl} />
              Your browser does not support HTML5 video.
            </video>
          ) : (
            <div className="text-center p-8">
              <VideoIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No video for this lesson. Review the summary and resources below.
              </p>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          {/* Lesson Summary - Now Paginated */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Lesson Content</h3>
              {activeLesson.markdownContent ? (
                <PaginatedContent
                  content={activeLesson.markdownContent}
                  initialPage={sectionByLesson[activeLesson.id] || 0}
                  onPageChange={(page) => handleSectionChange(activeLesson.id, page)}
                  onComplete={() => markLessonCompleted(activeLesson.id)}
                />
              ) : (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(activeLesson.htmlSummary) 
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Resources */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Resources & Documents</h3>
              {activeLesson.resourceLinks.length > 0 ? (
                <ul className="space-y-2">
                  {activeLesson.resourceLinks.map((link, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => handleResourceClick(link.href)}
                        className="text-sm text-primary hover:underline text-left"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No documents attached yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {progress === 100 ? (
              <span className="text-primary font-medium">
                ✅ Course complete. You may proceed to the quiz.
              </span>
            ) : (
              "Complete each lesson, then continue to the quiz."
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveLessonIndex(activeLessonIndex - 1)}
              disabled={activeLessonIndex === 0}
            >
              ◀ Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveLessonIndex(activeLessonIndex + 1)}
              disabled={activeLessonIndex === config.lessons.length - 1}
            >
              Next ▶
            </Button>
            <Button
              variant={isLessonCompleted(activeLesson.id) ? "secondary" : "default"}
              size="sm"
              onClick={() => markLessonCompleted(activeLesson.id)}
            >
              {isLessonCompleted(activeLesson.id) ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Completed
                </>
              ) : (
                "Mark Complete"
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
