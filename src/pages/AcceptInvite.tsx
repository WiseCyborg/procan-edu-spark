import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'not-logged-in' | 'accepting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [role, setRole] = useState('');
  const [enrollmentInfo, setEnrollmentInfo] = useState<{ enrolled: boolean; message: string } | null>(null);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (authLoading) return;
    
    if (!token) {
      setStatus('error');
      setMessage('No invitation token provided. Please check your invite link.');
      return;
    }

    if (!user) {
      setStatus('not-logged-in');
      return;
    }

    // User is logged in, accept the invite
    acceptInvite();
  }, [token, user, authLoading]);

  const acceptInvite = async () => {
    setStatus('accepting');
    
    try {
      // First try the edge function approach
      const { data, error } = await supabase.functions.invoke('accept-org-invite', {
        body: { token }
      });

      if (error) {
        // Check if it's an auth/session error - might need to use RPC fallback
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to accept invitation');
      }

      if (!data.success) {
        // Handle specific error codes gracefully
        if (data.error === 'EMAIL_MISMATCH') {
          setStatus('error');
          setMessage(`This invitation was sent to a different email. Please sign in with the correct email address.`);
          return;
        }
        throw new Error(data.message || 'Failed to accept invitation');
      }

      setOrganizationName(data.data.organization_name || 'the organization');
      setRole(data.data.role?.replace(/_/g, ' ') || 'member');
      setMessage(data.data.message);
      setEnrollmentInfo(data.data.enrollment || null);
      setStatus('success');
      
      toast({
        title: "Welcome! 🎉",
        description: data.data.enrollment?.enrolled 
          ? `You've joined ${data.data.organization_name} and are enrolled in training!`
          : `You've joined ${data.data.organization_name} as ${data.data.role?.replace(/_/g, ' ')}.`,
      });

    } catch (err: any) {
      console.error('Accept invite error:', err);
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred');
    }
  };

  const handleLoginRedirect = () => {
    // Store the return URL so we can come back after login
    const returnUrl = `/accept-invite?token=${token}`;
    navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {status === 'not-logged-in' && 'Accept Invitation'}
            {status === 'accepting' && 'Accepting Invitation...'}
            {status === 'success' && 'Welcome to the Team!'}
            {status === 'error' && 'Invitation Error'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {status === 'not-logged-in' && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please log in or create an account to accept this invitation.
                </AlertDescription>
              </Alert>
              
              <p className="text-center text-muted-foreground">
                You've been invited to join an organization. Sign in with the email address 
                the invitation was sent to.
              </p>
              
              <Button onClick={handleLoginRedirect} className="w-full" size="lg">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Accept
              </Button>
            </>
          )}
          
          {status === 'accepting' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Processing your invitation...</p>
            </div>
          )}
          
          {status === 'success' && (
            <>
              <div className="text-center py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">
                  You've joined <span className="text-primary">{organizationName}</span>
                </p>
                <p className="text-muted-foreground">
                  Your role: <span className="font-medium capitalize">{role}</span>
                </p>
              </div>

              {/* Enrollment Status */}
              {enrollmentInfo && (
                <Alert className={enrollmentInfo.enrolled ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                  <AlertCircle className={`h-4 w-4 ${enrollmentInfo.enrolled ? 'text-green-600' : 'text-yellow-600'}`} />
                  <AlertDescription className={enrollmentInfo.enrolled ? 'text-green-800' : 'text-yellow-800'}>
                    {enrollmentInfo.enrolled 
                      ? "✅ You're enrolled in Responsible Vendor Training! Click below to start."
                      : enrollmentInfo.message || "Training enrollment pending - contact your admin."}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button onClick={handleGoToDashboard} className="w-full" size="lg">
                {enrollmentInfo?.enrolled ? 'Start Training' : 'Go to Dashboard'}
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  The invitation may have expired or already been used.
                </p>
                
                <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                  Go to Home
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
