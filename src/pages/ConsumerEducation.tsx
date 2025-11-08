import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Award, GraduationCap, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ConsumerCourseCard } from '@/components/consumer/ConsumerCourseCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConsumerCourse {
  id: string;
  title: string;
  description: string;
  module_count: number;
  completion_badge_name: string;
  target_audience: string;
}

const ConsumerEducation = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<ConsumerCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, module_count, completion_badge_name, target_audience')
          .eq('is_public', true)
          .eq('course_type', 'consumer')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setCourses(data || []);
      } catch (error) {
        console.error('Error fetching consumer courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <GraduationCap className="h-4 w-4" />
              Free Cannabis Education
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Ready for Your First Dispensary Visit?
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              100% free, professional cannabis education for Maryland consumers. 
              Learn at your own pace, no account required.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                No Account Required
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                No Payment
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Get Certified
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Self-Paced</h3>
              <p className="text-sm text-muted-foreground">Learn on your schedule</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">45-90 Minutes</h3>
              <p className="text-sm text-muted-foreground">Quick, focused lessons</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Get Certified</h3>
              <p className="text-sm text-muted-foreground">Earn digital badges</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Maryland-Specific</h3>
              <p className="text-sm text-muted-foreground">Local laws & info</p>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Choose Your Free Course
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Start with whichever course fits your needs. Both are completely free 
                and you'll earn a certificate upon completion.
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <ConsumerCourseCard key={course.id} course={course} />
                ))}
              </div>
            )}

            {!isLoading && courses.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">
                  Consumer courses are being prepared. Check back soon!
                </p>
                <Button onClick={() => navigate('/')}>
                  Return Home
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold text-foreground">
              Looking for Professional Training?
            </h2>
            <p className="text-muted-foreground">
              If you work at a dispensary or training facility, check out our 
              professional Responsible Vendor Training (RVT) certification.
            </p>
            <Button 
              onClick={() => navigate('/courses')}
              variant="outline"
              size="lg"
            >
              View RVT Certification
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ConsumerEducation;
