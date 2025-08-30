import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  points?: number;
}

interface InteractiveQuizProps {
  questions: QuizQuestion[];
  title: string;
  timeLimit?: number; // in minutes
  passingScore?: number; // percentage
  onQuizComplete: (score: number, passed: boolean, timeSpent: number) => void;
  onQuestionAnswer?: (questionId: string, answer: string, isCorrect: boolean) => void;
  allowRetry?: boolean;
}

export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({
  questions,
  title,
  timeLimit,
  passingScore = 80,
  onQuizComplete,
  onQuestionAnswer,
  allowRetry = true
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit ? timeLimit * 60 : null);
  const [startTime] = useState(Date.now());
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const totalQuestions = questions.length;

  // Timer effect
  useEffect(() => {
    if (!timeRemaining) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev && prev > 0) {
          return prev - 1;
        } else {
          // Time's up - auto submit
          handleQuizSubmit();
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleAnswerSelect = (answer: string) => {
    const questionId = currentQuestion.id;
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    onQuestionAnswer?.(questionId, answer, isCorrect);
  };

  const handleNextQuestion = () => {
    if (showExplanation) {
      setShowExplanation(false);
      if (isLastQuestion) {
        handleQuizSubmit();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    } else {
      if (currentQuestion.explanation && answers[currentQuestion.id]) {
        setShowExplanation(true);
      } else if (isLastQuestion) {
        handleQuizSubmit();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  };

  const handleQuizSubmit = () => {
    const correctAnswers = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    const score = Math.round((correctAnswers / questions.length) * 100);
    const passed = score >= passingScore;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    setShowResults(true);
    onQuizComplete(score, passed, timeSpent);
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResults(false);
    setShowExplanation(false);
    setTimeRemaining(timeLimit ? timeLimit * 60 : null);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= passingScore) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (showResults) {
    const correctAnswers = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    const score = Math.round((correctAnswers / questions.length) * 100);
    const passed = score >= passingScore;

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title} - Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(score)} mb-2`}>
              {score}%
            </div>
            <Badge variant={passed ? "default" : "destructive"} className="text-lg px-4 py-2">
              {passed ? "PASSED" : "FAILED"}
            </Badge>
            <p className="text-muted-foreground mt-2">
              {correctAnswers} out of {questions.length} questions correct
            </p>
            {!passed && (
              <p className="text-sm text-muted-foreground mt-1">
                You need {passingScore}% to pass
              </p>
            )}
          </div>

          {/* Question by question breakdown */}
          <div className="space-y-2">
            <h4 className="font-semibold">Question Breakdown:</h4>
            {questions.map((question, index) => {
              const userAnswer = answers[question.id];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <div key={question.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Question {index + 1}</span>
                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {userAnswer || 'Not answered'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {allowRetry && !passed && (
            <div className="text-center">
              <Button onClick={handleRetry} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Quiz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          {timeRemaining !== null && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span className={`font-mono ${timeRemaining < 300 ? 'text-red-600' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span>Passing score: {passingScore}%</span>
          </div>
          <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!showExplanation ? (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {currentQuestion.question}
              </h3>
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      answers[currentQuestion.id] === option
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerSelect(option)}
                      className="mr-3"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Explanation</h3>
            <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
              <p className="font-medium text-blue-800">
                Correct Answer: {currentQuestion.correctAnswer}
              </p>
              {currentQuestion.explanation && (
                <p className="text-blue-700 mt-2">{currentQuestion.explanation}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNextQuestion}
            disabled={!answers[currentQuestion.id] && !showExplanation}
          >
            {showExplanation 
              ? (isLastQuestion ? 'Finish Quiz' : 'Next Question')
              : (currentQuestion.explanation ? 'Show Explanation' : (isLastQuestion ? 'Finish Quiz' : 'Next Question'))
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};