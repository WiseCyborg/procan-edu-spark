import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useUserProgress } from '@/hooks/useUserProgress';
import { supabase } from '@/integrations/supabase/client';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

interface ModuleData {
  id: string;
  title: string;
  description: string;
  content: string;
  quiz_questions: QuizQuestion[];
  module_number: number;
}

const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

const EnhancedCourseModule: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<'content' | 'quiz'>('content');

  const { updateProgress, isModuleCompleted, getModuleProgress } = useUserProgress(COURSE_ID);

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
            module_number: data.module_number
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

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    if (submitted) return;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const submitQuiz = async () => {
    if (!moduleData) return;
    
    // Check if all questions are answered
    if (Object.keys(selectedAnswers).length < moduleData.quiz_questions.length) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitted(true);
    const correctAnswers = moduleData.quiz_questions.filter((q, index) => 
      selectedAnswers[index] === q.correct
    ).length;
    
    const finalScore = Math.round((correctAnswers / moduleData.quiz_questions.length) * 100);
    setScore(correctAnswers);
    
    try {
      if (finalScore >= 80) {
        await updateProgress(COURSE_ID, moduleId!, true, finalScore);
        
        toast({
          title: "Congratulations!",
          description: `You passed with ${finalScore}%! Module completed.`,
        });
      } else {
        await updateProgress(COURSE_ID, moduleId!, false, finalScore);
        
        toast({
          title: "Not quite there",
          description: `You scored ${finalScore}%. You need 80% to pass. Try again!`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetQuiz = () => {
    setSubmitted(false);
    setSelectedAnswers({});
    setScore(0);
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

  if (!moduleData) {
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

  const progressPercent = submitted && moduleData.quiz_questions.length > 0 
    ? (score / moduleData.quiz_questions.length) * 100 
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/course')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{moduleData.title}</h1>
            <p className="text-muted-foreground">{moduleData.description}</p>
          </div>
        </div>
        <Badge variant={isModuleCompleted(moduleId!) ? "default" : "secondary"}>
          {isModuleCompleted(moduleId!) ? 'Completed' : 'In Progress'}
        </Badge>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2">
        <Button 
          variant={currentSection === 'content' ? 'default' : 'outline'}
          onClick={() => setCurrentSection('content')}
          className="flex items-center space-x-2"
        >
          <BookOpen className="w-4 h-4" />
          <span>Learning Content</span>
        </Button>
        <Button 
          variant={currentSection === 'quiz' ? 'default' : 'outline'}
          onClick={() => setCurrentSection('quiz')}
          className="flex items-center space-x-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Quiz ({moduleData.quiz_questions.length} questions)</span>
        </Button>
      </div>

      {/* Content Section */}
      {currentSection === 'content' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Module Content</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose max-w-none">
              {moduleData.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCurrentSection('quiz')}>
                Continue to Quiz
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Section */}
      {currentSection === 'quiz' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Module Quiz</span>
              </div>
              {submitted && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Score: {score}/{moduleData.quiz_questions.length} ({progressPercent.toFixed(0)}%)
                  </span>
                  <Progress value={progressPercent} className="w-32" />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {moduleData.quiz_questions.length > 0 ? (
              <>
                {moduleData.quiz_questions.map((question, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card">
                    <p className="font-medium mb-4 text-foreground">
                      {index + 1}. {question.question}
                    </p>
                    <div className="space-y-2">
                      {question.options.map(option => {
                        const isSelected = selectedAnswers[index] === option;
                        const isCorrect = option === question.correct;
                        const showFeedback = submitted;
                        
                        let optionClass = "block p-3 border rounded-md cursor-pointer transition-colors ";
                        if (showFeedback) {
                          if (isCorrect) {
                            optionClass += "bg-green-50 border-green-300 text-green-800";
                          } else if (isSelected && !isCorrect) {
                            optionClass += "bg-red-50 border-red-300 text-red-800";
                          } else {
                            optionClass += "bg-muted text-muted-foreground";
                          }
                        } else {
                          optionClass += isSelected 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "hover:bg-muted/50";
                        }
                        
                        return (
                          <label key={option} className={optionClass}>
                            <input
                              type="radio"
                              name={`q${index}`}
                              value={option}
                              checked={isSelected}
                              onChange={() => handleAnswerSelect(index, option)}
                              disabled={submitted}
                              className="mr-3"
                            />
                            <span>{option}</span>
                            {showFeedback && isCorrect && (
                              <CheckCircle className="inline w-4 h-4 ml-2 text-green-600" />
                            )}
                            {showFeedback && isSelected && !isCorrect && (
                              <XCircle className="inline w-4 h-4 ml-2 text-red-600" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {submitted && question.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {!submitted ? (
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentSection('content')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Content
                    </Button>
                    <Button onClick={submitQuiz}>
                      Submit Quiz
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-medium">
                          Final Score: {score}/{moduleData.quiz_questions.length} ({progressPercent.toFixed(0)}%)
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {progressPercent >= 80 ? 'Congratulations! You passed this module.' : 'You need 80% to pass. Try again!'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={resetQuiz}>
                          Try Again
                        </Button>
                        <Button onClick={() => navigate('/course')}>
                          Return to Course
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">No quiz questions available for this module.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedCourseModule;