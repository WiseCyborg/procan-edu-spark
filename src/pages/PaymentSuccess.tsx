import React, { useEffect, useState } from 'react';
import { CheckCircle, Award, ArrowRight, Mail, Users, Copy, Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Confetti from 'react-confetti';

interface SeatPurchaseData {
  quantity: number;
  joinCode: string;
  organizationName: string;
}

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [showConfetti, setShowConfetti] = useState(false);
  const [seatPurchaseData, setSeatPurchaseData] = useState<SeatPurchaseData | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Issue 1001 — new dispensary application flow: webhook provisions the account
  // and sends the manager-registration token email. Here we just poll status and
  // tell the user to check their email.
  const applicationId = searchParams.get('application_id');
  const [appPaymentReady, setAppPaymentReady] = useState<null | { organizationName: string; contactEmailMasked: string }>(null);
  const [appPolling, setAppPolling] = useState<boolean>(!!applicationId);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      while (!cancelled && attempts < 30) {
        attempts++;
        try {
          const { invokePublicFunction } = await import('@/lib/publicEdgeFunctions');
          const { data } = await invokePublicFunction<any>('get-application-payment-status', {
            application_id: applicationId,
          });
          const a = data?.application;
          if (a && (a.payment_status === 'paid' || a.payment_status === 'completed')) {
            if (!cancelled) {
              setAppPaymentReady({
                organizationName: a.organization_name,
                contactEmailMasked: a.contact_email_masked,
              });
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 4000);
              setAppPolling(false);
            }
            return;
          }
        } catch (e) {
          console.warn('payment status poll error', e);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setAppPolling(false);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

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
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 3000);
              
              toast({
                title: "Payment Verified!",
                description: "Your course access has been activated.",
              });
              
              // Redirect to course after 2 seconds
              setTimeout(() => {
                navigate(`/courses/${courseId}`);
              }, 2000);
            }
          } else if (purchaseId) {
            // P4 (2026-06-16): verify endpoint is read-only. It returns
            //   status: 'provisioned'      → webhook is done, show seats
            //   status: 'pending_webhook'  → poll again, webhook not landed yet
            // We poll up to ~30s before falling back to a "check your email" message.
            let attempts = 0;
            let provisioned = false;
            while (attempts < 15) {
              attempts++;
              const { data, error } = await supabase.functions.invoke('verify-dispensary-payment-paypal', {
                body: { orderId: token }
              });
              if (error) throw error;

              if (data?.status === 'provisioned' || (data?.paid && data?.seats_provisioned)) {
                provisioned = true;
                break;
              }
              if (data?.status === 'pending_webhook') {
                await new Promise((r) => setTimeout(r, 2000));
                continue;
              }
              // Not paid yet from PayPal's POV — stop polling.
              break;
            }

            if (provisioned) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 5000);

              const { data: purchase } = await supabase
                .from('rvt_purchases')
                .select('quantity, organization_id')
                .eq('id', purchaseId)
                .maybeSingle();

              if (purchase) {
                const { data: orgData } = await supabase
                  .from('organizations')
                  .select('name')
                  .eq('id', purchase.organization_id)
                  .maybeSingle();

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
                title: 'Payment Verified!',
                description: `${purchase?.quantity ?? ''} training seats activated!`,
              });
            } else {
              toast({
                title: 'Payment received',
                description:
                  "We'll email your receipt as soon as PayPal confirms. Your seats will appear on your dashboard shortly.",
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

  const handleSendInvitations = async () => {
    const emails = inviteEmails
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      toast({
        title: "No Emails",
        description: "Please enter at least one email address",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User information not found",
        variant: "destructive"
      });
      return;
    }

    // Get organization_id from user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      toast({
        title: "Error",
        description: "Organization not found",
        variant: "destructive"
      });
      return;
    }

    setInviteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'invite_bulk',
          organizationId: profile.organization_id,
          inviterId: user.id,
          emails,
          role: 'student'
        }
      });

      if (error) {
        console.error("Invitation error:", error);
        toast({
          title: "Partial Success",
          description: "Some invitations may have failed. You can retry from Team Management.",
        });
      } else {
        toast({
          title: "Invitations Sent!",
          description: `Successfully invited ${data.invitations_sent || emails.length} employees`,
        });
        setInviteModalOpen(false);
        setInviteEmails('');
      }
    } catch (error) {
      console.error("Invitation exception:", error);
      toast({
        title: "Error",
        description: "Failed to send invitations. You can retry from Team Management.",
        variant: "destructive"
      });
    } finally {
      setInviteLoading(false);
    }
  };

  // Issue 1001 — Dispensary application payment success (account being provisioned by webhook)
  if (applicationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        {showConfetti && (
          <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} />
        )}
        <Card className="max-w-xl w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">
              {appPaymentReady ? 'Payment Confirmed!' : 'Processing your payment…'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {appPolling && !appPaymentReady && (
              <p className="text-center text-muted-foreground text-sm">
                Waiting for PayPal to confirm your payment. This usually takes a few seconds…
              </p>
            )}
            {appPaymentReady && (
              <>
                <div className="bg-green-50 p-5 rounded-lg space-y-2">
                  <p className="font-semibold text-green-800">{appPaymentReady.organizationName}</p>
                  <p className="text-sm text-green-700">
                    We've sent your manager registration link to <span className="font-mono">{appPaymentReady.contactEmailMasked}</span>.
                  </p>
                  <p className="text-sm text-green-700">
                    Open that email and click the link to set your password and access your dashboard.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={() => navigate('/auth')} className="w-full">Go to sign-in</Button>
                  <Button onClick={() => navigate('/')} variant="outline" className="w-full">Back to home</Button>
                </div>
              </>
            )}
            {!appPolling && !appPaymentReady && (
              <div className="bg-orange-50 p-4 rounded-lg text-sm text-orange-800">
                We haven't received the payment confirmation yet. If you completed the PayPal checkout, please refresh this page in a minute or contact support.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <div className="bg-white p-4 sm:p-6 rounded-lg border-2 border-blue-400 mb-3">
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-3">
                  <code className="text-lg sm:text-3xl font-mono font-bold text-blue-600 tracking-wider break-all text-center sm:text-left">
                    {seatPurchaseData.joinCode}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="sm:ml-4 flex-shrink-0 h-11 w-11"
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
                onClick={() => setInviteModalOpen(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="mr-2 h-5 w-5" />
                Invite Employees Now
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

            {/* Invitation Modal */}
            <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Invite Your Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-emails">Employee Email Addresses</Label>
                    <Textarea
                      id="invite-emails"
                      placeholder="employee1@example.com&#10;employee2@example.com&#10;employee3@example.com"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {inviteEmails.split('\n').filter(e => e.trim() && e.includes('@')).length} valid emails
                    </p>
                  </div>

                  <Button 
                    onClick={handleSendInvitations}
                    disabled={inviteLoading}
                    className="w-full"
                    size="lg"
                  >
                    {inviteLoading ? (
                      <>
                        <Send className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Invitations
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                <li>• Employees complete 23 modules + certification exam</li>
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
              <li>• Complete all 23 modules at your own pace</li>
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