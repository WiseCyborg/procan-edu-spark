
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useUserProgress } from '@/hooks/useUserProgress';

interface QuizQuestion {
  q: string;
  a: string;
  options: string[];
}

const quizzes: {[key: string]: QuizQuestion[]} = {
  part1: [
    { q: "Which federal law classifies cannabis as a Schedule I drug?", a: "Controlled Substances Act", options: ["Controlled Substances Act", "Food and Drug Act", "Tax Code"] },
    { q: "What is Maryland's legal possession limit for personal cannabis use?", a: "1.5 oz", options: ["1 oz", "1.5 oz", "2 oz"] },
    { q: "How often must dispensary agents complete RVT?", a: "Every 12 months", options: ["Every 6 months", "Every 12 months", "Every 2 years"] },
    { q: "Which agency enforces cannabis regulations in Maryland?", a: "Maryland Cannabis Administration", options: ["FDA", "DEA", "Maryland Cannabis Administration"] },
    { q: "What is a key Maryland regulation to prevent illegal sales?", a: "Age verification", options: ["Price controls", "Age verification", "Color coding"] }
  ],
  part2: [
    { q: "What must SOPs include per COMAR?", a: "Detailed operational steps", options: ["General guidelines", "Detailed operational steps", "Employee names"] },
    { q: "How often should SOPs be reviewed?", a: "Annually", options: ["Monthly", "Annually", "Every 5 years"] },
    { q: "Who is responsible for SOP compliance?", a: "Dispensary management", options: ["Customers", "Dispensary management", "State police"] },
    { q: "What is a key SOP focus area?", a: "Product handling", options: ["Marketing", "Product handling", "Store decor"] },
    { q: "What happens if SOPs are not followed?", a: "Regulatory penalties", options: ["Nothing", "Regulatory penalties", "Customer discounts"] }
  ],
  // Add more quizzes for each module as needed
};

const CourseModule: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';
  const { updateProgress, isModuleCompleted, getModuleProgress } = useUserProgress(COURSE_ID);

  const moduleQuestions = quizzes[moduleId || ''] || [];
  
  // Check if module exists
  useEffect(() => {
    if (moduleId && !quizzes[moduleId]) {
      toast({
        title: "Module not found",
        description: "The requested module does not exist.",
        variant: "destructive",
      });
      navigate('/course');
    }
  }, [moduleId, navigate]);

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    if (submitted) return;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const submitQuiz = async () => {
    // Check if all questions are answered
    if (Object.keys(selectedAnswers).length < moduleQuestions.length) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitted(true);
    const newScore = moduleQuestions.filter((q, index) => 
      selectedAnswers[index] === q.a
    ).length;
    
    const finalScore = Math.round((newScore / moduleQuestions.length) * 100);
    setScore(newScore);
    
    try {
      if (finalScore >= 80) {
        // Update progress in Supabase
        await updateProgress(COURSE_ID, moduleId!, true, finalScore);
        
        toast({
          title: "Congratulations!",
          description: `You passed with ${finalScore}%! Module completed.`,
        });
      } else {
        // Still save the attempt, but not as completed
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

  const moduleNumber = moduleId ? parseInt(moduleId.replace('part', '')) : 0;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Module {moduleNumber}: Course Content
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Module Quiz</h2>
        
        {moduleQuestions.length > 0 ? (
          <div className="space-y-6">
            {moduleQuestions.map((question, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-md">
                <p className="font-medium mb-3">{index + 1}. {question.q}</p>
                <div className="space-y-2">
                  {question.options.map(option => (
                    <label 
                      key={option} 
                      className={`flex items-center min-h-[44px] p-3 border rounded-md cursor-pointer hover:bg-gray-100 ${
                        submitted 
                          ? (option === question.a 
                            ? 'bg-green-100 border-green-300' 
                            : selectedAnswers[index] === option 
                              ? (option === question.a ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300') 
                              : '')
                          : selectedAnswers[index] === option ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${index}`}
                        value={option}
                        checked={selectedAnswers[index] === option}
                        onChange={() => handleAnswerSelect(index, option)}
                        disabled={submitted}
                        className="mr-3 h-4 w-4 flex-shrink-0"
                      />
                      <span className="text-base">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
  
            {!submitted ? (
              <Button 
                onClick={submitQuiz} 
                className="mt-6"
              >
                Submit Quiz
              </Button>
            ) : (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <p className="text-lg font-medium">
                  Score: {score}/{moduleQuestions.length} 
                  ({(score / moduleQuestions.length * 100).toFixed(0)}%)
                </p>
                <div className="flex gap-4 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSubmitted(false);
                      setSelectedAnswers({});
                    }}
                  >
                    Try Again
                  </Button>
                  <Button onClick={() => navigate('/course')}>
                    Return to Course
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>No quiz questions available for this module.</p>
        )}
      </div>
    </div>
  );
};

export default CourseModule;
