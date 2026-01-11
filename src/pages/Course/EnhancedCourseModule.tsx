import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Video, FileText, CheckCircle2, ArrowLeft, Info, Lock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getModuleDocuments } from '@/data/moduleDocumentMapping';
import { getDocumentContent, DocumentContent } from '@/data/moduleDocuments';
import { sanitizeHtml } from "@/utils/sanitize-html";
import { markdownToHtml } from "@/utils/markdown-to-html";
import { useUserProgress } from '@/hooks/useUserProgress';
import { useResumeState } from '@/hooks/useResumeState';
import { supabase } from '@/integrations/supabase/client';
import { RegulatorySidebar } from '@/components/regulatory/RegulatorySidebar';
import { SectionProgressNav } from '@/components/course/SectionProgressNav';
import { SectionNavButton } from '@/components/course/SectionNavButton';
import { InteractiveQuiz, QuizQuestion as IQuizQuestion, WeakTopic } from '@/components/course/InteractiveQuiz';
import { QuizResultsWithReview } from '@/components/course/QuizResultsWithReview';
import { WeakAreaPractice } from '@/components/course/WeakAreaPractice';
import { CourseNavigationHeader } from '@/components/course/CourseNavigationHeader';
import { ModuleSidebar } from '@/components/course/ModuleSidebar';
import { MobileNavBar } from '@/components/course/MobileNavBar';
import { CourseCompletionCelebration } from '@/components/course/CourseCompletionCelebration';
import { useModuleNavigation } from '@/hooks/useModuleNavigation';
import { SCORMStylePlayer, CourseConfig } from '@/components/course/SCORMStylePlayer';
import { PaginatedContent } from '@/components/course/PaginatedContent';
import { DocumentReadTracker } from '@/components/course/DocumentReadTracker';
import { DocumentsProgressHeader } from '@/components/course/DocumentsProgressHeader';
import { QuizLockIndicator } from '@/components/course/QuizLockIndicator';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  topic?: string;
  comarRef?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  relatedModules?: string[];
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoType: 'embed' | 'file' | 'none';
  videoUrl?: string;
  htmlSummary: string;
  markdownContent?: string;
  resourceLinks: { label: string; href: string }[];
}

interface ModuleData {
  id: string;
  title: string;
  description: string;
  content: string;
  quiz_questions: QuizQuestion[];
  module_number: number;
  comar_reference?: string;
  video_url?: string;
  lessons?: Lesson[];
}

const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

const EnhancedCourseModule: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'overview');
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(parseInt(searchParams.get('page') || '0'));
  const [overviewComplete, setOverviewComplete] = useState(false);
  const [courseComplete, setCourseComplete] = useState(false);
  const [docsViewed, setDocsViewed] = useState(false);
  const [documentsViewed, setDocumentsViewed] = useState<Set<string>>(new Set());
  const [quizComplete, setQuizComplete] = useState(false);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [showWeakPractice, setShowWeakPractice] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { updateProgress, isModuleCompletedByNumber, canAccessModule, getModuleUUID, getFirstIncompleteModule } = useUserProgress(COURSE_ID);
  const { saveResumeState } = useResumeState(COURSE_ID);
  
  const currentModuleNumber = parseInt(moduleId?.replace('part', '') || '0');

  // Save resume state whenever tab or page changes
  const persistResumeState = useCallback((tab: string, pageIndex: number) => {
    if (!moduleData) return;
    saveResumeState({
      moduleId: moduleData.id,
      moduleNumber: currentModuleNumber,
      lastTab: tab,
      lastPageIndex: pageIndex,
    });
  }, [moduleData, currentModuleNumber, saveResumeState]);

  // Persist on tab change
  useEffect(() => {
    if (moduleData) {
      persistResumeState(activeTab, currentPageIndex);
      // Update URL without navigation
      const params = new URLSearchParams();
      if (activeTab !== 'overview') params.set('tab', activeTab);
      if (currentPageIndex > 0) params.set('page', String(currentPageIndex));
      setSearchParams(params, { replace: true });
    }
  }, [activeTab, currentPageIndex, moduleData]);

  // Handle page change from PaginatedContent
  const handlePageChange = useCallback((pageIndex: number) => {
    setCurrentPageIndex(pageIndex);
  }, []);
  
  // Dynamic modules with actual completion status using proper UUID-based checking
  const modulesWithCompletion = useMemo(() => [
    { id: 'f543fad9-fb96-485c-9ca0-980564acc559', number: 0, title: 'Welcome & Platform Orientation', tier: 'green' as const, isCompleted: isModuleCompletedByNumber(0), isLocked: !canAccessModule(0) },
    { id: 'f31492ad-f497-463f-9e30-9333ff42a54e', number: 1, title: 'Introduction to Maryland Cannabis Laws', tier: 'green' as const, isCompleted: isModuleCompletedByNumber(1), isLocked: !canAccessModule(1) },
    { id: '3b7d23c0-c7d9-48ea-ac75-17e515e6304a', number: 2, title: 'Patient Rights and Privacy', tier: 'green' as const, isCompleted: isModuleCompletedByNumber(2), isLocked: !canAccessModule(2) },
    { id: '949aee25-1254-4dfe-a22b-e17912670ba7', number: 3, title: 'Product Knowledge and Safety', tier: 'green' as const, isCompleted: isModuleCompletedByNumber(3), isLocked: !canAccessModule(3) },
    { id: '14d0aa9f-4436-460c-a76b-52f07ba33bf3', number: 4, title: 'Inventory Management and Tracking', tier: 'green' as const, isCompleted: isModuleCompletedByNumber(4), isLocked: !canAccessModule(4) },
    { id: '00daed9a-9d63-4b21-ae90-7444816cb783', number: 5, title: 'Customer Service Excellence', tier: 'green' as const, isCompleted: isModuleCompletedByNumber(5), isLocked: !canAccessModule(5) },
    { id: '9b4ccbb6-e96a-4d7e-9862-d33082cf35dc', number: 6, title: 'Security, Safety, and Drug-Free Workplace', tier: 'green' as const, isCompleted: isModuleCompletedByNumber(6), isLocked: !canAccessModule(6) },
    { id: 'b610259f-7bd4-4f77-9350-7c2c29939432', number: 7, title: 'Laboratory Testing and Quality Control', tier: 'yellow' as const, isCompleted: isModuleCompletedByNumber(7), isLocked: !canAccessModule(7) },
    { id: 'dbacc5bc-e14c-470a-a0ba-852df2b41220', number: 8, title: 'Dosage Guidelines and Patient Consultation', tier: 'yellow' as const, isCompleted: isModuleCompletedByNumber(8), isLocked: !canAccessModule(8) },
    { id: 'b49e8150-f795-4d6f-a501-35d5e1f5aacf', number: 9, title: 'Point of Sale Systems and Transactions', tier: 'yellow' as const, isCompleted: isModuleCompletedByNumber(9), isLocked: !canAccessModule(9) },
    { id: '7c10652a-202b-459a-b02c-9020906b1888', number: 10, title: 'Medical Cannabis and Drug Interactions', tier: 'yellow' as const, isCompleted: isModuleCompletedByNumber(10), isLocked: !canAccessModule(10) },
    { id: 'f2eaecb3-603b-4f9e-90ea-254f57774b8f', number: 11, title: 'Cannabis Cultivation Basics', tier: 'yellow' as const, isCompleted: isModuleCompletedByNumber(11), isLocked: !canAccessModule(11) },
    { id: 'f39ac55c-6ee4-4a49-a739-8a0bb6869fc8', number: 12, title: 'Product Packaging, Labeling, and Diversion Prevention', tier: 'yellow' as const, isCompleted: isModuleCompletedByNumber(12), isLocked: !canAccessModule(12) },
    { id: '3f0bad34-49ef-4ed7-8ade-6785dd35719a', number: 13, title: 'Handling Cash and Banking', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(13), isLocked: !canAccessModule(13) },
    { id: 'b8d16c7f-10e6-40d5-b766-721839038f5e', number: 14, title: 'Age Verification and ID Checking', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(14), isLocked: !canAccessModule(14) },
    { id: 'd1c88334-3ef4-488b-8d9e-cda14d8199f8', number: 15, title: 'Standard Operating Procedures and Record Keeping', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(15), isLocked: !canAccessModule(15) },
    { id: '8c8cc197-94c8-4633-88e2-dc1e73566079', number: 16, title: 'Transportation and Delivery', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(16), isLocked: !canAccessModule(16) },
    { id: 'f0b3a393-7486-4f20-8bab-83711606105e', number: 17, title: 'Waste Disposal and Management', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(17), isLocked: !canAccessModule(17) },
    { id: '0365fffa-3111-400b-bcea-54eacd3f13ef', number: 18, title: 'Final Review and Best Practices', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(18), isLocked: !canAccessModule(18) },
    { id: 'ec62fe97-9a99-4cec-b25c-7ecbedebbd55', number: 19, title: 'Supervising Compliance Operations', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(19), isLocked: !canAccessModule(19) },
    { id: '63d100f8-ad66-4c21-a743-b01df46b94df', number: 20, title: 'Compliance Oversight & Regulatory Reporting', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(20), isLocked: !canAccessModule(20) },
    { id: '0afce5e1-eff1-41c2-b7a6-3a67511c43dc', number: 21, title: 'Team Training & Development Coordination', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(21), isLocked: !canAccessModule(21) },
    { id: '4c8c78c9-6080-40c3-98c0-9930389f771a', number: 22, title: 'Incident Documentation & Investigation', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(22), isLocked: !canAccessModule(22) },
    { id: 'bdbbc605-a8f8-4a65-ba9a-a2451198174c', number: 23, title: 'Advanced Diversion Prevention Strategies', tier: 'red' as const, isCompleted: isModuleCompletedByNumber(23), isLocked: !canAccessModule(23) },
  ], [isModuleCompletedByNumber, canAccessModule]);
  
  // Calculate actual completed count
  const completedCount = useMemo(() => {
    return modulesWithCompletion.filter(m => m.isCompleted).length;
  }, [modulesWithCompletion]);
  
  // Fetch documents for this module
  const moduleDocuments = useMemo(() => {
    const docIds = getModuleDocuments(moduleId || '');
    return docIds.map(id => getDocumentContent(id)).filter((doc): doc is DocumentContent => doc !== undefined);
  }, [moduleId]);
  
  const currentModule = modulesWithCompletion.find(m => m.number === currentModuleNumber);
  
  const { goToPrevious, goToNext, canGoPrevious, canGoNext } = useModuleNavigation({
    currentModule: currentModuleNumber,
    totalModules: modulesWithCompletion.length,
  });

  // Transition handlers for smooth module navigation
  const handleNextModuleWithTransition = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab('overview');
      goToNext();
    }, 300);
  };

  const handlePreviousModuleWithTransition = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab('overview');
      goToPrevious();
    }, 300);
  };

  // Reset state when module changes - ensures fresh start on each module
  useEffect(() => {
    setIsTransitioning(false);
    setActiveTab('overview');
    setOverviewComplete(false);
    setCourseComplete(false);
    setDocsViewed(false);
    setDocumentsViewed(new Set());
    setQuizComplete(false);
    setShowQuizResults(false);
    setShowWeakPractice(false);
    setQuizScore(0);
    setQuizPassed(false);
    setWeakTopics([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [moduleId]);

  // Prerequisite check - prevent URL bypass of locked modules
  useEffect(() => {
    if (!moduleId) return;
    
    const moduleNumber = parseInt(moduleId.replace('part', ''));
    
    // Check if user can access this module
    if (!canAccessModule(moduleNumber)) {
      const firstIncomplete = getFirstIncompleteModule();
      toast({
        title: "Module Locked",
        description: `Please complete Module ${firstIncomplete} before accessing this module.`,
        variant: "destructive",
      });
      navigate(`/course/part${firstIncomplete}`);
    }
  }, [moduleId, canAccessModule, getFirstIncompleteModule, navigate]);

  useEffect(() => {
    if (!moduleId) return;
    
    const fetchModuleData = async () => {
      try {
        const moduleNumber = parseInt(moduleId.replace('part', ''));
        
        // Don't fetch if module is locked
        if (!canAccessModule(moduleNumber)) {
          return;
        }
        
        const { data, error } = await supabase
          .from('course_modules')
          .select('*')
          .eq('course_id', COURSE_ID)
          .eq('module_number', moduleNumber)
          .single();

        if (error) {
          console.error('Error fetching module:', error);
          toast({
            title: "Module not found",
            description: "The requested module could not be loaded.",
            variant: "destructive",
          });
          navigate('/course');
          return;
        }

        if (data) {
          setModuleData({
            id: data.id,
            title: data.title,
            description: data.description,
            content: data.content,
            quiz_questions: (data.quiz_questions as unknown as QuizQuestion[]) || [],
            module_number: data.module_number,
            comar_reference: data.comar_reference,
            video_url: data.video_url
          });
        }
      } catch (error) {
        console.error('Error in fetchModuleData:', error);
        toast({
          title: "Error",
          description: "Failed to load module data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchModuleData();
  }, [moduleId, navigate, canAccessModule]);

  const handleQuizComplete = async (score: number, passed: boolean, timeSpent: number, weakTopicsData?: WeakTopic[]) => {
    setQuizScore(score);
    setQuizPassed(passed);
    setQuizComplete(true);
    setWeakTopics(weakTopicsData || []);
    
    if (weakTopicsData && weakTopicsData.length > 0) {
      setShowQuizResults(true);
    } else if (passed) {
      // Fix: Use moduleData.id (UUID) instead of moduleId (URL param)
      await updateProgress(COURSE_ID, moduleData!.id, true, score);
      toast({
        title: "Congratulations!",
        description: `You passed with ${score}%! Module completed.`,
      });
    }
  };

  const handlePracticeComplete = async (score: number, passed: boolean) => {
    if (passed) {
      // Fix: Use moduleData.id (UUID) instead of moduleId (URL param)
      await updateProgress(COURSE_ID, moduleData!.id, true, score);
      toast({
        title: "Great work!",
        description: `You've mastered the weak areas! Score: ${score}%`,
      });
      setShowWeakPractice(false);
      setShowQuizResults(false);
    } else {
      toast({
        title: "Keep practicing",
        description: `Score: ${score}%. Review the material and try again.`,
        variant: "destructive",
      });
    }
  };

  const handleRetakeQuiz = () => {
    setShowQuizResults(false);
    setShowWeakPractice(false);
    setQuizComplete(false);
    setQuizScore(0);
    setQuizPassed(false);
    setWeakTopics([]);
    setActiveTab('quiz');
  };

  const handlePracticeWeakAreas = () => {
    setShowQuizResults(false);
    setShowWeakPractice(true);
  };

  const getWeakTopicQuestions = (): IQuizQuestion[] => {
    if (!moduleData) return [];
    const weakTopicNames = weakTopics.map(t => t.topic);
    return moduleData.quiz_questions
      .filter(q => q.topic && weakTopicNames.includes(q.topic))
      .map((q, idx) => ({
        id: q.id || `q${idx}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct,
        explanation: q.explanation,
        topic: q.topic,
        comarRef: q.comarRef,
        difficulty: q.difficulty,
        relatedModules: q.relatedModules
      }));
  };

  const calculateSectionProgress = () => {
    let completed = 0;
    if (overviewComplete) completed += 25;
    if (courseComplete) completed += 25;
    if (docsViewed) completed += 25;
    if (quizComplete) completed += 25;
    return completed;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!moduleData || !currentModule) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Module not found.</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => navigate('/course')}>Return to Course</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step gating logic - strict left-to-right progression
  const canAccessCourse = overviewComplete;
  const canAccessDocuments = overviewComplete && courseComplete;
  // Quiz requires docs reviewed, OR no docs exist for this module
  const allDocsReviewed = moduleDocuments.length === 0 || docsViewed;
  const canAccessQuiz = overviewComplete && courseComplete && allDocsReviewed;

  const sections = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BookOpen className="h-4 w-4" />,
      isCompleted: overviewComplete,
      isCurrent: activeTab === 'overview',
      isLocked: false,
    },
    {
      id: 'course',
      label: 'Course',
      icon: <Video className="h-4 w-4" />,
      isCompleted: courseComplete,
      isCurrent: activeTab === 'course',
      isLocked: !canAccessCourse,
      lockReason: 'Complete Overview first',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="h-4 w-4" />,
      isCompleted: docsViewed,
      isCurrent: activeTab === 'documents',
      isLocked: !canAccessDocuments,
      lockReason: 'Complete Course first',
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: <CheckCircle2 className="h-4 w-4" />,
      isCompleted: quizComplete && quizPassed,
      isCurrent: activeTab === 'quiz',
      isLocked: !canAccessQuiz,
      lockReason: 'Review all documents first',
    },
  ];

  // Handle tab changes with gating enforcement
  const handleTabChange = (newTab: string) => {
    if (newTab === 'course' && !canAccessCourse) {
      toast({
        title: "Step Locked",
        description: "Complete the Overview section first.",
        variant: "destructive",
      });
      return;
    }
    if (newTab === 'documents' && !canAccessDocuments) {
      toast({
        title: "Step Locked", 
        description: "Complete the Course section first.",
        variant: "destructive",
      });
      return;
    }
    if (newTab === 'quiz' && !canAccessQuiz) {
      toast({
        title: "Step Locked",
        description: "Review all documents before taking the quiz.",
        variant: "destructive",
      });
      return;
    }
    setActiveTab(newTab);
  };

  // Show quiz results if there are weak topics
  if (showQuizResults && weakTopics.length > 0) {
    return (
      <div className="container mx-auto p-6">
        <CourseNavigationHeader 
          modules={modulesWithCompletion}
          currentModuleNumber={currentModuleNumber}
          currentModuleTitle={currentModule?.title || ''}
          totalModules={modulesWithCompletion.length}
          completedCount={completedCount}
          onModuleSelect={(num) => navigate(`/course/part${num}`)}
          onClose={() => navigate('/course')}
        />
        <QuizResultsWithReview
          score={quizScore}
          passingScore={80}
          passed={quizPassed}
          totalQuestions={moduleData.quiz_questions.length}
          correctAnswers={Math.round((quizScore / 100) * moduleData.quiz_questions.length)}
          weakTopics={weakTopics}
          onRetakeQuiz={handleRetakeQuiz}
          onPracticeWeakAreas={handlePracticeWeakAreas}
          onReviewModule={(moduleId) => navigate(`/course/${moduleId}`)}
        />
      </div>
    );
  }

  // Show weak area practice
  if (showWeakPractice) {
    return (
      <div className="container mx-auto p-6">
        <CourseNavigationHeader 
          modules={modulesWithCompletion}
          currentModuleNumber={currentModuleNumber}
          currentModuleTitle={currentModule?.title || ''}
          totalModules={modulesWithCompletion.length}
          completedCount={completedCount}
          onModuleSelect={(num) => navigate(`/course/part${num}`)}
          onClose={() => navigate('/course')}
        />
        <WeakAreaPractice
          weakTopicQuestions={getWeakTopicQuestions()}
          weakTopics={weakTopics.map(t => t.topic)}
          onComplete={handlePracticeComplete}
          onBack={() => {
            setShowWeakPractice(false);
            setShowQuizResults(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CourseNavigationHeader 
        modules={modulesWithCompletion}
        currentModuleNumber={currentModuleNumber}
        currentModuleTitle={currentModule?.title || ''}
        totalModules={modulesWithCompletion.length}
        completedCount={completedCount}
        onModuleSelect={(num) => navigate(`/course/part${num}`)}
        onClose={() => navigate('/course')}
      />
      
      <div className="flex w-full">
        <ModuleSidebar 
          modules={modulesWithCompletion}
          currentModuleNumber={currentModuleNumber}
          onModuleSelect={(num) => navigate(`/course/part${num}`)}
        />
        
        <div className={`flex-1 container mx-auto p-4 md:p-6 transition-all duration-300 ${
          isTransitioning ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0 animate-fade-in-module'
        }`}>
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-3xl font-bold mb-2">{moduleData.title}</h1>
                <p className="text-muted-foreground">{moduleData.description}</p>
                <Badge variant={isModuleCompletedByNumber(currentModuleNumber) ? "default" : "secondary"} className="mt-2">
                  {isModuleCompletedByNumber(currentModuleNumber) ? '✓ Completed - Review Mode' : 'In Progress'}
                </Badge>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    {overviewComplete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {!overviewComplete && <BookOpen className="h-4 w-4" />}
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="course" 
                    className="flex items-center gap-2"
                    disabled={!canAccessCourse}
                  >
                    {courseComplete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {!courseComplete && !canAccessCourse && <Lock className="h-4 w-4 text-muted-foreground" />}
                    {!courseComplete && canAccessCourse && <Video className="h-4 w-4" />}
                    Course
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documents" 
                    className="flex items-center gap-2"
                    disabled={!canAccessDocuments}
                  >
                    {docsViewed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {!docsViewed && !canAccessDocuments && <Lock className="h-4 w-4 text-muted-foreground" />}
                    {!docsViewed && canAccessDocuments && <FileText className="h-4 w-4" />}
                    Documents
                  </TabsTrigger>
                  <TabsTrigger 
                    value="quiz" 
                    className="flex items-center gap-2"
                    disabled={!canAccessQuiz}
                  >
                    {quizComplete && quizPassed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {!canAccessQuiz && <Lock className="h-4 w-4 text-muted-foreground" />}
                    {canAccessQuiz && !(quizComplete && quizPassed) && <CheckCircle2 className="h-4 w-4" />}
                    Quiz
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Module Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PaginatedContent
                        content={moduleData.content || ''}
                        onPageChange={handlePageChange}
                        onComplete={() => setOverviewComplete(true)}
                        onAllPagesViewed={() => {
                          setOverviewComplete(true);
                          setActiveTab('course');
                        }}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="course" className="space-y-4">
                  <SCORMStylePlayer 
                    config={{
                      id: moduleData.id,
                      title: moduleData.title,
                      tagLabel: `Module ${moduleData.module_number} • ${currentModule?.tier.toUpperCase()} Tier`,
                      estimatedMinutes: moduleData.lessons && moduleData.lessons.length > 0 
                        ? moduleData.lessons.reduce((sum, l) => sum + (parseInt(l.duration) || 0), 0)
                        : 15,
                      lessons: moduleData.lessons && moduleData.lessons.length > 0 
                        ? moduleData.lessons.map(l => ({
                            ...l,
                            markdownContent: l.markdownContent || moduleData.content || ''
                          }))
                        : [
                          {
                              id: `${moduleData.id}-lesson-1`,
                              title: moduleData.title,
                              duration: '15 min',
                              videoType: moduleData.video_url 
                                ? (moduleData.video_url.includes('vimeo.com') ? 'embed' : 'file') 
                                : 'none' as const,
                              videoUrl: moduleData.video_url || '',
                              markdownContent: moduleData.content || '', // Raw markdown for pagination
                              htmlSummary: `<div>${sanitizeHtml(markdownToHtml(moduleData.content || ''))}</div>`,
                              resourceLinks: moduleDocuments.map(doc => ({
                                label: doc.title,
                                href: `/docs/${doc.id}`
                              }))
                            }
                          ],
                    }}
                    onCourseComplete={() => {
                      setCourseComplete(true);
                      setActiveTab('documents');
                      toast({
                        title: "Course Section Complete!",
                        description: "Continue with the documents and then take the quiz.",
                      });
                    }}
                    onLessonComplete={(lessonId) => {
                      console.log('Lesson completed:', lessonId);
                    }}
                    onDocumentOpen={(docId) => {
                      setActiveTab('documents');
                    }}
                  />
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Reference Documents</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Read each document completely to unlock the quiz
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Progress Header with Quiz Unlock Animation */}
                          {moduleDocuments.length > 0 && (
                            <DocumentsProgressHeader
                              totalDocuments={moduleDocuments.length}
                              completedDocuments={documentsViewed.size}
                              quizUnlocked={documentsViewed.size === moduleDocuments.length}
                            />
                          )}
                          
                          {/* Document Cards with Read Tracking */}
                          <div className="space-y-3">
                            {moduleDocuments.map((doc) => (
                              <DocumentReadTracker
                                key={doc.id}
                                document={doc}
                                isRead={documentsViewed.has(doc.id)}
                                onMarkAsRead={(docId) => {
                                  setDocumentsViewed(prev => new Set([...prev, docId]));
                                  toast({
                                    title: "Document completed!",
                                    description: `You've finished reading "${doc.title}"`,
                                  });
                                }}
                                required={true}
                              />
                            ))}
                          </div>
                          
                          {/* Empty state */}
                          {moduleDocuments.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>No documents required for this module.</p>
                              <p className="text-sm">You can proceed directly to the quiz.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="lg:col-span-1 space-y-4">
                      {/* Quiz Lock Indicator in Sidebar */}
                      <QuizLockIndicator
                        isLocked={moduleDocuments.length > 0 && documentsViewed.size < moduleDocuments.length}
                        documentsRequired={moduleDocuments.length}
                        documentsCompleted={documentsViewed.size}
                        lockReason="Complete all required documents"
                      />
                      
                      <RegulatorySidebar 
                        sectionNumber={moduleData.module_number?.toString()}
                        comarReference={moduleData.comar_reference}
                      />
                    </div>
                  </div>
                  
                  <SectionNavButton
                    currentSection="documents"
                    nextSection={{ id: 'quiz', label: 'Quiz' }}
                    onContinue={() => {
                      setDocsViewed(true);
                      setActiveTab('quiz');
                    }}
                    canContinue={moduleDocuments.length === 0 || documentsViewed.size === moduleDocuments.length}
                    completionMessage={
                      moduleDocuments.length === 0
                        ? "Continue to Quiz"
                        : documentsViewed.size === moduleDocuments.length
                          ? "✓ All documents read — Continue to Quiz"
                          : `Read ${moduleDocuments.length - documentsViewed.size} more document(s) to unlock Quiz`
                    }
                  />
                </TabsContent>

                <TabsContent value="quiz" className="space-y-4">
                  {moduleData.quiz_questions.length === 0 ? (
                    currentModuleNumber === 23 ? (
                      // Last module - show course completion options
                      <CourseCompletionCelebration 
                        onTakeExam={() => navigate('/course/final-exam')}
                        onReturnToDashboard={() => navigate('/student-dashboard')}
                      />
                    ) : (
                      // Introductory module without quiz - show continue
                      <Card>
                        <CardContent className="p-6 text-center">
                          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-2xl font-bold mb-2">No Quiz Available</h3>
                          <p className="text-muted-foreground mb-4">
                            This introductory module doesn't have a quiz. 
                            Continue to the next module to begin your training.
                          </p>
                          <Button onClick={goToNext} disabled={!canGoNext}>
                            {canGoNext ? `Continue to Module ${currentModuleNumber + 1}` : 'Complete'}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  ) : !quizComplete ? (
                    <InteractiveQuiz
                      questions={moduleData.quiz_questions.map((q, idx) => ({
                        id: q.id || `q${idx}`,
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correct,
                        explanation: q.explanation,
                        topic: q.topic,
                        comarRef: q.comarRef,
                        difficulty: q.difficulty,
                        relatedModules: q.relatedModules
                      }))}
                      title={`${moduleData.title} - Quiz`}
                      passingScore={80}
                      onQuizComplete={handleQuizComplete}
                    />
                  ) : currentModuleNumber === 23 && quizComplete ? (
                    <CourseCompletionCelebration 
                      onTakeExam={() => navigate('/course/final-exam')}
                      onReturnToDashboard={() => navigate('/student')}
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
                        <p className="text-muted-foreground mb-4">Score: {quizScore}%</p>
                        <div className="flex gap-3 justify-center">
                          <Button onClick={handleRetakeQuiz} variant="outline">
                            Retake Quiz
                          </Button>
                          <Button onClick={() => navigate('/course')}>
                            Return to Course
                          </Button>
                          {/* Only show Next Module when quiz is passed - single source of truth */}
                          {canGoNext && quizPassed && (
                            <Button onClick={handleNextModuleWithTransition} disabled={isTransitioning}>
                              Next Module
                            </Button>
                          )}
                        </div>
                        {/* Show guidance if quiz failed */}
                        {!quizPassed && quizComplete && (
                          <p className="text-sm text-muted-foreground mt-4">
                            Score 80% or higher to unlock the next module
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              {/* Module Navigation - only show when quiz is complete and passed */}
              {(quizComplete && quizPassed) && (
                <div className="flex justify-between mt-6 pt-6 border-t">
                  {canGoPrevious ? (
                    <Button
                      variant="outline"
                      onClick={handlePreviousModuleWithTransition}
                      disabled={isTransitioning}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous Module
                    </Button>
                  ) : <div />}
                  <Button onClick={() => navigate('/course')} variant="ghost">
                    Back to Course Outline
                  </Button>
                </div>
              )}
            </div>

            {/* Section Progress Navigator - Right Side */}
            <SectionProgressNav
              sections={sections}
              onSectionClick={handleTabChange}
              completedPercentage={calculateSectionProgress()}
              moduleTitle={moduleData.title}
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <MobileNavBar
        modules={modulesWithCompletion}
        currentModuleNumber={currentModuleNumber}
        canGoPrevious={canGoPrevious && !isTransitioning}
        canGoNext={canGoNext && !isTransitioning}
        onPrevious={handlePreviousModuleWithTransition}
        onNext={handleNextModuleWithTransition}
        onModuleSelect={(num) => navigate(`/course/part${num}`)}
        isCurrentModuleComplete={quizComplete && quizPassed}
      />
    </div>
  );
};

export default EnhancedCourseModule;