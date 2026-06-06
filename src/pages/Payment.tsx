// Issue 1001 — Auto-redirect to PayPal. No manual click required in the happy path.
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2, CreditCard, Building2 } from 'lucide-react';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';

type AppStatus = {
  id: string;
  organization_name: string;
  contact_person_initial: string;
  contact_email_masked: string;
  application_status: string;
  payment_status: string | null;
  quantity: number;
  price_per_seat: number;
  total_amount: number;
};

const Payment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams<{ applicationId?: string }>();
  const applicationId = params.applicationId || searchParams.get('application_id');

  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<AppStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [retryable, setRetryable] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    if (!applicationId) {
      setError('No application ID provided. Please use the link from your approval email.');
      setLoading(false);
      return;
    }
    void load();
  }, [applicationId]);

  const load = async () => {
    setLoading(true);
    const { data, error: fnError } = await invokePublicFunction<{ success: boolean; application?: AppStatus; error_code?: string }>(
      'get-application-payment-status',
      { application_id: applicationId }
    );
    if (fnError || !data?.success || !data.application) {
      if (data?.error_code === 'NOT_FOUND') {
        setError("We couldn't find that application. Double-check the link from your approval email.");
      } else {
        setError('Unable to load your application. Please try again or contact support.');
      }
      setLoading(false);
      return;
    }
    const a = data.application;
    setApp(a);
    setLoading(false);

    if (a.application_status !== 'approved' && a.application_status !== 'completed') {
      setError('This application has not been approved yet. Please wait for admin approval.');
      return;
    }
    if (a.payment_status === 'paid' || a.payment_status === 'completed') {
      // Already paid — go to success page (which polls + routes to /auth)
      navigate(`/payment-success?application_id=${a.id}`, { replace: true });
      return;
    }
    // Auto-trigger payment
    void startPayment();
  };

  const startPayment = async () => {
    if (triggered.current) return;
    triggered.current = true;
    setRedirecting(true);
    setError(null);
    const { data, error: fnError } = await invokePublicFunction<{ success: boolean; url?: string; error?: string; error_code?: string; already_paid?: boolean }>(
      'create-dispensary-payment-paypal',
      { application_id: applicationId }
    );
    if (fnError || !data?.success || !data.url) {
      if (data?.already_paid) {
        navigate(`/payment-success?application_id=${applicationId}`, { replace: true });
        return;
      }
      setError(data?.error || fnError?.message || 'Unable to start payment. Please try again.');
      setRedirecting(false);
      setRetryable(true);
      triggered.current = false;
      return;
    }
    window.location.href = data.url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your application…</p>
        </div>
      </div>
    );
  }

  if (error && !retryable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Payment Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Application Approved</h1>
          <p className="text-muted-foreground mt-1">
            Completing your secure PayPal checkout…
          </p>
        </div>

        {app && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" /> {app.organization_name}
              </CardTitle>
              <CardDescription>{app.contact_email_masked}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-medium">{app.quantity}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price / seat</span><span className="font-medium">${app.price_per_seat}</span></div>
              <div className="flex justify-between pt-2 border-t"><span className="font-semibold">Total</span><span className="font-bold text-primary text-lg">${app.total_amount.toLocaleString()}</span></div>
            </CardContent>
          </Card>
        )}

        {redirecting && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Redirecting you to PayPal…
          </div>
        )}

        {error && retryable && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={startPayment} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" /> Retry payment
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Secure payment processed by PayPal. You'll be redirected automatically.
        </p>
      </div>
    </div>
  );
};

export default Payment;
