import React, { useEffect, useState } from 'react';
import { CheckCircle, Award, ArrowRight, Mail, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import Confetti from 'react-confetti';

interface SeatPurchaseData {
  quantity: number;
  joinCode: string;
  organizationName: string;
}

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showConfetti, setShowConfetti] = useState(false);
  const [seatPurchaseData, setSeatPurchaseData] = useState<SeatPurchaseData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      const token = searchParams.get('token');
      const PayerID = searchParams.get('PayerID');
      const courseId = searchParams.get('course_id');
      const purchaseId = searchParams.get('purchase_id');

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
          } else if (purchaseId) {
            // Verify seat purchase payment
            const { data, error } = await supabase.functions.invoke('verify-dispensary-payment-paypal', {
              body: { orderId: token }
            });

            if (error) throw error;

            if (data?.paid) {
              // Show confetti for seat purchases
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 5000);

              // Fetch seat purchase details
              const { data: purchase, error: purchaseError } = await supabase
                .from('rvt_purchases')
                .select('quantity, organization_id')
                .eq('id', purchaseId)
                .maybeSingle();

              if (!purchaseError && purchase) {
                // Get organization name
                const { data: orgData } = await supabase
                  .from('organizations')
                  .select('name')
                  .eq('id', purchase.organization_id)
                  .maybeSingle();

                // Get join code
                const { data: joinCodeData } = await supabase
                  .from('rvt_join_codes' as any)
                  .select('code')
                  .eq('organization_id', purchase.organization_id)
                  .eq('is_active', true)
                  .maybeSingle();

                setSeatPurchaseData({
                  quantity: purchase.quantity,
                  joinCode: (joinCodeData as any)?.code || '',
                  organizationName: orgData?.name || ''
                });
              }

              toast({
                title: "Payment Verified!",
                description: `${data.credits || purchase?.quantity} training seats activated!`,
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

  const handleCopyCode = () => {
    if (seatPurchaseData?.joinCode) {
      navigator.clipboard.writeText(seatPurchaseData.joinCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Join code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Seat purchase success view
  if (seatPurchaseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        {showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
          />
        )}
        <Card className="max-w-2xl w-full">
          <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-20 w-20" />
            </div>
            <CardTitle className="text-3xl text-center">
              🎉 {seatPurchaseData.quantity} Training Seats Activated!
            </CardTitle>
            <p className="text-center text-green-50 mt-2">
              Your organization is ready to train employees
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Join Code Display */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-300">
              <h3 className="font-bold text-xl mb-3 text-center text-blue-900">
                Your Organization Join Code
              </h3>
              <div className="bg-white p-6 rounded-lg border-2 border-blue-400 mb-3">
                <div className="flex items-center justify-between">
                  <code className="text-3xl font-mono font-bold text-blue-600 tracking-wider">
                    {seatPurchaseData.joinCode}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="ml-4"
                  >
                    {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Share this code with employees to enroll in training
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => navigate('/team-management?tab=invitations')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="mr-2 h-5 w-5" />
                Invite Employees
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => navigate('/team-management?tab=seats')}
              >
                <Users className="mr-2 h-5 w-5" />
                Manage Seats
              </Button>
            </div>

            {/* What's Next */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                <Award className="h-5 w-5 mr-2" />
                What's Next?
              </h3>
              <ul className="text-green-700 space-y-2 text-sm">
                <li>• Send email invitations to your team members</li>
                <li>• Or share the join code for quick enrollment</li>
                <li>• Track employee progress in the Team Dashboard</li>
                <li>• Employees complete 18 modules + certification exam</li>
              </ul>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>A confirmation email has been sent to your registered email address.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Course purchase success view (default)
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