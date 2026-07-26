import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, BookOpen, Award, ShoppingCart, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Seo } from '@/components/Seo';
import { toast } from 'sonner';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  module_count: number | null;
  course_type: string | null;
  price_cents: number | null;
  currency: string | null;
  payment_required: boolean | null;
  completion_badge_name: string | null;
  target_audience: string | null;
}

const formatPrice = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasEntitlement, setHasEntitlement] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!courseId) return;
      setIsLoading(true);
      setError(null);

      const { data, error: courseError } = await supabase
        .from('courses')
        .select(
          'id, title, description, module_count, course_type, price_cents, currency, payment_required, completion_badge_name, target_audience'
        )
        .eq('id', courseId)
        .eq('is_active', true)
        .maybeSingle();

      if (cancelled) return;

      if (courseError) {
        console.error('[CourseDetailPage] fetch error', courseError);
        setError('We could not load this course. Please try again.');
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('Course not found.');
        setIsLoading(false);
        return;
      }

      setCourse(data as CourseRow);

      if (user) {
        const { data: ent } = await supabase
          .from('course_entitlements')
          .select('id, status, expires_at')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!cancelled) {
          const active = !!ent && (!ent.expires_at || new Date(ent.expires_at) > new Date());
          setHasEntitlement(active);
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, user]);

  const handlePurchase = async () => {
    if (!user) {
      navigate(`/auth?next=/courses/${courseId}`);
      return;
    }
    setIsPurchasing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-course-payment-paypal', {
        body: { courseId },
      });
      if (fnError) throw fnError;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      console.error('[CourseDetailPage] purchase error', err);
      toast.error('Unable to start checkout. Please try again.');
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">{error ?? 'Course not found.'}</h1>
        <Button variant="outline" asChild>
          <Link to="/courses">Back to all courses</Link>
        </Button>
      </div>
    );
  }

  const priceCents = course.price_cents ?? 0;
  const currency = course.currency ?? 'usd';
  const requiresPayment = !!course.payment_required && priceCents > 0;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${course.title} | ProCann Edu`}
        description={course.description?.slice(0, 155) ?? 'Advanced cannabis certification from ProCann Edu.'}
        path={`/courses/${course.id}`}
      />

      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate('/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          All Courses
        </Button>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {course.course_type === 'specialty' && <Badge variant="secondary">Advanced Certification</Badge>}
          {course.target_audience && <Badge variant="outline">{course.target_audience}</Badge>}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
        {course.description && (
          <p className="text-muted-foreground text-lg mb-8">{course.description}</p>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Course details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{course.module_count ?? 0} modules</span>
            </div>
            {course.completion_badge_name && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span>Earn the {course.completion_badge_name} credential</span>
              </div>
            )}
            {requiresPayment && (
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl font-bold text-foreground">{formatPrice(priceCents, currency)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {hasEntitlement ? (
          <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate(`/courses/${course.id}/learn`)}>
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Continue Course
          </Button>
        ) : requiresPayment ? (
          <Button size="lg" className="w-full sm:w-auto" onClick={handlePurchase} disabled={isPurchasing}>
            {isPurchasing ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-5 w-5 mr-2" />
            )}
            {isPurchasing ? 'Redirecting…' : `Purchase — ${formatPrice(priceCents, currency)}`}
          </Button>
        ) : (
          <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate(`/courses/${course.id}/learn`)}>
            Start Course
          </Button>
        )}

        {requiresPayment && !hasEntitlement && (
          <p className="text-xs text-muted-foreground mt-3">Secure checkout powered by PayPal.</p>
        )}
      </div>
    </div>
  );
};

export default CourseDetailPage;
