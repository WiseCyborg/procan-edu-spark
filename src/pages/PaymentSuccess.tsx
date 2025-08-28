import React, { useEffect } from 'react';
import { CheckCircle, Award, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const verifyPayment = async () => {
      const token = searchParams.get('token');
      const PayerID = searchParams.get('PayerID');
      const courseId = searchParams.get('course_id');
      const applicationId = searchParams.get('application_id');

      if (token && PayerID) {
        try {
          if (courseId) {
            // Verify course payment
            const { data, error } = await supabase.functions.invoke('verify-payment-paypal', {
              body: { orderId: token }
            });

            if (error) throw error;

            if (data?.paid) {
              toast({
                title: "Payment Verified!",
                description: "Your course access has been activated.",
              });
            }
          } else if (applicationId) {
            // Verify dispensary payment
            const { data, error } = await supabase.functions.invoke('verify-dispensary-payment-paypal', {
              body: { orderId: token }
            });

            if (error) throw error;

            if (data?.paid) {
              toast({
                title: "Payment Verified!",
                description: `Your organization has been set up with ${data.credits} training credits.`,
              });
            }
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          toast({
            title: "Payment Verification Failed",
            description: "Please contact support if you continue to see this message.",
            variant: "destructive"
          });
        }
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>
          <CardTitle className="text-3xl text-green-700">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-600">
            <p className="text-lg mb-4">
              Thank you for your purchase! You now have full access to your course.
            </p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center">
              <Award className="h-5 w-5 mr-2" />
              What happens next?
            </h3>
            <ul className="text-green-700 space-y-2">
              <li>• Start learning immediately with full course access</li>
              <li>• Complete all 18 modules at your own pace</li>
              <li>• Take the final certification exam when ready</li>
              <li>• Receive your official Maryland Cannabis certificate</li>
            </ul>
          </div>

          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => navigate('/course')}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Start Learning
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              size="lg"
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>A confirmation email has been sent to your registered email address.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;