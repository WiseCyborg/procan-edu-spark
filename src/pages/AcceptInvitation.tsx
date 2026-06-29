import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      toast.error('Invalid invitation link');
      navigate('/auth');
      return;
    }
    validateToken(token);
  }, []);

  const validateToken = async (token: string) => {
    try {
      console.log('[AcceptInvitation] Validating invitation token');
      const { data, error } = await invokePublicFunction('validate-invitation', {
        token
      });
      console.log('[AcceptInvitation] Validation response:', { data, error });

      if (error || !data?.valid) {
        toast.error(data?.message || 'Invalid or expired invitation');
        navigate('/auth');
        return;
      }

      setInvitationData(data.invitation);
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate invitation');
      navigate('/auth');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      // Proactive guard: if email already has an account, route to existing-user flow
      const { data: existsData } = await invokePublicFunction<{ exists: boolean }>(
        'check-email-exists',
        { email: invitationData.email }
      );
      if (existsData?.exists) {
        toast.info('You already have an account with this email. Please sign in to accept this invitation.');
        navigate(`/accept-invite?token=${searchParams.get('token')}`);
        return;
      }

      // Create account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password,
        options: {
          data: {
            organization_id: invitationData.organization_id,
          },
        },
      });

      if (authError) throw authError;

      // Update profile with organization and phone
      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ 
            organization_id: invitationData.organization_id,
            phone: phoneNumber || null
          })
          .eq('user_id', authData.user.id);

        // Initialize journey state with profile_incomplete stage
        await supabase
          .from('user_journey_state')
          .insert({
            user_id: authData.user.id,
            current_stage: 'profile_incomplete',
            last_page_visited: '/accept-invitation'
          });

        // Mark invitation as accepted
        await supabase
          .from('staff_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('email', invitationData.email)
          .eq('invitation_token', searchParams.get('token'));
      }

      toast.success('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        toast.info('You already have an account with this email. Please sign in to accept this invitation.');
        navigate(`/accept-invite?token=${searchParams.get('token')}`);
        return;
      }
      toast.error(error.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              This invitation link is no longer valid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-center">Welcome to ProCann Edu!</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join {invitationData.organization_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={invitationData.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Organization</Label>
              <Input
                value={invitationData.organization_name}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              <PasswordStrengthIndicator password={password} showRequirements />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account & Join Organization'
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
};

export default AcceptInvitation;
