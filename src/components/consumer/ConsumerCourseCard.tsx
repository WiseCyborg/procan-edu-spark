import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, Award, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConsumerCourse {
  id: string;
  title: string;
  description: string;
  module_count: number;
  completion_badge_name: string;
  target_audience: string;
}

interface ConsumerCourseCardProps {
  course: ConsumerCourse;
}

export const ConsumerCourseCard = ({ course }: ConsumerCourseCardProps) => {
  const navigate = useNavigate();
  
  // Estimate time based on module count (assume ~6 minutes per module)
  const estimatedMinutes = course.module_count * 6;
  const estimatedTime = estimatedMinutes < 60 
    ? `${estimatedMinutes} mins` 
    : `${Math.round(estimatedMinutes / 10) * 10} mins`;

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
            <CardDescription className="text-base">
              {course.description}
            </CardDescription>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{estimatedTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{course.module_count} lessons</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <Badge variant="secondary" className="font-normal">
            Earn: {course.completion_badge_name}
          </Badge>
        </div>

        <div className="pt-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Perfect for:</span> {course.target_audience}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button 
          onClick={() => navigate(`/consumer-education/${course.id}`)}
          className="w-full"
          size="lg"
        >
          Start Learning Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          No account required • Earn certificate
        </p>
      </CardFooter>
    </Card>
  );
};
