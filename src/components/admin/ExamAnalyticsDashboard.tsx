import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Users,
  Target,
  Brain,
  BookOpen,
  Award,
  Clock
} from 'lucide-react';
import { useExamAnalytics } from '@/hooks/useExamAnalytics';
import { format } from 'date-fns';
import { AIContentOptimizer } from './AIContentOptimizer';
import { ROICalculator } from './ROICalculator';
import { ImpactTimeline } from './ImpactTimeline';

const getDifficultyColor = (level: string) => {
  switch (level) {
    case 'easy':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30';
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
    case 'hard':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30';
    case 'very_hard':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
    default:
      return 'bg-muted';
  }
};

const getDifficultyIcon = (level: string) => {
  switch (level) {
    case 'easy':
      return '😊';
    case 'medium':
      return '🤔';
    case 'hard':
      return '😰';
    case 'very_hard':
      return '🔥';
    default:
      return '📊';
  }
};

export const ExamAnalyticsDashboard: React.FC = () => {
  const {
    overview,
    topicAnalytics,
    difficultyAnalysis,
    strugglingSections,
    monthlyTrends,
    isLoading,
    error
  } = useExamAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load exam analytics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Exam Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive insights into exam performance and student struggles
        </p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.total_attempts}</div>
              <p className="text-xs text-muted-foreground">
                {overview.unique_test_takers} unique students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.overall_pass_rate}%</div>
              <Progress value={overview.overall_pass_rate} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {overview.passed_attempts} passed / {overview.failed_attempts} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((overview.average_score / 36) * 100)}%
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Pass: {Math.round((overview.average_passing_score / 36) * 100)}%
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  Fail: {Math.round((overview.average_failing_score / 36) * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {format(new Date(overview.most_recent_attempt_date), 'MMM d, yyyy')}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Since {format(new Date(overview.first_attempt_date), 'MMM d, yyyy')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="topics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="topics">Topic Performance</TabsTrigger>
          <TabsTrigger value="difficulty">Difficulty Analysis</TabsTrigger>
          <TabsTrigger value="struggling">Struggling Sections</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="optimizer">AI Optimizer</TabsTrigger>
          <TabsTrigger value="roi">ROI Calculator</TabsTrigger>
        </TabsList>

        {/* Topic Performance Tab */}
        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Performance by Topic
              </CardTitle>
              <CardDescription>
                Detailed breakdown of student performance across all 18 exam topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topicAnalytics?.map((topic) => (
                  <div
                    key={topic.section_number}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            Section {topic.section_number}
                          </Badge>
                          <h4 className="font-semibold text-sm">
                            {topic.section_title}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {topic.comar_section} - {topic.topic_area}
                        </p>
                        
                        {/* Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Attempts:</span>
                            <span className="font-medium ml-1">{topic.total_attempts}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pass Rate:</span>
                            <span className={`font-bold ml-1 ${
                              topic.pass_rate >= 80 ? 'text-green-600' : 
                              topic.pass_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {topic.pass_rate}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Score:</span>
                            <span className="font-medium ml-1">{topic.average_score}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Need Help:</span>
                            <span className="font-medium ml-1 text-orange-600">
                              {topic.remediation_required_count}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Pass Rate Visual */}
                      <div className="text-right min-w-[80px]">
                        <div className="text-2xl font-bold mb-1">
                          {topic.pass_rate}%
                        </div>
                        <Progress 
                          value={topic.pass_rate} 
                          className="h-2 w-20"
                        />
                      </div>
                    </div>
                    
                    {/* Score Distribution */}
                    <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
                      <span>Min: {topic.min_score}%</span>
                      <span>Median: {Math.round(topic.median_score)}%</span>
                      <span>Max: {topic.max_score}%</span>
                      <span>Std Dev: {Math.round(topic.score_std_dev)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Difficulty Analysis Tab */}
        <TabsContent value="difficulty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Question Difficulty Analysis
              </CardTitle>
              <CardDescription>
                Topics ranked by difficulty based on student performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {difficultyAnalysis?.map((section) => (
                  <div
                    key={section.section_number}
                    className={`p-4 rounded-lg border ${getDifficultyColor(section.difficulty_level)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{getDifficultyIcon(section.difficulty_level)}</span>
                          <div>
                            <h4 className="font-semibold text-sm">
                              {section.section_title}
                            </h4>
                            <p className="text-xs opacity-80">{section.comar_section}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge className={getDifficultyColor(section.difficulty_level)}>
                          {section.difficulty_level.toUpperCase()}
                        </Badge>
                        <div className="text-sm font-medium mt-1">
                          {section.average_performance}% avg
                        </div>
                        <div className="text-xs opacity-80">
                          {section.failure_rate}% fail rate
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Performance</span>
                        <span>{section.sample_size} attempts</span>
                      </div>
                      <Progress value={section.average_performance} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Struggling Sections Tab */}
        <TabsContent value="struggling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Sections Where Students Struggle Most
              </CardTitle>
              <CardDescription>
                Topics with highest failure rates requiring content optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strugglingSections && strugglingSections.length > 0 ? (
                <div className="space-y-3">
                  {strugglingSections.map((section, index) => (
                    <div
                      key={section.section_number}
                      className="p-4 rounded-lg border border-red-500/20 bg-red-500/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-600 font-bold text-sm">
                          #{index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Section {section.section_number}
                            </Badge>
                            <h4 className="font-semibold text-sm">
                              {section.section_title}
                            </h4>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-3">
                            {section.comar_section} - {section.topic_area}
                          </p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-2 rounded bg-red-500/10">
                              <div className="text-xs text-muted-foreground">Struggle Rate</div>
                              <div className="text-lg font-bold text-red-600">
                                {section.struggle_rate}%
                              </div>
                            </div>
                            
                            <div className="p-2 rounded bg-orange-500/10">
                              <div className="text-xs text-muted-foreground">Students</div>
                              <div className="text-lg font-bold text-orange-600">
                                {section.students_struggling}
                              </div>
                            </div>
                            
                            <div className="p-2 rounded bg-yellow-500/10">
                              <div className="text-xs text-muted-foreground">Avg Score</div>
                              <div className="text-lg font-bold text-yellow-600">
                                {section.average_score}%
                              </div>
                            </div>
                            
                            <div className="p-2 rounded bg-muted">
                              <div className="text-xs text-muted-foreground">Total</div>
                              <div className="text-lg font-bold">
                                {section.total_attempts}
                              </div>
                            </div>
                          </div>
                          
                          <Alert className="mt-3 border-orange-500/50 bg-orange-500/10">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-xs text-orange-700 dark:text-orange-400">
                              <strong>Recommendation:</strong> Review and optimize training content for this topic. 
                              Consider adding more examples, practice questions, or clearer explanations.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Great news! No sections show significant struggling patterns. Students are performing well across all topics.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Performance Trends
              </CardTitle>
              <CardDescription>
                Track exam performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monthlyTrends?.map((trend) => (
                  <div
                    key={trend.month}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium min-w-[100px]">
                        {format(new Date(trend.month), 'MMM yyyy')}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">{trend.total_attempts} attempts</Badge>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                          {trend.passed} passed
                        </Badge>
                        <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400">
                          {trend.failed} failed
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{trend.avg_score}%</div>
                        <div className="text-xs text-muted-foreground">avg score</div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-lg font-bold">{trend.pass_rate}%</div>
                        <Progress value={trend.pass_rate} className="h-2 w-20 mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Optimizer Tab */}
        <TabsContent value="optimizer">
          <AIContentOptimizer />
        </TabsContent>

        {/* ROI Calculator Tab */}
        <TabsContent value="roi" className="space-y-6">
          <ROICalculator />
          <ImpactTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
};
