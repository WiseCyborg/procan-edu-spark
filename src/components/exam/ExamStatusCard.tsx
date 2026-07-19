import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Award, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExamAttempts } from '@/hooks/useExamAttempts';

export const ExamStatusCard: React.FC = () => {
  const navigate = useNavigate();
  const {
    attempts,
    attemptsLoading,
    stats,
    canRetakeNow,
    timeUntilRetakeFormatted,
    passingRate
  } = useExamAttempts();

  if (attemptsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Final Exam Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading exam status...</div>
        </CardContent>
      </Card>
    );
  }

  // No attempts yet
  if (!attempts || attempts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Final Exam
          </CardTitle>
          <CardDescription>
            Complete all modules to take the final certification exam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => navigate('/exam')} 
            className="w-full"
          >
            Start Final Exam
          </Button>
        </CardContent>
      </Card>
    );
  }

  const latestAttempt = attempts[0];
  const hasPassed = attempts.some(a => a.is_passed);
  // total_score and stats.*_score are stored as overall percentage (0–100).
  const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n || 0)));
  const latestScore = clampPct(latestAttempt.total_score);


  return (
    <Card className={hasPassed ? "border-green-500/30" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Final Exam Status
        </CardTitle>
        <CardDescription>
          {hasPassed 
            ? "Congratulations! You've passed the certification exam" 
            : `${attempts.length} attempt${attempts.length > 1 ? 's' : ''} completed`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest Attempt Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Latest Score</span>
            <Badge variant={latestAttempt.is_passed ? "default" : "destructive"}>
              {latestScore}%
            </Badge>
          </div>
          <Progress value={latestScore} className="h-2" />
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted">
              <div className="text-lg font-bold">{stats.total_attempts}</div>
              <div className="text-xs text-muted-foreground">Attempts</div>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-lg font-bold text-green-600">{passingRate}%</div>
              <div className="text-xs text-muted-foreground">Pass Rate</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-lg font-bold text-blue-600">
                {clampPct(stats.best_score)}%
              </div>

              <div className="text-xs text-muted-foreground">Best</div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {hasPassed ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 text-sm text-green-700 dark:text-green-400">
              <strong>Certified!</strong> View your certificate
            </div>
          </div>
        ) : !canRetakeNow && timeUntilRetakeFormatted ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1 text-sm text-yellow-700 dark:text-yellow-400">
              Next attempt in <strong>{timeUntilRetakeFormatted}</strong>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1 text-sm text-blue-700 dark:text-blue-400">
              Ready to retake the exam
            </div>
          </div>
        )}

        {/* Improvement Indicator */}
        {stats && stats.total_attempts >= 2 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress Trend:</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="font-medium">
                {clampPct(stats.average_score)}% avg
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {hasPassed ? (
            <Button 
              onClick={() => navigate('/certificates')} 
              className="flex-1"
            >
              View Certificate
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/final-exam')} 
              disabled={!canRetakeNow}
              className="flex-1"
            >
              {canRetakeNow ? 'Retake Exam' : 'Cooldown Active'}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => navigate('/final-exam')}
            className="flex-1"
          >
            View History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
