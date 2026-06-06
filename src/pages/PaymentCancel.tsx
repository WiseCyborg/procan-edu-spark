// Issue 1001 — Cancel landing page. No account created; retry without re-registering.
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, RotateCcw, Mail } from 'lucide-react';

const PaymentCancel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get('application_id');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-orange-500 mx-auto mb-2" />
          <CardTitle>Payment Cancelled</CardTitle>
          <CardDescription>
            No charge was made and your application is still approved. You can complete payment whenever you're ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {applicationId && (
            <Button
              onClick={() => navigate(`/payment/${applicationId}`)}
              className="w-full"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Retry payment
            </Button>
          )}
          <Button
            onClick={() => (window.location.href = 'mailto:support@procannedu.com?subject=Payment%20help')}
            variant="outline"
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" /> Contact support
          </Button>
          <Button onClick={() => navigate('/')} variant="ghost" className="w-full">
            Back to home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;
