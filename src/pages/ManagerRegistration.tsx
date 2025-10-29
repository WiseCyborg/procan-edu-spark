import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function ManagerRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'invalid' | 'expired' | 'used'>('validating');
  
  const [applicationData, setApplicationData] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setValidationStatus('invalid');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('dispensary_applications')
        .select('*')
        .eq('registration_token', token)
        .eq('application_status', 'approved')
        .single();

      if (error || !data) {
        setValidationStatus('invalid');
        return;
      }

      // Check if already used
      if (data.registration_completed) {
        setValidationStatus('used');
        return;
      }

      // Check if expired
      if (new Date(data.registration_token_expires_at) < new Date()) {
        setValidationStatus('expired');
        return;
      }

      setApplicationData(data);
      setEmail(data.contact_email);
      setValidationStatus('valid');
    } catch (error) {
      console.error('Token validation error:', error);
      setValidationStatus('invalid');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: applicationData.contact_person.split(' ')[0],
            last_name: applicationData.contact_person.split(' ').slice(1).join(' '),
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Update application as completed
      const { error: updateError } = await supabase
        .from('dispensary_applications')
        .update({ registration_completed: true })
        .eq('id', applicationData.id);

      if (updateError) {
        console.error('Failed to mark registration as completed:', updateError);
      }

      toast({
        title: "Registration Successful! 🎉",
        description: "Let's set up your team now!",
        duration: 3000,
      });

      // Redirect to onboarding wizard after 1.5 seconds
      setTimeout(() => {
        navigate('/onboarding/setup-team?first_login=true');
      }, 1500);

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Validating registration link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              <CardTitle>Invalid Registration Link</CardTitle>
            </div>
            <CardDescription>
              This registration link is not valid. Please contact support or request a new approval email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/org/apply')} className="w-full">
              Submit New Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              <CardTitle>Registration Link Expired</CardTitle>
            </div>
            <CardDescription>
              This registration link has expired (valid for 7 days). Please contact support to receive a new registration link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>📧 Email: support@procannedu.com</p>
              <p>📞 Phone: 1-800-PROCANN</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationStatus === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>Already Registered</CardTitle>
            </div>
            <CardDescription>
              This registration link has already been used. You can sign in with your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth?mode=login')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
          <CardDescription>
            Create your dispensary manager account for <strong>{applicationData?.organization_name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This email is linked to your approved application
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
              />
            </div>

            <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
              <p className="font-semibold">Organization Details:</p>
              <p>📋 <strong>Name:</strong> {applicationData?.organization_name}</p>
              <p>👤 <strong>Contact:</strong> {applicationData?.contact_person}</p>
              <p>📍 <strong>License:</strong> {applicationData?.license_number || 'Pending'}</p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
