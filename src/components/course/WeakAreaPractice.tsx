import { useState } from "react";
import { InteractiveQuiz, QuizQuestion } from "./InteractiveQuiz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target } from "lucide-react";

interface WeakAreaPracticeProps {
  weakTopicQuestions: QuizQuestion[];
  weakTopics: string[];
  onComplete: (score: number, passed: boolean) => void;
  onBack: () => void;
  passingScore?: number;
}

export function WeakAreaPractice({
  weakTopicQuestions,
  weakTopics,
  onComplete,
  onBack,
  passingScore = 80
}: WeakAreaPracticeProps) {
  const [showQuiz, setShowQuiz] = useState(false);

  if (!showQuiz) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Practice Weak Areas
            </CardTitle>
            <CardDescription>
              Focus on the topics where you need improvement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Topics to Practice:</h4>
              <ul className="space-y-1">
                {weakTopics.map((topic, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm">
                <strong>Questions:</strong> {weakTopicQuestions.length} targeted questions
              </p>
              <p className="text-sm mt-1">
                <strong>Goal:</strong> Score {passingScore}% or higher to demonstrate mastery
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Results
              </Button>
              <Button
                onClick={() => setShowQuiz(true)}
                className="flex-1"
              >
                Start Practice Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <InteractiveQuiz
      questions={weakTopicQuestions}
      title="Weak Area Practice"
      onQuizComplete={onComplete}
      passingScore={passingScore}
    />
  );
}
