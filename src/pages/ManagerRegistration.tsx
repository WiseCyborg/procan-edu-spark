import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Key, ChevronDown } from 'lucide-react';

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
  
  // Access key fallback
  const [showAccessKeyFallback, setShowAccessKeyFallback] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

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

  const handleAccessKeyLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessKey.trim()) {
      toast({
        title: "Access Key Required",
        description: "Please enter your access key from the approval email.",
        variant: "destructive"
      });
      return;
    }

    setLookupLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-access-key', {
        body: { access_key: accessKey.trim() }
      });

      if (error) throw error;

      if (!data.success) {
        if (data.error === 'ALREADY_REGISTERED') {
          toast({
            title: "Already Registered",
            description: data.message,
          });
          setTimeout(() => navigate('/auth?mode=login'), 2000);
          return;
        }
        
        throw new Error(data.error);
      }

      toast({
        title: "Access Key Valid! ✓",
        description: `Redirecting to registration for ${data.organization_name}...`,
      });

      // Redirect with the token
      setTimeout(() => {
        navigate(`/register/manager?token=${data.token}`);
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error('Access key lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: error.message || "Failed to validate access key. Please check and try again.",
        variant: "destructive"
      });
    } finally {
      setLookupLoading(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
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
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/org/apply')} className="w-full">
              Submit New Application
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Collapsible open={showAccessKeyFallback} onOpenChange={setShowAccessKeyFallback}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Use Access Key Instead
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAccessKeyFallback ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <form onSubmit={handleAccessKeyLookup} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="accessKey">Access Key</Label>
                    <Input
                      id="accessKey"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      placeholder="DISP-2025-XXXXXXXX"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in your approval email under "Access Key"
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={lookupLoading}>
                    {lookupLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Continue with Access Key'
                    )}
                  </Button>
                </form>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              <CardTitle>Registration Link Expired</CardTitle>
            </div>
            <CardDescription>
              This registration link has expired (valid for 7 days). You can use your access key to get a new link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Collapsible open={showAccessKeyFallback} onOpenChange={setShowAccessKeyFallback}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Get New Link with Access Key
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAccessKeyFallback ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <form onSubmit={handleAccessKeyLookup} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="accessKey">Access Key</Label>
                    <Input
                      id="accessKey"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      placeholder="DISP-2025-XXXXXXXX"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in your approval email under "Access Key"
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={lookupLoading}>
                    {lookupLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating New Link...
                      </>
                    ) : (
                      'Generate New Registration Link'
                    )}
                  </Button>
                </form>
              </CollapsibleContent>
            </Collapsible>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or contact support</span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground text-center">
              <p>📧 support@procannedu.com</p>
              <p>📞 1-800-PROCANN</p>
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
