import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Shield, Award, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UniversalCourseCard, CourseInfo } from '@/components/courses/UniversalCourseCard';
import { Button } from '@/components/ui/button';
import { Seo } from '@/components/Seo';
import { GHOST_COURSE_IDS_PG_LIST } from '@/lib/ghostCourses';


const AllCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            id, 
            title, 
            description, 
            module_count, 
            completion_badge_name, 
            target_audience, 
            course_type, 
            prerequisite_required,
            is_public
          `)
          .eq('is_active', true)
          .not('id', 'in', GHOST_COURSE_IDS_PG_LIST)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setCourses(data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const professionalCourses = courses.filter(c => c.course_type === 'professional');
  const managerCourses = courses.filter(c => c.course_type === 'manager');
  const specialtyCourses = courses.filter(c => c.course_type === 'specialty');
  const consumerCourses = courses.filter(c => c.course_type === 'consumer');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Cannabis Education Courses | ProCann Edu"
        description="Browse Maryland Responsible Vendor Training and advanced cannabis education programs. State-aligned, certificate-issuing courses for dispensary staff and consumers."
        path="/courses"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <GraduationCap className="h-4 w-4" />
            ProCann Education
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            All Courses
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive cannabis education from regulatory compliance to advanced expertise.
            All courses issue a verifiable certificate upon completion.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Required Compliance Training */}
        {professionalCourses.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Required Compliance Training</h2>
                <p className="text-muted-foreground">Maryland RVT certification for dispensary employees</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {professionalCourses.map((course) => (
                <UniversalCourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Manager Training */}
        {managerCourses.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Manager Training</h2>
                <p className="text-muted-foreground">Advanced compliance for supervisors and managers</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {managerCourses.map((course) => (
                <UniversalCourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Specialty Certifications */}
        {specialtyCourses.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Advanced Certifications</h2>
                <p className="text-muted-foreground">Specialty training for cannabis connoisseurs</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialtyCourses.map((course) => (
                <UniversalCourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Free Consumer Education */}
        {consumerCourses.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Free Consumer Education</h2>
                <p className="text-muted-foreground">No account required • Open to the public</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {consumerCourses.map((course) => (
                <UniversalCourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Certificate Verification CTA */}
        <section className="text-center py-12 border-t">
          <h3 className="text-xl font-semibold mb-2">Verify a Certificate</h3>
          <p className="text-muted-foreground mb-4">
            Have a certificate code? Verify its authenticity here.
          </p>
          <Button variant="outline" onClick={() => navigate('/verify')}>
            Verify Certificate
          </Button>
        </section>
      </div>
    </div>
  );
};

export default AllCourses;
