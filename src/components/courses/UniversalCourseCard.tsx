import { Clock, BookOpen, Award, ArrowRight, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCourseLaunchTarget } from '@/hooks/useCourseLaunchTarget';
import { useLaunchCourse } from '@/hooks/useLaunchCourse';
import { cn } from '@/lib/utils';

export interface CourseInfo {
  id: string;
  title: string;
  description: string | null;
  module_count: number | null;
  completion_badge_name: string | null;
  target_audience: string | null;
  course_type: string | null;
  prerequisite_required: boolean | null;
  is_public: boolean | null;
}

interface UniversalCourseCardProps {
  course: CourseInfo;
  className?: string;
  showPrerequisiteHint?: boolean;
}

export const UniversalCourseCard = ({ 
  course, 
  className,
  showPrerequisiteHint = true 
}: UniversalCourseCardProps) => {
  const { data: launchTarget, isLoading } = useCourseLaunchTarget(course.id);
  const { launchCourse, getCtaLabel } = useLaunchCourse();

  // Estimate time based on module count (assume ~6 minutes per module)
  const estimatedMinutes = (course.module_count || 0) * 6;
  const estimatedTime = estimatedMinutes < 60 
    ? `${estimatedMinutes} mins` 
    : `${Math.round(estimatedMinutes / 10) * 10} mins`;

  const isLocked = launchTarget && !launchTarget.can_access && launchTarget.deny_reason === 'prerequisite_required';
  const isComingSoon = launchTarget && !launchTarget.can_access && launchTarget.deny_reason === 'course_not_published';
  const hasCertificate = launchTarget?.has_certificate;

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      );
    }

    if (isLocked) {
      return (
        <>
          <Lock className="mr-2 h-4 w-4" />
          Complete RVT First
        </>
      );
    }

    if (isComingSoon) {
      return 'Coming Soon';
    }

    if (hasCertificate) {
      return (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          View Certificate
        </>
      );
    }

    return (
      <>
        {getCtaLabel(launchTarget?.cta_label || 'start')}
        <ArrowRight className="ml-2 h-4 w-4" />
      </>
    );
  };

  const getCourseTypeBadge = () => {
    switch (course.course_type) {
      case 'professional':
        return <Badge variant="default" className="bg-primary">Required</Badge>;
      case 'manager':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Manager</Badge>;
      case 'specialty':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Advanced</Badge>;
      case 'consumer':
        return <Badge variant="outline">Free</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={cn(
      "flex flex-col h-full transition-all duration-200",
      isLocked ? "opacity-75 border-muted" : "hover:shadow-lg hover:border-primary/20",
      hasCertificate && "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20",
      className
    )}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {getCourseTypeBadge()}
              {hasCertificate && (
                <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{course.title}</CardTitle>
            <CardDescription className="text-sm line-clamp-2">
              {course.description}
            </CardDescription>
          </div>
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
            isLocked ? "bg-muted" : "bg-primary/10"
          )}>
            {isLocked ? (
              <Lock className="h-6 w-6 text-muted-foreground" />
            ) : hasCertificate ? (
              <Award className="h-6 w-6 text-green-600" />
            ) : (
              <BookOpen className="h-6 w-6 text-primary" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {course.module_count && course.module_count > 0 && (
            <>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{estimatedTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{course.module_count} lessons</span>
              </div>
            </>
          )}
        </div>

        {course.completion_badge_name && (
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Earn: <span className="font-medium text-foreground">{course.completion_badge_name}</span>
            </span>
          </div>
        )}

        {course.target_audience && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">For:</span> {course.target_audience}
          </p>
        )}

        {isLocked && showPrerequisiteHint && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Complete Maryland RVT Training first to unlock this course.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-4">
        <Button 
          onClick={() => launchCourse(course.id)}
          className="w-full"
          size="lg"
          variant={isLocked || isComingSoon ? "outline" : hasCertificate ? "secondary" : "default"}
          disabled={isLoading || isComingSoon}
        >
          {getButtonContent()}
        </Button>
        {course.is_public && !hasCertificate && (
          <p className="text-xs text-center text-muted-foreground">
            No account required • Earn certificate
          </p>
        )}
      </CardFooter>
    </Card>
  );
};
