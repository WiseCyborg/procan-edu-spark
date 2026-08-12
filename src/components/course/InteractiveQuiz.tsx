import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  /**
   * Optional. Answer keys are no longer shipped to the browser for course
   * module quizzes — grading happens server-side. When absent, this component
   * runs in "server graded" mode and requires `onSubmitAnswers`.
   */
  correctAnswer?: string;
  explanation?: string;
  points?: number;
  topic?: string;
  comarRef?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  relatedModules?: string[];
}

export interface WeakTopic {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
  relatedModules?: string[];
}

export interface ServerGradeResult {
  score: number;
  passed: boolean;
  results?: { question_index: number; is_correct: boolean; explanation?: string | null }[];
}

interface InteractiveQuizProps {
  questions: QuizQuestion[];
  title: string;
  timeLimit?: number; // in minutes
  passingScore?: number; // percentage
  maxQuestions?: number; // default 10 - randomly select this many questions from pool
  onQuizComplete: (
    score: number,
    passed: boolean,
    timeSpent: number,
    weakTopics?: WeakTopic[],
    answers?: { question_index: number; answer: string }[],
    serverGraded?: boolean
  ) => void;
  /**
   * Server-side grader. Required when questions carry no answer key.
   * Returning null signals a failed submission.
   */
  onSubmitAnswers?: (
    answers: { question_index: number; answer: string }[]
  ) => Promise<ServerGradeResult | null>;
  onQuestionAnswer?: (questionId: string, answer: string, isCorrect: boolean) => void;
  allowRetry?: boolean;
}


// Shuffle utility function
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({
  questions,
  title,
  timeLimit,
  passingScore = 80,
  maxQuestions = 10,
  onQuizComplete,
  onSubmitAnswers,
  onQuestionAnswer,
  allowRetry = true
}) => {
  // Defensive guard for empty questions
  if (!questions || questions.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No quiz questions available.</p>
        </CardContent>
      </Card>
    );
  }

  // Answer keys are stripped from learner-visible content for module quizzes.
  // When no key is present we grade on the server instead of in the browser.
  const hasAnswerKey = questions.some(q => !!q.correctAnswer);

  // Shuffle questions on initial load and select random maxQuestions (default 10)
  const [shuffledQuestions, setShuffledQuestions] = useState(() => {
    const shuffled = shuffleArray(questions);
    return shuffled.slice(0, maxQuestions);
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit ? timeLimit * 60 : null);
  const [startTime] = useState(Date.now());
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverResult, setServerResult] = useState<ServerGradeResult | null>(null);


  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === shuffledQuestions.length - 1;
  const totalQuestions = shuffledQuestions.length;

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
    const isCorrect = hasAnswerKey ? answer === currentQuestion.correctAnswer : false;

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
      if (hasAnswerKey && currentQuestion.explanation && answers[currentQuestion.id]) {
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

  // Build answers array indexed by each question's position in the original `questions` prop
  const buildRawAnswers = () => {
    const rawAnswers: { question_index: number; answer: string }[] = [];
    shuffledQuestions.forEach(q => {
      const selected = answers[q.id];
      if (selected === undefined) return;
      const originalIndex = questions.findIndex(orig => orig.id === q.id);
      if (originalIndex === -1) return;
      rawAnswers.push({ question_index: originalIndex, answer: selected });
    });
    return rawAnswers;
  };

  const calculateWeakTopics = (correctnessByQuestionId: Record<string, boolean>): WeakTopic[] => {
    const topicStats: { [topic: string]: { correct: number; total: number; relatedModules: Set<string> } } = {};

    shuffledQuestions.forEach(q => {
      const topic = q.topic || 'General';
      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0, relatedModules: new Set() };
      }
      topicStats[topic].total++;
      if (correctnessByQuestionId[q.id]) {
        topicStats[topic].correct++;
      }
      if (q.relatedModules) {
        q.relatedModules.forEach(m => topicStats[topic].relatedModules.add(m));
      }
    });

    return Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        percentage: Math.round((stats.correct / stats.total) * 100),
        relatedModules: Array.from(stats.relatedModules)
      }))
      .filter(t => t.percentage < 70); // Weak if < 70%
  };

  const localCorrectness = (): Record<string, boolean> => {
    const map: Record<string, boolean> = {};
    shuffledQuestions.forEach(q => {
      map[q.id] = !!q.correctAnswer && answers[q.id] === q.correctAnswer;
    });
    return map;
  };

  const serverCorrectness = (result: ServerGradeResult): Record<string, boolean> => {
    const map: Record<string, boolean> = {};
    const byIndex = new Map((result.results ?? []).map(r => [r.question_index, r.is_correct]));
    shuffledQuestions.forEach(q => {
      const originalIndex = questions.findIndex(orig => orig.id === q.id);
      map[q.id] = byIndex.get(originalIndex) === true;
    });
    return map;
  };

  const handleQuizSubmit = async () => {
    if (submitting) return;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const rawAnswers = buildRawAnswers();

    // Server-graded mode: no answer key in the browser.
    if (!hasAnswerKey) {
      if (!onSubmitAnswers) {
        setSubmitError('This quiz cannot be graded right now. Please try again later.');
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        const result = await onSubmitAnswers(rawAnswers);
        if (!result) {
          setSubmitError("We couldn't grade your quiz. Please try submitting again.");
          return;
        }
        setServerResult(result);
        const weakTopics = calculateWeakTopics(serverCorrectness(result));
        setShowResults(true);
        onQuizComplete(result.score, result.passed, timeSpent, weakTopics, rawAnswers, true);
      } catch {
        setSubmitError("We couldn't grade your quiz. Please try submitting again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const correctness = localCorrectness();
    const correctAnswers = shuffledQuestions.filter(q => correctness[q.id]).length;
    const score = Math.round((correctAnswers / shuffledQuestions.length) * 100);
    const passed = score >= passingScore;
    const weakTopics = calculateWeakTopics(correctness);

    setShowResults(true);
    onQuizComplete(score, passed, timeSpent, weakTopics, rawAnswers, false);
  };

  const handleRetry = () => {
    // Reshuffle and re-select new random questions on retry
    const newShuffled = shuffleArray(questions);
    setShuffledQuestions(newShuffled.slice(0, maxQuestions));
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResults(false);
    setShowExplanation(false);
    setServerResult(null);
    setSubmitError(null);
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
    const correctness = serverResult ? serverCorrectness(serverResult) : localCorrectness();
    const correctAnswers = shuffledQuestions.filter(q => correctness[q.id]).length;
    const score = serverResult
      ? serverResult.score
      : Math.round((correctAnswers / shuffledQuestions.length) * 100);
    const passed = serverResult ? serverResult.passed : score >= passingScore;

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
              {correctAnswers} out of {shuffledQuestions.length} questions correct
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
            {shuffledQuestions.map((question, index) => {
              const userAnswer = answers[question.id];
              const isCorrect = correctness[question.id];

              
              return (
                <div key={question.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Question {index + 1}</span>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
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
                <RotateCcw className="w-4 h-4 me-2" />
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
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
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
                      className="me-3"
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
            <div className="p-4 bg-blue-50 border-s-4 border-blue-400">
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