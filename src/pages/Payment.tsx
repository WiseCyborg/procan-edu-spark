import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CreditCard, Users, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApplicationData {
  id: string;
  organization_name: string;
  contact_person: string;
  contact_email: string;
  estimated_employees: number | null;
  requested_credits: number | null;
  payment_status: string | null;
  application_status: string;
}

const PRICE_PER_SEAT = 49;

const Payment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams<{ applicationId?: string }>();
  // Accept both /payment/:applicationId (from approval email links) and /payment?application_id=...
  const applicationId = params.applicationId || searchParams.get('application_id');
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) {
      setError('No application ID provided. Please use the link from your approval email.');
      setLoading(false);
      return;
    }

    fetchApplication();
  }, [applicationId]);

  const fetchApplication = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('dispensary_applications')
        .select('id, organization_name, contact_person, contact_email, estimated_employees, requested_credits, payment_status, application_status')
        .eq('id', applicationId)
        .single();

      if (fetchError || !data) {
        setError('Application not found. Please check your link or contact support.');
        setLoading(false);
        return;
      }

      if (data.application_status !== 'approved') {
        setError('This application has not been approved yet. Please wait for admin approval.');
        setLoading(false);
        return;
      }

      if (data.payment_status === 'paid' || data.payment_status === 'completed') {
        // Already paid - redirect to registration
        toast.success('Payment already completed!', {
          description: 'Redirecting to registration...'
        });
        setTimeout(() => {
          navigate('/auth?role=dispensary_manager&tab=accesskey');
        }, 2000);
        return;
      }

      setApplication(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching application:', err);
      setError('Failed to load application details. Please try again.');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!application) return;

    setProcessing(true);
    try {
      const credits = application.estimated_employees || application.requested_credits || 10;
      const totalAmount = credits * PRICE_PER_SEAT;

      const { data, error: paymentError } = await supabase.functions.invoke('create-dispensary-payment-paypal', {
        body: {
          application_id: application.id,
          credits,
          amount: totalAmount,
          organization_name: application.organization_name,
          contact_email: application.contact_email
        }
      });

      if (paymentError || !data?.approvalUrl) {
        throw new Error(paymentError?.message || 'Failed to create payment session');
      }

      // Store payment info for return
      sessionStorage.setItem('pending_payment', JSON.stringify({
        application_id: application.id,
        credits,
        amount: totalAmount
      }));

      // Redirect to PayPal
      window.location.href = data.approvalUrl;
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error('Payment Failed', {
        description: err.message || 'Unable to process payment. Please try again.'
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Payment Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                Go Home
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!application) return null;

  const credits = application.estimated_employees || application.requested_credits || 10;
  const totalAmount = credits * PRICE_PER_SEAT;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Application Approved!</h1>
          <p className="text-muted-foreground mt-2">
            Complete payment to activate your organization's training program
          </p>
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {application.organization_name}
            </CardTitle>
            <CardDescription>
              Contact: {application.contact_person} ({application.contact_email})
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Training Seats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Number of Seats</span>
              <span className="font-semibold">{credits}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Price per Seat</span>
              <span className="font-semibold">${PRICE_PER_SEAT}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-primary/5 rounded-lg px-3">
              <span className="font-semibold text-lg">Total</span>
              <span className="font-bold text-2xl text-primary">${totalAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* What's Included */}
        <Card>
          <CardHeader>
            <CardTitle>What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{credits} employee training seats for Maryland Cannabis Compliance</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Full 23-module curriculum with COMAR compliance certification</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Manager dashboard for tracking employee progress</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Printable certificates for each certified employee</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>1 year of access from activation</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment} 
          disabled={processing}
          size="lg"
          className="w-full h-14 text-lg"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              Pay ${totalAmount.toLocaleString()} with PayPal
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Secure payment processed by PayPal. You'll be redirected to complete payment.
        </p>
      </div>
    </div>
  );
};

export default Payment;
