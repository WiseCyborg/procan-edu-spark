import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ConsumerModuleContent } from '@/components/consumer/ConsumerModuleContent';
import { ModuleNavigation } from '@/components/consumer/ModuleNavigation';
import { ProgressBar } from '@/components/consumer/ProgressBar';
import { useConsumerProgress } from '@/hooks/useConsumerProgress';
import { Button } from '@/components/ui/button';
import { Loader2, X, Menu } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Course {
  id: string;
  title: string;
  description: string;
  module_count: number;
  completion_badge_name: string;
}

interface Module {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  module_number: number;
  estimated_minutes: number;
}

const ConsumerCourse = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    completedModules,
    markModuleComplete,
    isModuleComplete,
    completionPercentage,
    enrollmentId,
    completeCourse,
  } = useConsumerProgress(courseId || '');

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) return;

      try {
        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, description, module_count, completion_badge_name')
          .eq('id', courseId)
          .eq('is_public', true)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch modules (bypassing type issues)
        const modulesQuery = (supabase as any)
          .from('course_modules')
          .select('id, title, content, video_url, module_number, estimated_minutes')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .order('module_number', { ascending: true });

        const modulesResult = await modulesQuery;
        if (modulesResult.error) throw modulesResult.error;
        setModules(modulesResult.data || []);
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  const currentModule = modules[currentModuleIndex];

  const handleNextModule = () => {
    if (currentModuleIndex < modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
      setMobileMenuOpen(false);
      window.scrollTo(0, 0);
    }
  };

  const handlePreviousModule = () => {
    if (currentModuleIndex > 0) {
      setCurrentModuleIndex(currentModuleIndex - 1);
      setMobileMenuOpen(false);
      window.scrollTo(0, 0);
    }
  };

  const handleModuleSelect = (index: number) => {
    setCurrentModuleIndex(index);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleMarkComplete = () => {
    if (currentModule) {
      markModuleComplete(currentModule.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course || modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <h2 className="text-2xl font-bold text-foreground">Course not found</h2>
        <p className="text-muted-foreground">This course may not be available yet.</p>
        <Button onClick={() => navigate('/consumer-education')}>
          Back to Courses
        </Button>
      </div>
    );
  }

  const navigationContent = (
    <ModuleNavigation
      course={course}
      modules={modules}
      currentModuleIndex={currentModuleIndex}
      completedModules={completedModules}
      onModuleSelect={handleModuleSelect}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <DialogContent className="w-full max-w-sm p-0">
                  {navigationContent}
                </DialogContent>
              </Dialog>
              
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-foreground truncate text-sm md:text-base">
                  {course.title}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  Module {currentModuleIndex + 1} of {modules.length}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/consumer-education')}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <ProgressBar progress={completionPercentage} />
      </div>

      {/* Main Content */}
      <div className="container mx-auto flex gap-6 py-6">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-80 flex-shrink-0">
          <div className="sticky top-24">
            {navigationContent}
          </div>
        </aside>

        {/* Module Content */}
        <main className="flex-1 min-w-0">
          <ConsumerModuleContent
            module={currentModule}
            isComplete={isModuleComplete(currentModule.id)}
            onMarkComplete={handleMarkComplete}
            onNext={handleNextModule}
            onPrevious={handlePreviousModule}
            hasNext={currentModuleIndex < modules.length - 1}
            hasPrevious={currentModuleIndex > 0}
            isLastModule={currentModuleIndex === modules.length - 1}
            courseId={courseId || ''}
            completedCount={completedModules.length}
            totalCount={modules.length}
          />
        </main>
      </div>
    </div>
  );
};

export default ConsumerCourse;
