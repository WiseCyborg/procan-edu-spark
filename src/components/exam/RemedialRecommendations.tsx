import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopicScore {
  section_number: number;
  section_title: string;
  comar_section: string;
  topic_area: string;
  questions_correct: number;
  questions_total: number;
  score_percentage: number;
  needs_remediation: boolean;
}

interface RemedialRecommendationsProps {
  topicScores: TopicScore[];
  overallPassed: boolean;
  overallScore: number;
}

export const RemedialRecommendations: React.FC<RemedialRecommendationsProps> = ({
  topicScores,
  overallPassed,
  overallScore
}) => {
  const navigate = useNavigate();
  
  const failedTopics = topicScores.filter(t => t.needs_remediation);
  const passedTopics = topicScores.filter(t => !t.needs_remediation);
  const weakTopics = topicScores.filter(t => !t.needs_remediation && t.score_percentage < 100);

  const getModuleNumberFromSection = (sectionNumber: number): number => {
    // Map exam sections to course modules (1-18)
    return sectionNumber;
  };

  const handleReviewModule = (sectionNumber: number) => {
    const moduleNumber = getModuleNumberFromSection(sectionNumber);
    navigate(`/course/module/${moduleNumber}`);
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={overallPassed ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {overallPassed ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    Congratulations! You Passed
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    Additional Study Required
                  </>
                )}
              </CardTitle>
              <CardDescription className="mt-2">
                Overall Score: <span className="font-bold text-lg">{overallScore}%</span>
                {!overallPassed && " (80% required to pass)"}
              </CardDescription>
            </div>
            <Badge variant={overallPassed ? "default" : "destructive"} className="text-sm">
              {passedTopics.length}/{topicScores.length} Topics Mastered
            </Badge>
          </div>
        </CardHeader>
        {!overallPassed && (
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You need to review {failedTopics.length} topic{failedTopics.length !== 1 ? 's' : ''} before retaking the exam.
                Focus on the areas highlighted below to improve your score.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Failed Topics - Requires Remediation */}
      {failedTopics.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Topics Requiring Review ({failedTopics.length})
            </CardTitle>
            <CardDescription>
              These topics scored below 80% and require additional study before retaking the exam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {failedTopics.map((topic) => (
              <div
                key={topic.section_number}
                className="flex items-start justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {topic.score_percentage}%
                    </Badge>
                    <h4 className="font-semibold text-sm">
                      Module {topic.section_number}: {topic.section_title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {topic.comar_section} - {topic.topic_area}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score: {topic.questions_correct}/{topic.questions_total} questions correct
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReviewModule(topic.section_number)}
                  className="ml-4"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Review Module
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weak Topics - Passed but Could Improve */}
      {weakTopics.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
              <TrendingUp className="h-5 w-5" />
              Topics to Strengthen ({weakTopics.length})
            </CardTitle>
            <CardDescription>
              You passed these topics, but additional review could improve your mastery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weakTopics.map((topic) => (
              <div
                key={topic.section_number}
                className="flex items-start justify-between p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                      {topic.score_percentage}%
                    </Badge>
                    <h4 className="font-semibold text-sm">
                      Module {topic.section_number}: {topic.section_title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {topic.comar_section} - {topic.topic_area}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score: {topic.questions_correct}/{topic.questions_total} questions correct
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReviewModule(topic.section_number)}
                  className="ml-4"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mastered Topics */}
      {passedTopics.length > 0 && (
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              Mastered Topics ({passedTopics.filter(t => t.score_percentage === 100).length})
            </CardTitle>
            <CardDescription>
              You demonstrated excellent knowledge in these areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {passedTopics
                .filter(t => t.score_percentage === 100)
                .map((topic) => (
                  <div
                    key={topic.section_number}
                    className="flex items-center gap-2 p-3 rounded-lg border border-green-500/20 bg-green-500/5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        Module {topic.section_number}: {topic.section_title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {topic.comar_section}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 flex-shrink-0">
                      100%
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Blueprint Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Exam Blueprint Overview
          </CardTitle>
          <CardDescription>
            The final exam consists of 36 questions (2 per topic) covering all 18 COMAR sections.
            Each topic must be mastered at 80% or higher to demonstrate competency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                {passedTopics.filter(t => t.score_percentage === 100).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Perfect Scores</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                {weakTopics.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">To Strengthen</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-2xl font-bold text-red-600 dark:text-red-500">
                {failedTopics.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Need Review</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!overallPassed ? (
            <>
              <Alert>
                <AlertDescription>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Review the topics marked for remediation above</li>
                    <li>Complete the module quizzes for weak areas</li>
                    <li>Retake the final exam when ready</li>
                    <li>Achieve 80% or higher on all topics to earn certification</li>
                  </ol>
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => navigate('/course')} 
                className="w-full"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Return to Course Modules
              </Button>
            </>
          ) : (
            <>
              <Alert className="border-green-500/50 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  You have successfully demonstrated competency in all required topics.
                  Your certificate is ready for viewing and download.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
