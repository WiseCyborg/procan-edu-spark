import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Award,
  Target,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ExamAttempt, ExamStats } from '@/hooks/useExamAttempts';

interface ExamAttemptHistoryProps {
  attempts: ExamAttempt[];
  stats: ExamStats | null;
  timeUntilRetakeFormatted: string | null;
  canRetakeNow: boolean;
}

export const ExamAttemptHistory: React.FC<ExamAttemptHistoryProps> = ({
  attempts,
  stats,
  timeUntilRetakeFormatted,
  canRetakeNow
}) => {
  if (!attempts || attempts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exam Attempt History
          </CardTitle>
          <CardDescription>
            No exam attempts recorded yet. Take your first exam when ready!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const calculateTrend = () => {
    if (attempts.length < 2) return null;
    
    const sortedAttempts = [...attempts].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const recentAttempts = sortedAttempts.slice(-3);
    if (recentAttempts.length < 2) return null;
    
    const firstScore = recentAttempts[0].total_score;
    const lastScore = recentAttempts[recentAttempts.length - 1].total_score;
    
    return lastScore - firstScore;
  };

  const trend = calculateTrend();
  // total_score and stats.*_score are stored as overall percentage (0–100).
  const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n || 0)));


  return (
    <div className="space-y-6">
      {/* Cooldown Alert */}
      {!canRetakeNow && timeUntilRetakeFormatted && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            You must wait <strong>{timeUntilRetakeFormatted}</strong> before retaking the exam.
            Use this time to review your weak topics and strengthen your knowledge.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overall Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{stats.total_attempts}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Attempts</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                  {stats.passed_attempts}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Passed</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                  {clampPct(stats.best_score)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Best Score</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-500">
                  {clampPct(stats.average_score)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Avg Score</div>
              </div>
            </div>

            {/* Trend Indicator */}
            {trend !== null && (
              <div className="mt-4 p-3 rounded-lg border flex items-center justify-center gap-2">
                {trend > 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-500">
                      Improving! +{trend} points from early attempts
                    </span>
                  </>
                ) : trend < 0 ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-500">
                      {trend} points from early attempts - Review materials
                    </span>
                  </>
                ) : (
                  <>
                    <Target className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                      Consistent performance
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attempt History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attempt History ({attempts.length})
          </CardTitle>
          <CardDescription>
            Your exam attempts ordered from most recent to oldest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attempts.map((attempt, index) => {
              const percentage = clampPct(attempt.total_score);

              const passed = attempt.is_passed;
              const isLatest = index === 0;
              
              return (
                <div
                  key={attempt.id}
                  className={`p-4 rounded-lg border ${
                    passed
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  } ${isLatest ? 'ring-2 ring-primary/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {passed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold">
                          Attempt #{attempts.length - index}
                        </span>
                        {isLatest && (
                          <Badge variant="secondary" className="text-xs">
                            Latest
                          </Badge>
                        )}
                        {passed && (
                          <Badge variant="default" className="text-xs bg-green-500">
                            <Award className="h-3 w-3 mr-1" />
                            Passed
                          </Badge>
                        )}
                      </div>

                      {/* Score Details */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className={`font-bold text-lg ${
                          passed ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                        }`}>
                          {percentage}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {Math.floor(attempt.time_taken / 60)}m {attempt.time_taken % 60}s
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Topic Performance Summary */}
                      {attempt.topic_scores && Array.isArray(attempt.topic_scores) && (
                        <div className="pt-2">
                          <div className="text-xs text-muted-foreground mb-2">
                            Topic Performance:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {attempt.topic_scores
                              .filter((ts: any) => ts.needs_remediation)
                              .slice(0, 5)
                              .map((ts: any, idx: number) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className="text-xs bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                                >
                                  {ts.section_title}: {ts.score_percentage}%
                                </Badge>
                              ))}
                            {attempt.topic_scores.filter((ts: any) => ts.needs_remediation).length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{attempt.topic_scores.filter((ts: any) => ts.needs_remediation).length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Progress Chart Placeholder */}
      {attempts.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score Progress Over Time
            </CardTitle>
            <CardDescription>
              Visual representation of your improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
              <div className="text-center space-y-2">
                <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Score progression chart
                </p>
                <div className="flex gap-2 items-center justify-center text-xs">
                  {attempts
                    .slice(0, 5)
                    .reverse()
                    .map((attempt, idx) => {
                      const percentage = Math.round((attempt.total_score / totalQuestions) * 100);
                      return (
                        <div key={idx} className="text-center">
                          <div 
                            className={`w-8 rounded-t ${
                              attempt.is_passed ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ height: `${percentage}px` }}
                          />
                          <div className="text-xs mt-1">{percentage}%</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
