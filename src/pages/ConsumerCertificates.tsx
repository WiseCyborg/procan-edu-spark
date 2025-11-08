import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useGuestSession } from '@/hooks/useGuestSession';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  title: string;
  completion_badge_name: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  completed_at: string;
  email?: string;
  metadata?: any;
}

const ConsumerCertificates = () => {
  const { user } = useAuth();
  const { sessionId, email: guestEmail } = useGuestSession();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course');
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        let query = supabase
          .from('consumer_enrollments')
          .select('id, course_id, completed_at, email, metadata')
          .not('completed_at', 'is', null);

        // Filter by user or session
        if (user?.id) {
          query = query.eq('user_id', user.id);
        } else if (sessionId) {
          query = query.eq('session_id', sessionId);
        }

        const { data: enrollmentData, error: enrollmentError } = await query as any;

        if (enrollmentError) throw enrollmentError;

        setEnrollments(enrollmentData || []);

        // Fetch course details
        if (enrollmentData && enrollmentData.length > 0) {
          const courseIds = [...new Set(enrollmentData.map((e: Enrollment) => e.course_id))] as string[];
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('id, title, completion_badge_name')
            .in('id', courseIds);

          if (courseError) throw courseError;

          const courseMap: Record<string, Course> = {};
          courseData?.forEach((course: Course) => {
            courseMap[course.id] = course;
          });
          setCourses(courseMap);
        }
      } catch (error) {
        console.error('Error fetching certificates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, [user?.id, sessionId]);

  const handleDownload = (enrollmentId: string, courseName: string) => {
    // TODO: Implement PDF download
    console.log('Download certificate:', enrollmentId);
  };

  const handleShare = (enrollmentId: string, courseName: string) => {
    // TODO: Implement social sharing
    console.log('Share certificate:', enrollmentId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Award className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">No Certificates Yet</h1>
          <p className="text-muted-foreground">
            Complete a consumer education course to earn your first certificate!
          </p>
          <Button onClick={() => window.location.href = '/consumer-education'}>
            Browse Free Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Your Certificates</h1>
          <p className="text-muted-foreground">
            Congratulations on completing your cannabis education!
          </p>
        </div>

        <div className="grid gap-6">
          {enrollments.map((enrollment) => {
            const course = courses[enrollment.course_id];
            if (!course) return null;

            const completedDate = new Date(enrollment.completed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            const userName = enrollment.metadata?.name || 'Cannabis Consumer';

            return (
              <Card key={enrollment.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                        <Award className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{course.completion_badge_name}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {course.title}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Recipient:</span>
                      <p className="font-medium text-foreground">{userName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>
                      <p className="font-medium text-foreground">{completedDate}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleDownload(enrollment.id, course.title)}
                      variant="default"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      onClick={() => handleShare(enrollment.id, course.title)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>

                  {enrollment.email && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Certificate also sent to {enrollment.email}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-8">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/consumer-education'}
          >
            Explore More Courses
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsumerCertificates;
