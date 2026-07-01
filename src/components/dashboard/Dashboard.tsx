import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationAccess } from '@/hooks/useOrganizationAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { useContinueTraining } from '@/hooks/useContinueTraining';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Clock, CheckCircle, FileText, Lock, Building2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { NextActionBanner } from '@/components/guidance/NextActionBanner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AccessPipelineHealth } from '@/components/debug/AccessPipelineHealth';
import { GHOST_COURSE_IDS_PG_LIST } from '@/lib/ghostCourses';

// RVT Course ID - requires org access
const RVT_COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

interface Course {
  id: string;
  title: string;
  description: string;
  module_count: number;
  is_public?: boolean;
}

interface UserProgress {
  course_id: string;
  completed_modules: number;
  total_score: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isDispensaryManager } = useUserRole();
  const { hasAccess: hasOrgAccess, isLoading: orgAccessLoading } = useOrganizationAccess(user?.id);
  const { continueTraining, continueUrl, ctaLabel, rvtProgress, isLoading: trainingLoading } = useContinueTraining();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Dynamically get actual module count as fallback
  const getActualModuleCount = async (courseId: string): Promise<number> => {
    const { count } = await supabase
      .from('course_modules')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('is_active', true);
    return count || 24; // Fallback to 24 if query fails
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .not('id', 'in', GHOST_COURSE_IDS_PG_LIST);

      if (coursesError) throw coursesError;
      
      // Dynamically verify module count for each course
      if (coursesData) {
        const coursesWithActualCount = await Promise.all(
          coursesData.map(async (course) => {
            const actualCount = await getActualModuleCount(course.id);
            return {
              ...course,
              module_count: actualCount // Use actual count from course_modules
            };
          })
        );
        setCourses(coursesWithActualCount);
      }

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('course_id, module_id')
        .eq('user_id', user.id)
        .eq('is_completed', true);

      if (progressError) throw progressError;

      // Group progress by course
      const progressByCourse = progressData?.reduce((acc, item) => {
        if (!acc[item.course_id]) {
          acc[item.course_id] = 0;
        }
        acc[item.course_id]++;
        return acc;
      }, {} as Record<string, number>) || {};

      const progressArray = Object.entries(progressByCourse).map(([courseId, count]) => ({
        course_id: courseId,
        completed_modules: count,
        total_score: 0
      }));

      setProgress(progressArray);

      // Fetch certificates
      const { data: certificatesData, error: certificatesError } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_revoked', false);

      if (certificatesError) throw certificatesError;
      setCertificates(certificatesData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCourseProgress = (courseId: string) => {
    const courseProgress = progress.find(p => p.course_id === courseId);
    const course = courses.find(c => c.id === courseId);
    if (!courseProgress || !course) return 0;
    return Math.round((courseProgress.completed_modules / course.module_count) * 100);
  };

  const isCourseCompleted = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    const courseProgress = progress.find(p => p.course_id === courseId);
    if (!course || !courseProgress) return false;
    return courseProgress.completed_modules >= course.module_count;
  };

  const hasCertificate = (courseId: string) => {
    return certificates.some(cert => cert.course_id === courseId);
  };

  // Check if user can access a specific course
  const canAccessCourse = (courseId: string): boolean => {
    // Admins and managers always have access
    if (isAdmin || isDispensaryManager) return true;
    // RVT course requires org access
    if (courseId === RVT_COURSE_ID) return hasOrgAccess;
    // Other courses - check if public or user has paid
    return true; // Default to allowing access for non-RVT courses
  };

  if (loading || orgAccessLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-700 mb-6">Learning Dashboard</h1>
      
      {/* DEV-only: Access Pipeline Health Monitor */}
      <div className="mb-6">
        <AccessPipelineHealth courseId={RVT_COURSE_ID} />
      </div>
      
      {/* Role-aware next action guidance */}
      <NextActionBanner className="mb-6" />
      
      <ProfileCompletionBanner />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Available</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses in Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.filter(p => !isCourseCompleted(p.course_id)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates Earned</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
          onClick={() => navigate('/training-handbook')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Handbook</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">View Resource →</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <h2 className="text-2xl font-semibold">Available Courses</h2>
        
        {courses.map((course) => {
          const progressPercent = getCourseProgress(course.id);
          const completed = isCourseCompleted(course.id);
          const certified = hasCertificate(course.id);
          const hasAccess = canAccessCourse(course.id);

          return (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {course.title}
                      {completed && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {certified && <Award className="h-5 w-5 text-yellow-600" />}
                    </CardTitle>
                    <p className="text-gray-600 mt-2">{course.description}</p>
                    
                    {/* Enhanced course information */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        4-6 hours
                      </span>
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                        MCA Compliant
                      </span>
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                        Certificate Included
                      </span>
                    </div>
                  </div>
                  
                  {/* Conditionally render button based on access */}
                  {hasAccess ? (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Use resume-aware navigation for RVT course
                        if (course.id === RVT_COURSE_ID) {
                          continueTraining();
                        } else {
                          navigate('/course');
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 relative z-10 pointer-events-auto"
                    >
                      {course.id === RVT_COURSE_ID && progressPercent > 0 ? ctaLabel : (progressPercent > 0 ? 'Continue' : 'Start Course')}
                    </Button>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 relative z-10 pointer-events-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/course');
                            }}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Employer Access Required
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Contact your training coordinator to get access</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-sm text-gray-500">
                    {course.module_count} modules • {progressPercent === 100 ? 'Completed' : 'In Progress'}
                  </p>
                  
                  {/* Access gate message for locked courses */}
                  {!hasAccess && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Employer Access Required
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Ask your training coordinator to assign you a seat, or purchase individual access.
                      </p>
                    </div>
                  )}
                  
                  {/* Learning path guidance - only show if has access */}
                  {hasAccess && progressPercent === 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">
                        Getting Started
                      </h4>
                      <p className="text-xs text-blue-700">
                        Complete your profile first, then begin with Module 1: Cannabis Fundamentals
                      </p>
                    </div>
                  )}
                  
                  {hasAccess && progressPercent > 0 && progressPercent < 100 && (
                    <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                      <h4 className="text-sm font-medium text-orange-800 mb-1">
                        Keep Going!
                      </h4>
                      <p className="text-xs text-orange-700">
                        You're {progressPercent}% complete. Next: Continue where you left off
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
