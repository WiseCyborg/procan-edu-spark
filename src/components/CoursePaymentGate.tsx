import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CreditCard, Lock, Check } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Course {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  payment_required: boolean;
}

interface CoursePaymentGateProps {
  course: Course;
  onPaymentSuccess: () => void;
}

export const CoursePaymentGate: React.FC<CoursePaymentGateProps> = ({
  course,
  onPaymentSuccess
}) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const handlePayment = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-course-payment-paypal', {
        body: { courseId: course.id }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to PayPal checkout
        window.location.href = data.url;
        
        // Start polling for payment completion
        pollForPaymentCompletion();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pollForPaymentCompletion = () => {
    const checkPayment = async () => {
      try {
        // Check if user has paid for this course
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user?.id)
          .eq('course_id', course.id)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          toast({
            title: "Payment Successful!",
            description: "You now have access to the course content.",
          });
          onPaymentSuccess();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error checking payment status:', error);
        return false;
      }
    };

    // Check immediately
    checkPayment();

    // Poll every 3 seconds for up to 5 minutes
    const interval = setInterval(async () => {
      const isComplete = await checkPayment();
      if (isComplete) {
        clearInterval(interval);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
    }, 300000);
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center p-4 md:p-6">
          <div className="flex justify-center mb-3 md:mb-4">
            <Lock className="h-12 w-12 md:h-16 md:w-16 text-blue-500" />
          </div>
          <CardTitle className="text-xl md:text-2xl text-blue-700">
            Course Payment Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
          <div className="bg-blue-50 p-4 md:p-6 rounded-lg">
            <h3 className="text-lg md:text-xl font-semibold text-blue-800 mb-2">
              {course.title}
            </h3>
            <p className="text-sm md:text-base text-blue-700 mb-4">
              {course.description}
            </p>
            <div className="text-2xl md:text-3xl font-bold text-blue-900">
              {formatPrice(course.price_cents, course.currency)}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm md:text-base text-green-800 mb-2 flex items-center">
              <Check className="h-4 w-4 md:h-5 md:w-5 mr-2 flex-shrink-0" />
              What's Included:
            </h4>
            <ul className="text-xs md:text-sm text-green-700 space-y-1">
              <li>• Complete access to all course modules</li>
              <li>• Interactive learning materials</li>
              <li>• Final certification exam</li>
              <li>• Official certificate upon completion</li>
              <li>• 24/7 online access</li>
              <li>• Maryland Cannabis Administration compliance</li>
            </ul>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={handlePayment}
              disabled={isProcessing}
              size="lg"
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 h-12 md:h-11 text-base md:text-lg"
            >
              <CreditCard className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="truncate">
                {isProcessing ? 'Processing...' : `Pay ${formatPrice(course.price_cents, course.currency)}`}
              </span>
            </Button>
          </div>

          <div className="text-center text-xs md:text-sm text-gray-500 space-y-1">
            <p>Secure payment powered by PayPal</p>
            <p>Your payment information is encrypted and secure</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};