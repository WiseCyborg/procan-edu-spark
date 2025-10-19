import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Key, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const StudentAuthForm = () => {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    email: string;
    organizationId: string;
    organizationName: string;
    role: string;
    inviterName: string;
    accessKey: string;
  } | null>(null);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dispensaryKey, setDispensaryKey] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Load invitation data if token is present
  useEffect(() => {
    if (invitationToken) {
      loadInvitationData();
    }
  }, [invitationToken]);

  const loadInvitationData = async () => {
    setIsLoadingInvitation(true);
    setIsRegistering(true); // Auto-switch to registration mode
    
    try {
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { token: invitationToken, action: 'validate' }
      });

      if (error) throw error;

      if (data.success) {
        setInvitationData(data.invitation);
        setRegEmail(data.invitation.email);
        setDispensaryKey(data.invitation.accessKey || '');
        toast({
          title: "Invitation loaded!",
          description: `Welcome! You've been invited to join ${data.invitation.organizationName}`,
        });
      } else {
        toast({
          title: "Invalid invitation",
          description: data.message || 'This invitation link is invalid or has expired.',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      toast({
        title: "Error",
        description: 'Failed to load invitation. Please try the link again.',
        variant: "destructive",
      });
    } finally {
      setIsLoadingInvitation(false);
    }
  };

  const validateDispensaryKey = async (key: string): Promise<boolean> => {
    if (!key) return false;
    
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, course_credits, admin_approved')
        .eq('unique_access_key', key)
        .eq('payment_status', 'paid')
        .eq('admin_approved', true)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      if (data.course_credits <= 0) {
        toast({
          title: "No Credits Available",
          description: "Your dispensary has no remaining training credits. Please contact your dispensary manager.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Key validation error:', error);
      return false;
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Success",
        description: "Successfully signed in! Redirecting to your training...",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First validate the dispensary key (unless coming from invitation)
      if (!invitationData) {
        const isValidKey = await validateDispensaryKey(dispensaryKey);
        if (!isValidKey) {
          toast({
            title: "Invalid Access Key",
            description: "Please check your dispensary access key and try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Get organization details for credit deduction
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, course_credits')
        .eq('unique_access_key', dispensaryKey)
        .eq('payment_status', 'paid')
        .eq('admin_approved', true)
        .single();

      if (orgError || !orgData) {
        throw new Error('Invalid dispensary access key');
      }

      // Create the user account
      const { data: authData, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/welcome`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            dispensary_access_key: dispensaryKey,
            organization_id: orgData.id
          }
        }
      });

      // If user creation successful, assign student role and update profile
      if (!error && authData.user) {
        try {
          // Insert user role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: 'student'
            });

          if (roleError) {
            console.error('Error assigning user role:', roleError);
          }

          // Update profile with organization link
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              organization_id: orgData.id,
              dispensary_access_key: dispensaryKey,
              phone: phone
            })
            .eq('user_id', authData.user.id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
          }

          // Get default course (RVT-MD)
          const { data: courseData } = await supabase
            .from('courses')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();

          // Create enrollment with 30-day deadline
          if (courseData) {
            const deadlineDate = new Date();
            deadlineDate.setDate(deadlineDate.getDate() + 30);
            
            const { error: enrollmentError } = await supabase
              .from('rvt_enrollments' as any)
              .insert({
                user_id: authData.user.id,
                organization_id: orgData.id,
                course_id: courseData.id,
                deadline_at: deadlineDate.toISOString(),
              });

            if (enrollmentError) {
              console.error('Error creating enrollment:', enrollmentError);
            }
          }

          // If from invitation, mark it as accepted
          if (invitationToken && invitationData) {
            const { error: acceptError } = await supabase.functions.invoke('accept-invitation', {
              body: { 
                token: invitationToken, 
                action: 'accept',
                userId: authData.user.id
              }
            });

            if (acceptError) {
              console.error('Error accepting invitation:', acceptError);
            }
          }
        } catch (assignmentError) {
          console.error('Error in post-registration setup:', assignmentError);
        }
      }

      // If user creation successful, deduct a credit
      if (!error && authData.user) {
        try {
          const { error: creditError } = await supabase
            .from('organizations')
            .update({ 
              course_credits: Math.max(0, orgData.course_credits - 1) 
            })
            .eq('id', orgData.id);

          if (creditError) {
            console.error('Error deducting credit:', creditError);
          }
        } catch (creditError) {
          console.error('Error deducting credit:', creditError);
        }
      }

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: invitationData ? `Welcome to ${invitationData.organizationName}!` : "Registration successful!",
          description: "Check your email for a confirmation link to complete your registration.",
        });
        
        // Clear form
        setFirstName('');
        setLastName('');
        setPhone('');
        setDispensaryKey('');
        setRegEmail('');
        setRegPassword('');
        setIsRegistering(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Loading your invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-blue-700">
              {invitationData ? `Join ${invitationData.organizationName}` : 'Student Portal'}
            </CardTitle>
          </div>
          <p className="text-muted-foreground">
            {invitationData 
              ? `You've been invited by ${invitationData.inviterName} to complete your training`
              : 'Cannabis training for employees'
            }
          </p>
        </CardHeader>
        <CardContent>
          {!isRegistering ? (
            <>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Employee Access</h3>
                </div>
                <p className="text-sm text-blue-700">
                  Sign in with credentials provided by your dispensary manager.
                </p>
              </div>

              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Don't have an account?
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setIsRegistering(true)}
                  className="w-full"
                >
                  Register with Access Key
                </Button>
              </div>
            </>
          ) : (
            <>
              {invitationData && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-800">
                    <strong>Invitation Details:</strong>
                    <br />
                    Email: {invitationData.email}
                    <br />
                    Organization: {invitationData.organizationName}
                  </AlertDescription>
                </Alert>
              )}

              {!invitationData && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <h3 className="font-semibold text-amber-800 mb-2">Employee Registration</h3>
                  <p className="text-sm text-amber-700">
                    You need a valid dispensary access key from your employer to register.
                  </p>
                </div>
              )}

              <form onSubmit={handleStudentRegistration} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="First Name *"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus={!!invitationData}
                  />
                  <Input
                    placeholder="Last Name *"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email *"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    disabled={!!invitationData}
                    className={invitationData ? 'bg-gray-100' : ''}
                  />
                  {invitationData && (
                    <p className="text-xs text-gray-500 mt-1">
                      <Mail className="inline h-3 w-3 mr-1" />
                      Pre-filled from your invitation
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                {!invitationData && (
                  <div>
                    <Input
                      placeholder="Dispensary Access Key *"
                      value={dispensaryKey}
                      onChange={(e) => setDispensaryKey(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 <strong>Tip:</strong> Ask your manager to send you an email invitation for faster setup!
                    </p>
                  </div>
                )}
                <div>
                  <Input
                    type="password"
                    placeholder="Password *"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {invitationData ? 'Accepting Invitation...' : 'Creating Account...'}
                    </>
                  ) : (
                    invitationData ? 'Accept Invitation & Create Account' : 'Register Account'
                  )}
                </Button>

                {!invitationData && (
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setIsRegistering(false)}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                )}
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAuthForm;
