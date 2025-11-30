import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, BookOpen, RotateCcw, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WeakTopic {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
  relatedModules?: string[];
}

interface QuizResultsWithReviewProps {
  score: number;
  passingScore: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  weakTopics: WeakTopic[];
  onRetakeQuiz: () => void;
  onPracticeWeakAreas: () => void;
  onReviewModule: (moduleId: string) => void;
}

export function QuizResultsWithReview({
  score,
  passingScore,
  passed,
  totalQuestions,
  correctAnswers,
  weakTopics,
  onRetakeQuiz,
  onPracticeWeakAreas,
  onReviewModule
}: QuizResultsWithReviewProps) {
  const hasWeakAreas = weakTopics.length > 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Overall Results */}
      <Card className={passed ? "border-green-500/50" : "border-yellow-500/50"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Quiz Results</CardTitle>
            <Badge variant={passed ? "default" : "secondary"} className="text-lg px-4 py-2">
              {score}%
            </Badge>
          </div>
          <CardDescription>
            {correctAnswers} out of {totalQuestions} questions correct
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={score} className="h-3 mb-4" />
          
          {passed ? (
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Congratulations! You passed this module.
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You've met the minimum passing score of {passingScore}%
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  You need {passingScore}% to pass this module.
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Review the areas below and try again when you're ready.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weak Areas Analysis */}
      {hasWeakAreas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
            <CardDescription>
              Focus on these topics to improve your understanding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakTopics.map((topic, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{topic.topic}</h4>
                    <p className="text-sm text-muted-foreground">
                      {topic.correct} out of {topic.total} correct ({topic.percentage}%)
                    </p>
                  </div>
                  <Badge variant={topic.percentage < 50 ? "destructive" : "secondary"}>
                    {topic.percentage}%
                  </Badge>
                </div>
                
                <Progress value={topic.percentage} className="h-2 mb-3" />
                
                {topic.relatedModules && topic.relatedModules.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {topic.relatedModules.map((moduleId) => (
                      <Button
                        key={moduleId}
                        variant="outline"
                        size="sm"
                        onClick={() => onReviewModule(moduleId)}
                      >
                        <BookOpen className="mr-2 h-3 w-3" />
                        Review Material
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onRetakeQuiz}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Full Quiz
            </Button>
            
            {hasWeakAreas && (
              <Button
                onClick={onPracticeWeakAreas}
                className="flex-1"
              >
                <Target className="mr-2 h-4 w-4" />
                Practice Weak Areas ({weakTopics.reduce((sum, t) => sum + t.total, 0)} questions)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
