import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Video, FileText, CheckCircle2, ArrowLeft, Info } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getModuleDocuments } from '@/data/moduleDocumentMapping';
import { getDocumentContent, DocumentContent } from '@/data/moduleDocuments';
import { sanitizeHtml } from "@/utils/sanitize-html";
import { markdownToHtml } from "@/utils/markdown-to-html";
import { useUserProgress } from '@/hooks/useUserProgress';
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
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
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

  const { updateProgress, isModuleCompleted } = useUserProgress(COURSE_ID);
  
  // Dynamic modules with actual completion status
  const modulesWithCompletion = useMemo(() => [
    { id: 'part0', number: 0, title: 'Welcome & Platform Orientation', tier: 'green' as const, isCompleted: isModuleCompleted('part0') },
    { id: 'part1', number: 1, title: 'Introduction to Maryland Cannabis Laws', tier: 'green' as const, isCompleted: isModuleCompleted('part1') },
    { id: 'part2', number: 2, title: 'Patient Rights and Privacy', tier: 'green' as const, isCompleted: isModuleCompleted('part2') },
    { id: 'part3', number: 3, title: 'Product Knowledge and Safety', tier: 'green' as const, isCompleted: isModuleCompleted('part3') },
    { id: 'part4', number: 4, title: 'Inventory Management and Tracking', tier: 'green' as const, isCompleted: isModuleCompleted('part4') },
    { id: 'part5', number: 5, title: 'Customer Service Excellence', tier: 'green' as const, isCompleted: isModuleCompleted('part5') },
    { id: 'part6', number: 6, title: 'Security, Safety, and Drug-Free Workplace', tier: 'green' as const, isCompleted: isModuleCompleted('part6') },
    { id: 'part7', number: 7, title: 'Laboratory Testing and Quality Control', tier: 'yellow' as const, isCompleted: isModuleCompleted('part7') },
    { id: 'part8', number: 8, title: 'Dosage Guidelines and Patient Consultation', tier: 'yellow' as const, isCompleted: isModuleCompleted('part8') },
    { id: 'part9', number: 9, title: 'Point of Sale Systems and Transactions', tier: 'yellow' as const, isCompleted: isModuleCompleted('part9') },
    { id: 'part10', number: 10, title: 'Medical Cannabis and Drug Interactions', tier: 'yellow' as const, isCompleted: isModuleCompleted('part10') },
    { id: 'part11', number: 11, title: 'Cannabis Cultivation Basics', tier: 'yellow' as const, isCompleted: isModuleCompleted('part11') },
    { id: 'part12', number: 12, title: 'Product Packaging, Labeling, and Diversion Prevention', tier: 'yellow' as const, isCompleted: isModuleCompleted('part12') },
    { id: 'part13', number: 13, title: 'Handling Cash and Banking', tier: 'red' as const, isCompleted: isModuleCompleted('part13') },
    { id: 'part14', number: 14, title: 'Age Verification and ID Checking', tier: 'red' as const, isCompleted: isModuleCompleted('part14') },
    { id: 'part15', number: 15, title: 'Standard Operating Procedures and Record Keeping', tier: 'red' as const, isCompleted: isModuleCompleted('part15') },
    { id: 'part16', number: 16, title: 'Transportation and Delivery', tier: 'red' as const, isCompleted: isModuleCompleted('part16') },
    { id: 'part17', number: 17, title: 'Waste Disposal and Management', tier: 'red' as const, isCompleted: isModuleCompleted('part17') },
    { id: 'part18', number: 18, title: 'Final Review and Best Practices', tier: 'red' as const, isCompleted: isModuleCompleted('part18') },
    { id: 'part19', number: 19, title: 'Supervising Compliance Operations', tier: 'red' as const, isCompleted: isModuleCompleted('part19') },
    { id: 'part20', number: 20, title: 'Compliance Oversight & Regulatory Reporting', tier: 'red' as const, isCompleted: isModuleCompleted('part20') },
    { id: 'part21', number: 21, title: 'Team Training & Development Coordination', tier: 'red' as const, isCompleted: isModuleCompleted('part21') },
    { id: 'part22', number: 22, title: 'Incident Documentation & Investigation', tier: 'red' as const, isCompleted: isModuleCompleted('part22') },
    { id: 'part23', number: 23, title: 'Advanced Diversion Prevention Strategies', tier: 'red' as const, isCompleted: isModuleCompleted('part23') },
  ], [isModuleCompleted]);
  
  // Calculate actual completed count
  const completedCount = useMemo(() => {
    return modulesWithCompletion.filter(m => m.isCompleted).length;
  }, [modulesWithCompletion]);
  
  // Fetch documents for this module
  const moduleDocuments = useMemo(() => {
    const docIds = getModuleDocuments(moduleId || '');
    return docIds.map(id => getDocumentContent(id)).filter((doc): doc is DocumentContent => doc !== undefined);
  }, [moduleId]);
  
  const currentModuleNumber = parseInt(moduleId?.replace('part', '') || '0');
  const currentModule = modulesWithCompletion.find(m => m.number === currentModuleNumber);
  
  const { goToPrevious, goToNext, canGoPrevious, canGoNext } = useModuleNavigation({
    currentModule: currentModuleNumber,
    totalModules: modulesWithCompletion.length,
  });

  useEffect(() => {
    if (!moduleId) return;
    
    const fetchModuleData = async () => {
      try {
        const moduleNumber = parseInt(moduleId.replace('part', ''));
        
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
  }, [moduleId, navigate]);

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
      isLocked: false,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="h-4 w-4" />,
      isCompleted: docsViewed,
      isCurrent: activeTab === 'documents',
      isLocked: false,
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: <CheckCircle2 className="h-4 w-4" />,
      isCompleted: quizComplete,
      isCurrent: activeTab === 'quiz',
      isLocked: !overviewComplete && !courseComplete,
      lockReason: 'Complete overview and course first',
    },
  ];

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
        
        <div className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-3xl font-bold mb-2">{moduleData.title}</h1>
                <p className="text-muted-foreground">{moduleData.description}</p>
                <Badge variant={isModuleCompleted(moduleId!) ? "default" : "secondary"} className="mt-2">
                  {isModuleCompleted(moduleId!) ? '✓ Completed - Review Mode' : 'In Progress'}
                </Badge>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="course" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Course
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
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
                        onComplete={() => setOverviewComplete(true)}
                      />
                    </CardContent>
                  </Card>
                  
                  <SectionNavButton
                    currentSection="overview"
                    nextSection={{ id: 'course', label: 'Course' }}
                    onContinue={() => {
                      setOverviewComplete(true);
                      setActiveTab('course');
                    }}
                    canContinue={true}
                    completionMessage="Mark Overview as Complete"
                    onMarkComplete={() => setOverviewComplete(true)}
                  />
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
                            Review all documents before proceeding to the quiz
                          </p>
                        </CardHeader>
                        <CardContent>
                          <Accordion type="multiple" className="w-full">
                            {moduleDocuments.map((doc, index) => {
                              const isViewed = documentsViewed.has(doc.id);
                              return (
                                <AccordionItem key={doc.id} value={doc.id}>
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                      <div className="flex items-center gap-3">
                                        {isViewed ? (
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        ) : (
                                          <FileText className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <div className="text-left">
                                          <div className="font-semibold">{doc.title}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {doc.category} • Version {doc.version}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-4 pt-4">
                                      {doc.comarReferences && doc.comarReferences.length > 0 && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                          <Info className="h-4 w-4" />
                                          <span>
                                            COMAR References: {doc.comarReferences.join(', ')}
                                          </span>
                                        </div>
                                      )}
                                      
                              <div 
                                className="prose prose-sm max-w-none dark:prose-invert
                                           prose-p:mb-4 prose-headings:mt-6 prose-headings:mb-3 
                                           prose-li:my-1 prose-ul:my-4 prose-ol:my-4"
                                dangerouslySetInnerHTML={{ 
                                  __html: sanitizeHtml(doc.content) 
                                }}
                              />
                                      
                                      <div className="flex items-center justify-between pt-4 border-t">
                                        <span className="text-xs text-muted-foreground">
                                          Last updated: {new Date(doc.lastUpdated).toLocaleDateString()}
                                        </span>
                                        {!isViewed && (
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              setDocumentsViewed(prev => new Set([...prev, doc.id]));
                                              toast({
                                                title: "Document marked as read",
                                                description: `You've reviewed "${doc.title}"`,
                                              });
                                            }}
                                          >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Mark as Read
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                          
                          {moduleDocuments.length > 0 && (
                            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Documents reviewed: {documentsViewed.size} of {moduleDocuments.length}
                                </span>
                                <Progress 
                                  value={(documentsViewed.size / moduleDocuments.length) * 100} 
                                  className="w-32 h-2"
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    <div className="lg:col-span-1">
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
                    canContinue={documentsViewed.size === moduleDocuments.length}
                    completionMessage={
                      documentsViewed.size === moduleDocuments.length
                        ? "All Documents Reviewed - Continue to Quiz"
                        : `Review all ${moduleDocuments.length} documents to continue`
                    }
                    onMarkComplete={() => setDocsViewed(true)}
                  />
                </TabsContent>

                <TabsContent value="quiz" className="space-y-4">
                  {moduleData.quiz_questions.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-2">No Quiz Available</h3>
                        <p className="text-muted-foreground mb-4">
                          This introductory module doesn't have a quiz. 
                          Continue to the next module to begin your training.
                        </p>
                        <Button onClick={goToNext}>Continue to Module 1</Button>
                      </CardContent>
                    </Card>
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
                          {canGoNext && (
                            <Button onClick={goToNext}>
                              Next Module
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              {/* Previous/Next Module Navigation - only show if navigation is possible */}
              {(canGoPrevious || canGoNext) && (
                <div className="flex justify-between mt-6 pt-6 border-t">
                  {canGoPrevious ? (
                    <Button
                      variant="outline"
                      onClick={goToPrevious}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous Module
                    </Button>
                  ) : (
                    <div />
                  )}
                  
                  {canGoNext ? (
                    <Button
                      onClick={goToNext}
                    >
                      Next Module
                      <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
              )}
            </div>

            {/* Section Progress Navigator - Right Side */}
            <SectionProgressNav
              sections={sections}
              onSectionClick={setActiveTab}
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
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onModuleSelect={(num) => navigate(`/course/part${num}`)}
      />
    </div>
  );
};

export default EnhancedCourseModule;