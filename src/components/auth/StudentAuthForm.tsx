import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { employeeRegistrationSchema } from '@/lib/validation-schemas';
import { sanitizeFormData } from '@/lib/sanitization';
import { PhoneInput } from '@/components/ui/phone-input';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';
import type { z } from 'zod';

type FormData = z.infer<typeof employeeRegistrationSchema>;

const StudentAuthForm = () => {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  const prefilledCode = searchParams.get('code');
  const forceRegister = searchParams.get('register') === 'true';
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(forceRegister || !!invitationToken);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(employeeRegistrationSchema),
    mode: 'onBlur'
  });

  const regPassword = watch('password');

  useEffect(() => {
    // Handle invite token
    if (invitationToken) {
      setIsLoadingInvitation(true);
      setIsRegistering(true);
      invokePublicFunction('accept-invitation', { token: invitationToken, action: 'validate' })
        .then(({ data }) => {
          if (data?.success) {
            setInvitationData(data.invitation);
            setValue('email', data.invitation.email);
            setValue('joinCode', data.invitation.accessKey || '');
          }
        })
        .finally(() => setIsLoadingInvitation(false));
    }
    // Handle prefilled join code from URL
    else if (prefilledCode) {
      setValue('joinCode', prefilledCode);
      setIsRegistering(true);
    }
  }, [invitationToken, prefilledCode, setValue]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = '/student-dashboard';
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    const sanitizedData = sanitizeFormData(data);
    try {
      const { data: result, error } = await invokePublicFunction('register-with-seat-allocation', {
        ...sanitizedData,
        organizationId: invitationData?.organizationId,
        organizationName: invitationData?.organizationName,
        invitationToken: invitationData ? invitationToken : undefined
      });
      if (error || result?.error) throw new Error(result?.error || 'Registration failed');
      toast({ title: "Account Created!", description: "Redirecting..." });
      setTimeout(() => window.location.href = '/onboarding/profile', 2000);
    } catch (error: any) {
      toast({ title: "Registration Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoadingInvitation) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isRegistering ? 'Create Your Account' : 'Employee Login'}</CardTitle>
        </CardHeader>
        <CardContent>
          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging in...</> : 'Login'}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setIsRegistering(true)}>Need an account? Register</Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div><Label>First Name *</Label><Input {...register('firstName')} />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
              </div>
              <div><Label>Last Name *</Label><Input {...register('lastName')} />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
              </div>
              <div><Label>Email *</Label><Input type="email" {...register('email')} disabled={!!invitationData} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div><Label>Phone *</Label><PhoneInput {...register('phone')} />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              {!invitationData && (
                <div><Label>Join Code *</Label><Input {...register('joinCode')} placeholder="XXXXXXXX" className="uppercase" maxLength={8} />
                  {errors.joinCode && <p className="text-sm text-destructive">{errors.joinCode.message}</p>}
                </div>
              )}
              <div><Label>Password *</Label>
                <div className="relative">
                  <Input type={showRegPassword ? 'text' : 'password'} {...register('password')} />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowRegPassword(!showRegPassword)}>
                    {showRegPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                <PasswordStrengthIndicator password={regPassword || ''} showRequirements={false} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registering...</> : 'Register'}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setIsRegistering(false)}>Have an account? Login</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAuthForm;
