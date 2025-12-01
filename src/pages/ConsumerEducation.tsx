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
                Start with whichever course fits your needs. All courses are completely free 
                and you'll earn a certificate upon completion.
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              onClick={() => navigate('/course')}
              variant="outline"
              size="lg"
            >
              View RVT Certification
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Static Educational Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-12">
            {/* First Dispensary Visit Timeline */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-foreground text-center">
                Your First Dispensary Visit
              </h2>
              <p className="text-center text-muted-foreground max-w-2xl mx-auto">
                Here's what to expect when you visit a Maryland cannabis dispensary for the first time.
              </p>
              
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-6 border rounded-lg space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                  <h3 className="font-semibold">Bring Your ID</h3>
                  <p className="text-sm text-muted-foreground">
                    Valid Maryland medical cannabis card and government-issued ID required for entry.
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                  <h3 className="font-semibold">Check-In Process</h3>
                  <p className="text-sm text-muted-foreground">
                    Staff will verify your credentials and answer any questions you have.
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                  <h3 className="font-semibold">Browse Products</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore flower, edibles, concentrates, and more. Staff can provide guidance.
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
                  <h3 className="font-semibold">Complete Purchase</h3>
                  <p className="text-sm text-muted-foreground">
                    Pay for your selection and receive detailed product information and dosage guidance.
                  </p>
                </div>
              </div>
            </div>

            {/* Maryland Cannabis Laws Quick Reference */}
            <div className="space-y-6 bg-muted/30 p-8 rounded-lg">
              <h2 className="text-2xl font-bold text-foreground">
                Maryland Cannabis Laws: Quick Reference
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Legal Purchase Limits
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                    <li>• Up to 120 grams (4.2 oz) of flower per 30 days</li>
                    <li>• Product limits vary by type and THC content</li>
                    <li>• Dispensary staff track your allotment automatically</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Where You Can Use
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                    <li>• Private residences only (with owner permission)</li>
                    <li>• NOT in vehicles, public places, or federal property</li>
                    <li>• NOT in workplaces (unless employer permits)</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Transportation Rules
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                    <li>• Keep products in original sealed containers</li>
                    <li>• Store in trunk or locked glove compartment</li>
                    <li>• Never consume while driving</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Valid Medical Card Required
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                    <li>• Must have active Maryland MMCC registration</li>
                    <li>• Card expires annually, requires renewal</li>
                    <li>• Out-of-state cards not accepted</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Product Types Guide */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground text-center">
                Understanding Cannabis Product Types
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 border rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">🌿 Flower</h3>
                  <p className="text-sm text-muted-foreground">
                    The traditional cannabis bud. Smoked or vaporized. Effects felt within minutes, lasting 1-3 hours.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Best for: Experienced users seeking quick relief
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">🍫 Edibles</h3>
                  <p className="text-sm text-muted-foreground">
                    Food products infused with cannabis. Effects take 30-90 minutes to start, lasting 4-8 hours.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Best for: Long-lasting relief, discreet use
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">💧 Tinctures</h3>
                  <p className="text-sm text-muted-foreground">
                    Liquid extracts taken under tongue. Effects in 15-45 minutes, lasting 2-4 hours.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Best for: Precise dosing, fast onset
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">🔬 Concentrates</h3>
                  <p className="text-sm text-muted-foreground">
                    High-potency extracts (wax, shatter, oil). Very strong effects, quick onset.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Best for: Experienced users needing high potency
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">🧴 Topicals</h3>
                  <p className="text-sm text-muted-foreground">
                    Creams, balms, lotions applied to skin. No psychoactive effects, localized relief.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Best for: Pain relief without intoxication
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">💊 Capsules</h3>
                  <p className="text-sm text-muted-foreground">
                    Pre-measured doses in pill form. Effects similar to edibles, very discreet.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Best for: Consistent dosing, travel-friendly
                  </p>
                </div>
              </div>
            </div>

            {/* Responsible Consumption */}
            <div className="space-y-6 bg-yellow-50 dark:bg-yellow-950/20 p-8 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h2 className="text-2xl font-bold text-foreground">
                Responsible Consumption Tips
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Start Low, Go Slow</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Begin with the lowest recommended dose, especially with edibles. Wait at least 2 hours before consuming more.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Know Your Product</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Understand THC and CBD content. Higher THC doesn't always mean better - find what works for your needs.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Store Safely</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Keep all cannabis products locked away from children and pets in original child-resistant packaging.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Don't Drive Impaired</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Never drive after consuming cannabis. Arrange alternative transportation if you plan to use.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ConsumerEducation;
