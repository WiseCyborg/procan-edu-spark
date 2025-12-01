import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function ConsumerCoursesSection() {
  const [isPopulating, setIsPopulating] = useState(false);

  // Fetch consumer courses with actual module counts
  const { data: courses, isLoading, refetch } = useQuery({
    queryKey: ['consumer-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id, 
          title, 
          module_count, 
          is_active, 
          created_at,
          course_modules(count)
        `)
        .eq('course_type', 'consumer')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform to include actual module count from database
      return data?.map(course => ({
        ...course,
        actual_module_count: course.course_modules?.[0]?.count || 0
      }));
    }
  });

  const handlePopulateCourses = async () => {
    setIsPopulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('populate-consumer-courses', {
        body: {}
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Consumer courses populated successfully!', {
          description: `Created ${data.courses?.length || 0} courses with modules`
        });
        refetch();
      } else {
        toast.info(data?.message || 'Consumer courses already exist');
      }
    } catch (error) {
      console.error('Error populating consumer courses:', error);
      toast.error('Failed to populate consumer courses', {
        description: error.message
      });
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Consumer Course Management
          </CardTitle>
          <CardDescription>
            Populate and manage free consumer education courses for Maryland cannabis consumers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Current Status</h3>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading courses...</span>
              </div>
            ) : courses && courses.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">{courses.length} consumer courses exist</span>
                </div>
                <div className="grid gap-2">
                  {courses.map((course) => {
                    const isComplete = course.actual_module_count === course.module_count;
                    const hasPartialContent = course.actual_module_count > 0 && !isComplete;
                    
                    return (
                      <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {course.actual_module_count} / {course.module_count} modules created • {course.is_active ? 'Active' : 'Inactive'}
                          </p>
                          {hasPartialContent && (
                            <p className="text-xs text-yellow-600 mt-1">
                              ⚠️ Incomplete: Missing {course.module_count - course.actual_module_count} modules
                            </p>
                          )}
                          {isComplete && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Complete with all modules
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                <span>No consumer courses found</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={handlePopulateCourses} 
              disabled={isPopulating}
              size="lg"
              className="w-full"
            >
              {isPopulating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Populating Courses...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Populate Consumer Courses
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Smart sync will:
              <br />• Create missing courses with all modules
              <br />• Add missing modules to incomplete courses
              <br />• Skip courses that already have all modules
              <br /><br />
              Expected: 3 courses with 22 total modules
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
